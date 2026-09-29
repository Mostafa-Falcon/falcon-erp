/**
 * 🦅 Falcon ERP - Document Number Service
 *
 * ONE numbering source per org, split by connectivity:
 *
 * ONLINE -> the server mints the authoritative number from the org
 *   `document_sequences` counter via `falcon_next_document_number`
 *   (atomic row-locked, collision-free across ALL devices).
 * OFFLINE -> a TEMPORARY unique number is minted locally:
 *   `<PREFIX>-P<deviceHash>-<seq>` (cashier shifts use a negative
 *   sentinel). On reconnect, `falcon_reassign_offline_document_numbers`
 *   renumbers these in `created_at` order to the authoritative
 *   sequence, and the local rows are overwritten by the pull.
 *
 * Temp format contracts (must match the server reconcile matchers):
 * sales invoice INV-P<dev>-###### (server LIKE 'INV-P%')
 * sales return RET-P<dev>-###### (server LIKE 'RET-P%')
 * purchase invoice PUR-P<dev>-###### (server LIKE 'PUR-P%')
 * purchase return PRET-P<dev>-###### (server LIKE 'PRET-P%')
 * journal entry ENTR-<year>-P<dev>-#### (server LIKE 'ENTR-%-P%')
 * voucher PAY-P<dev>-###### (server LIKE 'PAY-P%')
 * stocktake STK-P<dev>-###### (server LIKE 'STK-P%')
 * stock transfer TRF-P<dev>-###### (server LIKE 'TRF-P%')
 * cashier shift negative shift_number (server < 0)
 */

import { supabase } from '@/core/supabase/supabase_client';
import { networkListener } from '@/core/sync/network_listener';
import { db } from '@/core/db/app_database';

const DEVICE_HASH_KEY = 'falcon_device_hash';
const RPC_TIMEOUT_MS = 6_000;
const PAD_BY_DOC: Record<string, number> = {
  sales_invoice: 6,
  sales_return: 6,
  purchase_invoice: 6,
  purchase_return: 6,
  journal_entry: 4,
  cashier_shift: 4,
  voucher: 6,
  stocktake: 6,
  stock_transfer: 6,
};

const PREFIX_BY_DOC: Record<string, (orgId: string, branchId: string) => string> = {
  sales_invoice: () => 'INV',
  sales_return: () => 'RET',
  purchase_invoice: () => 'PUR',
  purchase_return: () => 'PRET',
  journal_entry: () => `ENTR-${new Date().getFullYear()}`,
  cashier_shift: () => 'SH',
  voucher: () => 'PAY',
  stocktake: () => 'STK',
  stock_transfer: () => 'TRF',
};

type DocType = keyof typeof PREFIX_BY_DOC;

interface MintedNumber {
  number: string;
  seq: number;
  online: boolean;
}

/** Per-device or workstation id (persisted once) used to scope temp offline numbers. */
export function getDeviceHash(): string {
  if (typeof window === 'undefined') return 'SERVER';

  // 1. Check for configured workstation or POS station code in settings/localStorage
  const stationCode =
    window.localStorage.getItem('falcon_station_code') ||
    window.localStorage.getItem('falcon_pos_station_id');
  if (stationCode) {
    const clean = stationCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length > 0) return clean;
  }

  // 2. Retrieve or generate unique 8-character device hash
  let hash = window.localStorage.getItem(DEVICE_HASH_KEY);
  if (!hash || hash.length < 6) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(4);
      window.crypto.getRandomValues(bytes);
      hash = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    } else {
      hash = Math.random().toString(16).slice(2, 10).toUpperCase();
    }
    window.localStorage.setItem(DEVICE_HASH_KEY, hash);
  }
  return hash;
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('RPC timeout')), ms);
    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Inspects Dexie tables to find the maximum existing offline sequence number
 * for the given device identifier and document type.
 */
async function getMaxOfflineSeqFromDexie(docType: DocType, dev: string): Promise<number> {
  try {
    let numbers: string[] = [];
    const prefixDev = `-P${dev}-`;

    switch (docType) {
      case 'sales_invoice': {
        const rows = await db.sales_invoices
          .filter((row) => typeof row.invoice_number === 'string' && row.invoice_number.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.invoice_number);
        break;
      }
      case 'sales_return': {
        const rows = await db.sales_returns
          .filter((row) => typeof row.return_number === 'string' && row.return_number.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.return_number);
        break;
      }
      case 'purchase_invoice': {
        const rows = await db.purchase_invoices
          .filter((row) => typeof row.system_invoice_number === 'string' && row.system_invoice_number.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.system_invoice_number);
        break;
      }
      case 'purchase_return': {
        const rows = await db.purchase_returns
          .filter((row) => typeof row.return_number === 'string' && row.return_number.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.return_number);
        break;
      }
      case 'journal_entry': {
        const rows = await db.journal_entries
          .filter((row) => typeof row.entry_no === 'string' && row.entry_no.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.entry_no);
        break;
      }
      case 'voucher': {
        const rows = await db.financial_vouchers
          .filter((row) => typeof row.voucher_no === 'string' && row.voucher_no.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.voucher_no);
        break;
      }
      case 'stocktake': {
        const rows = await db.stocktake_sessions
          .filter((row) => typeof row.session_number === 'string' && row.session_number.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.session_number);
        break;
      }
      case 'stock_transfer': {
        const rows = await db.stock_transfers
          .filter((row) => typeof row.transfer_no === 'string' && row.transfer_no.includes(prefixDev))
          .toArray();
        numbers = rows.map((r) => r.transfer_no);
        break;
      }
      case 'cashier_shift': {
        const rows = await db.cashier_shifts
          .filter((row) => typeof row.shift_number === 'number' && row.shift_number < 0)
          .toArray();
        const seqs = rows.map((r) => Math.abs(r.shift_number));
        return seqs.length > 0 ? Math.max(...seqs) : 0;
      }
    }

    let maxSeq = 0;
    for (const numStr of numbers) {
      if (!numStr) continue;
      const parts = numStr.split('-');
      const lastPart = parts[parts.length - 1];
      const seqVal = parseInt(lastPart, 10);
      if (!isNaN(seqVal) && seqVal > maxSeq) {
        maxSeq = seqVal;
      }
    }
    return maxSeq;
  } catch {
    return 0;
  }
}

async function nextOfflineSeq(orgId: string, branchId: string, docType: DocType): Promise<number> {
  const key =
    docType === 'journal_entry' || docType === 'cashier_shift'
      ? `offline_seq_${orgId}_${docType}`
      : `offline_seq_${branchId}_${docType}`;

  const existing = await db.app_settings.get(key);
  const settingSeq = existing ? parseInt(existing.value || '0', 10) : 0;
  const dev = getDeviceHash();
  const dexieMaxSeq = await getMaxOfflineSeqFromDexie(docType, dev);

  const next = Math.max(settingSeq, dexieMaxSeq) + 1;

  await db.app_settings.put({
    id: key,
    org_id: orgId,
    value: String(next),
    description: `Offline sequence for ${docType}`,
    updated_at: new Date().toISOString(),
    sync_status: 'synced',
  });
  return next;
}

async function mintsFromServer(orgId: string, branchId: string, docType: DocType): Promise<MintedNumber | null> {
  const prefix = PREFIX_BY_DOC[docType](orgId, branchId);
  try {
    const { data, error } = await withTimeout(
      supabase.rpc('falcon_next_document_number', {
        p_org_id: orgId,
        p_doc_type: docType,
        p_prefix: prefix,
        p_pad: PAD_BY_DOC[docType],
      }),
      RPC_TIMEOUT_MS
    );
    if (error) return null;
    const payload = data as { ok?: boolean; code?: string; seq?: number; number?: string };
    if (!payload?.ok || !payload.number) return null;
    return { number: payload.number, seq: payload.seq ?? 0, online: true };
  } catch {
    return null;
  }
}

async function mint(orgId: string, branchId: string, docType: DocType): Promise<MintedNumber> {
  if (networkListener.getStatus()) {
    const server = await mintsFromServer(orgId, branchId, docType);
    if (server) return server;
  }
  const seq = await nextOfflineSeq(orgId, branchId, docType);
  const pad = PAD_BY_DOC[docType];
  const dev = getDeviceHash();
  const prefix = PREFIX_BY_DOC[docType](orgId, branchId);
  const padded = String(seq).padStart(pad, '0');
  const number = docType === 'cashier_shift' ? '' : `${prefix}-P${dev}-${padded}`;
  return { number, seq, online: false };
}

export class DocumentNumberService {
  public static async nextSalesInvoiceNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'sales_invoice')).number;
  }

  public static async nextSalesReturnNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'sales_return')).number;
  }

  public static async nextPurchaseInvoiceNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'purchase_invoice')).number;
  }

  public static async nextPurchaseReturnNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'purchase_return')).number;
  }

  public static async nextJournalEntryNo(orgId: string): Promise<string> {
    return (await mint(orgId, orgId, 'journal_entry')).number;
  }

  public static async nextVoucherNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'voucher')).number;
  }

  public static async nextStocktakeNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'stocktake')).number;
  }

  public static async nextStockTransferNumber(orgId: string, branchId: string): Promise<string> {
    return (await mint(orgId, branchId, 'stock_transfer')).number;
  }

  /**
   * Cashier shift numbers: a positive sequence integer when online; a NEGATIVE
   * sentinel (marking the shift for renumbering on reconnect) when offline.
   */
  public static async nextShiftNumber(orgId: string, branchId: string): Promise<number> {
    const result = await mint(orgId, branchId, 'cashier_shift');
    if (result.online) return result.seq;
    return -result.seq;
  }
}

/** True when a local document carries a temporary offline number. */
export const isOfflineDocumentNumber = (value: string | number): boolean => {
  if (typeof value === 'number') return value < 0;
  if (!value || typeof value !== 'string') return false;
  return (
    /^[A-Z]+-P[A-Za-z0-9_-]+/i.test(value) ||
    /^ENTR-\d{4}-P[A-Za-z0-9_-]+/i.test(value) ||
    value.includes('-P')
  );
};

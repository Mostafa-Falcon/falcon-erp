import type { InventoryTransactionType } from'@/types';

const AR_NUM = {
'0':'٠','1':'١','2':'٢','3':'٣','4':'٤',
'5':'٥','6':'٦','7':'٧','8':'٨','9':'٩',
};

/** Formats a number with thousands separators (keeps Western digits). */
export function formatNumber(n: number | undefined | null, digits = 0): string {
 if (n === undefined || n === null || Number.isNaN(n)) return'0';
 return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 });
}

/**
 * Formats a`Date`as a`YYYY-MM-DD`string in the browser's **local** timezone.
 *
 * Use this instead of`new Date().toISOString().slice(0, 10)`.`toISOString`
 * converts to UTC first, so for any user east of Greenwich the value rolls
 * over to tomorrow during the last hours of the local day. The product targets
 * UTC+2/+3 (Egypt / Central EU), which is exactly where that bug is visible.
 */
export function formatLocalDateISO(date: Date = new Date()): string {
 const y = date.getFullYear();
 const m = String(date.getMonth() + 1).padStart(2,'0');
 const d = String(date.getDate()).padStart(2,'0');
 return`${y}-${m}-${d}`;
}

/** True if a date is expired when compared with today. */
export function isExpired(dateStr?: string | null): boolean {
 if (!dateStr) return false;
 return new Date(dateStr).getTime() < Date.now();
}

/** Number of days until expiry, rounded down; negative when already expired. */
export function daysToExpiry(dateStr?: string | null): number {
 if (!dateStr) return Infinity;
 const diff = new Date(dateStr).getTime() - Date.now();
 return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const MOVEMENT_TYPE_LABELS: Record<InventoryTransactionType, string> = {
 opening_stock:'رصيد افتتاحي',
 opening_balance:'رصيد افتتاحي',
 purchase:'مشتريات',
 sale:'مبيعات',
 sale_return:'مرتجع بيع',
 purchase_return:'مرتجع شراء',
 transfer_in:'تحويل وارد',
 transfer_out:'تحويل صادر',
 adjustment_in:'تسوية (زيادة)',
 adjustment_out:'تسوية (نقص)',
 damaged:'توالف',
};

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
 draft:'مسودة',
 pending:'قيد الشحن',
 in_transit:'تم الشحن',
 completed:'تم الاستلام',
 cancelled:'ملغي',
};

export const ITEM_TYPE_LABELS: Record<string, string> = {
 storable:'بضاعة',
 service:'خدمة',
 composite:'مجمع',
};

export function toArabicDigits(input: string | number): string {
 return String(input).replace(/[0-9]/g, (d) => AR_NUM[d as keyof typeof AR_NUM]);
}

export function formatDate(iso?: string | null): string {
 if (!iso) return'—';
 const d = new Date(iso);
 if (Number.isNaN(d.getTime())) return'—';
 return d.toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric'});
}

export function formatDateTime(iso?: string | null): string {
 if (!iso) return'—';
 const d = new Date(iso);
 if (Number.isNaN(d.getTime())) return'—';
 return d.toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric'}) +
''+ d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit'});
}
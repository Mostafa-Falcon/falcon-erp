-- 🦅 Falcon ERP Migration: Support offline document renumbering for all document types
-- (sales_invoices, sales_returns, purchase_invoices, purchase_returns, journal_entries,
--  financial_vouchers, stocktake_sessions, stock_transfers, cashier_shifts)

create or replace function public.falcon_reassign_offline_document_numbers(p_org_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  r record;
  v_num jsonb;
  v_reassigned integer := 0;
  v_mappings jsonb := '[]'::jsonb;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_org_id is distinct from v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  -- 1. Sales invoices
  for r in (select id, invoice_number from public.sales_invoices
             where org_id = p_org_id and invoice_number like 'INV-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'sales_invoice', 'INV', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.sales_invoices set invoice_number = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'sale_invoice', 'id', r.id,
        'from', r.invoice_number, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 2. Sales returns
  for r in (select id, return_number from public.sales_returns
             where org_id = p_org_id and return_number like 'RET-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'sales_return', 'RET', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.sales_returns set return_number = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'sales_return', 'id', r.id,
        'from', r.return_number, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 3. Purchase invoices (system number)
  for r in (select id, system_invoice_number from public.purchase_invoices
             where org_id = p_org_id and system_invoice_number like 'PUR-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'purchase_invoice', 'PUR', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.purchase_invoices set system_invoice_number = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'purchase_invoice', 'id', r.id,
        'from', r.system_invoice_number, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 4. Purchase returns
  for r in (select id, return_number from public.purchase_returns
             where org_id = p_org_id and return_number like 'PRET-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'purchase_return', 'PRET', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.purchase_returns set return_number = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'purchase_return', 'id', r.id,
        'from', r.return_number, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 5. Journal entries (offline entries carry ENTR-YYYY-P<dev>-##)
  for r in (select id, entry_no, entry_date, created_at from public.journal_entries
             where org_id = p_org_id and entry_no like 'ENTR-%-P%'
             order by entry_date, created_at, id)
  loop
    v_num := public.falcon_next_document_number(
      p_org_id, 'journal_entry',
      'ENTR-' || to_char(coalesce(r.entry_date, r.created_at), 'YYYY'), 4
    );
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.journal_entries set entry_no = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'journal_entry', 'id', r.id,
        'from', r.entry_no, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 6. Financial Vouchers (PAY-P%)
  for r in (select id, voucher_no from public.financial_vouchers
             where org_id = p_org_id and voucher_no like 'PAY-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'voucher', 'PAY', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.financial_vouchers set voucher_no = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'financial_voucher', 'id', r.id,
        'from', r.voucher_no, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 7. Stocktake Sessions (STK-P%)
  for r in (select id, session_number from public.stocktake_sessions
             where org_id = p_org_id and session_number like 'STK-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'stocktake', 'STK', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.stocktake_sessions set session_number = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'stocktake_session', 'id', r.id,
        'from', r.session_number, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 8. Stock Transfers (TRF-P%)
  for r in (select id, transfer_no from public.stock_transfers
             where org_id = p_org_id and transfer_no like 'TRF-P%'
             order by created_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'stock_transfer', 'TRF', 6);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.stock_transfers set transfer_no = v_num ->> 'number'
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'stock_transfer', 'id', r.id,
        'from', r.transfer_no, 'to', v_num ->> 'number');
    end if;
  end loop;

  -- 9. Cashier shifts: offline sentinel shift_number is negative; renumber positive.
  for r in (select id, shift_number from public.cashier_shifts
             where org_id = p_org_id and shift_number < 0
             order by opened_at, id)
  loop
    v_num := public.falcon_next_document_number(p_org_id, 'cashier_shift', 'SH', 4);
    if coalesce((v_num ->> 'ok')::boolean, false) then
      update public.cashier_shifts set shift_number = (v_num ->> 'seq')::int
       where id = r.id;
      v_reassigned := v_reassigned + 1;
      v_mappings := v_mappings || jsonb_build_object('type', 'cashier_shift', 'id', r.id,
        'from', r.shift_number, 'to', (v_num ->> 'seq')::int);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'reassigned', v_reassigned, 'mappings', v_mappings);
end;
$$;

grant execute on function public.falcon_reassign_offline_document_numbers(uuid) to authenticated, anon;

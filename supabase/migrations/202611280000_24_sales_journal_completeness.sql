-- =============================================================
-- 202611280000_24_sales_journal_completeness.sql
-- The offline/local POS path saves the invoice, stock movement and
-- treasury delta but never emits a journal entry. The reconciliation
-- coordinator already calls falcon_backfill_missing_sales_journals(),
-- but that RPC did not exist. This migration adds it (idempotent).
-- =============================================================

create or replace function public.falcon_backfill_sales_journal(p_invoice_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_existing uuid;
  v_entry_no jsonb;
  v_entry_id uuid := gen_random_uuid();
  v_cash uuid; v_bank uuid; v_recv uuid; v_sales uuid;
  v_accrued uuid; v_cogs uuid; v_inventory uuid; v_other uuid;
  v_net numeric; v_tax numeric; v_ship numeric;
  v_cash_paid numeric; v_card_paid numeric; v_credit numeric; v_cogs_amount numeric;
begin
  select * into v_inv from public.sales_invoices
   where id = p_invoice_id and is_deleted = false and status <> 'cancelled';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVOICE_NOT_FOUND');
  end if;

  select id into v_existing from public.journal_entries
   where reference_type = 'sale_invoice' and reference_id = p_invoice_id limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS');
  end if;

  v_cash      := (select id from public.accounts where org_id = v_inv.org_id and code = '1110');
  v_bank      := (select id from public.accounts where org_id = v_inv.org_id and code = '1120');
  v_recv      := (select id from public.accounts where org_id = v_inv.org_id and code = '1130');
  v_sales     := (select id from public.accounts where org_id = v_inv.org_id and code = '4100');
  v_accrued   := (select id from public.accounts where org_id = v_inv.org_id and code = '2120');
  v_cogs      := (select id from public.accounts where org_id = v_inv.org_id and code = '5100');
  v_inventory := (select id from public.accounts where org_id = v_inv.org_id and code = '1140');
  v_other     := (select id from public.accounts where org_id = v_inv.org_id and code = '4900');
  if v_cash is null or v_bank is null or v_recv is null or v_sales is null
     or v_accrued is null or v_cogs is null or v_inventory is null then
    return jsonb_build_object('ok', false, 'code', 'CHART_NOT_READY');
  end if;

  -- A bank treasury receives into the bank account instead of cash.
  if exists (select 1 from public.treasuries
              where id = v_inv.treasury_id and type = 'bank') then
    v_cash := v_bank;
  end if;

  v_cash_paid := round(coalesce(v_inv.cash_amount, 0), 2);
  v_card_paid := round(coalesce(v_inv.card_amount, 0), 2);
  v_credit    := round(coalesce(v_inv.remaining_amount, 0), 2);
  v_tax       := round(coalesce(v_inv.tax_amount, 0), 2);
  v_ship      := round(coalesce(v_inv.shipping_fee, 0), 2);
  v_net       := round(coalesce(v_inv.subtotal, 0) - coalesce(v_inv.discount_amount, 0), 2);
  select round(coalesce(sum(quantity * unit_cost), 0), 2) into v_cogs_amount
    from public.sales_invoice_items where invoice_id = p_invoice_id;

  v_entry_no := public.falcon_next_document_number(
    v_inv.org_id, 'journal_entry',
    'ENTR-' || to_char(coalesce(v_inv.created_at, now()), 'YYYY'), 4
  );
  if not coalesce((v_entry_no ->> 'ok')::boolean, false) then return v_entry_no; end if;

  insert into public.journal_entries (
    id, org_id, branch_id, entry_no, entry_date, type, description,
    reference_type, reference_id, total_amount, is_reversed, created_by, created_at
  ) values (
    v_entry_id, v_inv.org_id, v_inv.branch_id, v_entry_no ->> 'number',
    coalesce(v_inv.invoice_date, v_inv.created_at, now()), 'sales',
    'فاتورة مبيعات ' || coalesce(v_inv.invoice_number, ''),
    'sale_invoice', p_invoice_id, round(coalesce(v_inv.total, 0), 2), false,
    v_inv.created_by, coalesce(v_inv.created_at, now())
  );

  insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
    select gen_random_uuid(), v_entry_id, r.account_id, r.debit, r.credit, null
    from (
      select v_cash      as account_id, v_cash_paid  as debit, 0::numeric as credit
      union all select v_bank,      v_card_paid, 0
      union all select v_recv,      v_credit,    0
      union all select v_cogs,      v_cogs_amount, 0
      union all select v_sales,     0, v_net
      union all select v_accrued,   0, v_tax
      union all select v_inventory, 0, v_cogs_amount
      union all select v_other,     0, v_ship
    ) as r where r.debit <> 0 or r.credit <> 0;

  -- Mirror the account balances exactly like the online sales RPC does.
  update public.accounts a
     set current_balance = round(coalesce(a.current_balance, 0) + d.delta, 2), updated_at = now()
    from (
      select v_cash      as account_id,  v_cash_paid  as delta
      union all select v_bank,          v_card_paid
      union all select v_recv,          v_credit
      union all select v_cogs,          v_cogs_amount
      union all select v_sales,        -v_net
      union all select v_accrued,      -v_tax
      union all select v_inventory,    -v_cogs_amount
      union all select v_other,        -v_ship
    ) as d where a.id = d.account_id and d.delta <> 0;

  return jsonb_build_object('ok', true, 'code', 'BACKFILLED', 'entry_no', v_entry_no ->> 'number');
end;
$$;

grant execute on function public.falcon_backfill_sales_journal(uuid) to authenticated, anon;

create or replace function public.falcon_backfill_missing_sales_journals(p_org_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  r record; v_result jsonb; v_ok int := 0; v_fail jsonb := '[]'::jsonb;
begin
  for r in
    select si.id from public.sales_invoices si
     where si.org_id = p_org_id and si.is_deleted = false and si.status <> 'cancelled'
       and not exists (
         select 1 from public.journal_entries je
          where je.reference_type = 'sale_invoice' and je.reference_id = si.id
       )
  loop
    v_result := public.falcon_backfill_sales_journal(r.id);
    if coalesce((v_result ->> 'ok')::boolean, false) then
      v_ok := v_ok + 1;
    else
      v_fail := v_fail || jsonb_build_object('invoice_id', r.id, 'result', v_result);
    end if;
  end loop;
  return jsonb_build_object(
    'ok', jsonb_array_length(v_fail) = 0,
    'backfilled', v_ok,
    'failed', v_fail
  );
end;
$$;

grant execute on function public.falcon_backfill_missing_sales_journals(uuid) to authenticated, anon;

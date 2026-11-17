-- =============================================================
-- 202611160000_21_shift_journal_backfill.sql
-- Root-cause fix for the offline POS path:
--   1) falcon_adjust_shift       — atomic delta for cashier shift counters
--      (sales cash/card/credit and expected closing balance).
--   2) falcon_backfill_sales_journal — idempotently create the missing
--      balanced double-entry journal for a sale_invoice that was posted
--      through the offline path (which never writes a journal at all).
--   3) falcon_backfill_missing_sales_journals — bulk version of (2):
--      all sale_invoices that have no reference journal yet.
--   4) falcon_backfill_shift_totals — recompute every shift's totals
--      absolutely from its invoices; idempotent; safe to run anytime.
--
-- Design notes:
--   * All functions are idempotent (repeatable).
--   * falcon_backfill_sales_journal validates the entry is balanced and is
--     a no-op when a journal already exists for the invoice.
--   * Expected closing balance rule: opening_balance + total_sales_cash.
--   * Uses the same chart of accounts codes as falcon_create_sales_invoice
--     (1110 cash / 1120 bank / 1130 receivables / 1140 inventory /
--      2120 accrued tax / 4100 sales / 4900 other revenue / 5100 COGS).
-- =============================================================

-- -------------------------------------------------------------
-- 1) Delta-adjust a cashier shift's counters atomically.
-- -------------------------------------------------------------
create or replace function public.falcon_adjust_shift(
  p_shift_id uuid,
  p_delta_total_sales_cash numeric default 0,
  p_delta_total_sales_card numeric default 0,
  p_delta_total_sales_credit numeric default 0,
  p_delta_expected_closing_balance numeric default 0
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_row public.cashier_shifts%rowtype;
  v_cash numeric;
begin
  if p_shift_id is null then
    return jsonb_build_object('ok', false, 'code', 'SHIFT_ID_REQUIRED');
  end if;

  -- When called from the app, scope to the caller's org. Direct SQL
  -- maintenance (no auth context) may pass p_shift_id only.
  if v_org is not null then
    select * into v_row
      from public.cashier_shifts
     where id = p_shift_id and org_id = v_org
     for update;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'SHIFT_NOT_FOUND');
    end if;
  else
    select * into v_row from public.cashier_shifts where id = p_shift_id for update;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'SHIFT_NOT_FOUND');
    end if;
  end if;

  v_cash := round(coalesce(v_row.total_sales_cash, 0) + p_delta_total_sales_cash, 2);

  update public.cashier_shifts
     set total_sales_cash = v_cash,
         total_sales_card = round(coalesce(total_sales_card, 0) + p_delta_total_sales_card, 2),
         total_sales_credit = round(coalesce(total_sales_credit, 0) + p_delta_total_sales_credit, 2),
         expected_closing_balance = round(
           coalesce(v_row.opening_balance, 0)
           + case when p_delta_expected_closing_balance <> 0
                then p_delta_expected_closing_balance
                else v_cash end
         , 2),
         updated_at = now()
   where id = p_shift_id;

  return jsonb_build_object('ok', true, 'total_sales_cash', v_cash);
end;
$$;

grant execute on function public.falcon_adjust_shift(uuid, numeric, numeric, numeric, numeric) to authenticated, anon;

-- -------------------------------------------------------------
-- 2) Backfill the missing balanced journal for one sale invoice.
--    No-op when a journal already exists for the invoice.
-- -------------------------------------------------------------
create or replace function public.falcon_backfill_sales_journal(p_invoice_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_invoice public.sales_invoices%rowtype;
  v_item    public.sales_invoice_items%rowtype;
  v_existing uuid;
  v_cogs     numeric := 0;
  v_lines    jsonb := '[]'::jsonb;
  v_cash     numeric;
  v_card     numeric;
  v_credit   numeric;
  v_revenue  numeric;
  v_tax      numeric;
  v_shipping numeric;
  v_entry_no jsonb;
  v_journal_id uuid := gen_random_uuid();
  v_debit    numeric;
  v_credit_t numeric;
  v_cash_acct uuid;
  v_bank_acct uuid;
  v_receivables uuid;
  v_sales_acct uuid;
  v_accrued uuid;
  v_cogs_acct uuid;
  v_inventory uuid;
  v_other_rev uuid;
  v_unit_price numeric;
  v_unit_cost  numeric;
begin
  if p_invoice_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVOICE_ID_REQUIRED');
  end if;

  select * into v_invoice
    from public.sales_invoices
   where id = p_invoice_id and is_deleted = false;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVOICE_NOT_FOUND');
  end if;

  -- Idempotency: skip if a journal already references this invoice.
  select id into v_existing
    from public.journal_entries
   where reference_type = 'sale_invoice' and reference_id = p_invoice_id
   limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS', 'journal_entry_id', v_existing);
  end if;

  -- Compute COGS from the invoice items (base-quantity based).
  for v_item in
    select * from public.sales_invoice_items where invoice_id = p_invoice_id
  loop
    v_cogs := round(v_cogs + round(v_item.base_quantity * coalesce(v_item.unit_cost, 0), 2), 2);
  end loop;

  v_cash     := round(coalesce(v_invoice.cash_amount, 0), 2);
  v_card     := round(coalesce(v_invoice.card_amount, 0), 2);
  v_credit   := round(coalesce(v_invoice.remaining_amount, 0), 2);
  v_revenue  := round(coalesce(v_invoice.subtotal, 0) - coalesce(v_invoice.discount_amount, 0), 2);
  v_tax      := round(coalesce(v_invoice.tax_amount, 0), 2);
  v_shipping := round(coalesce(v_invoice.shipping_fee, 0), 2);

  v_cash_acct    := (select id from public.accounts where org_id = v_invoice.org_id and code = '1110');
  v_bank_acct    := (select id from public.accounts where org_id = v_invoice.org_id and code = '1120');
  v_receivables  := (select id from public.accounts where org_id = v_invoice.org_id and code = '1130');
  v_sales_acct   := (select id from public.accounts where org_id = v_invoice.org_id and code = '4100');
  v_accrued      := (select id from public.accounts where org_id = v_invoice.org_id and code = '2120');
  v_cogs_acct    := (select id from public.accounts where org_id = v_invoice.org_id and code = '5100');
  v_inventory    := (select id from public.accounts where org_id = v_invoice.org_id and code = '1140');
  v_other_rev    := (select id from public.accounts where org_id = v_invoice.org_id and code = '4900');

  if v_cash_acct is null or v_bank_acct is null or v_receivables is null
     or v_sales_acct is null or v_accrued is null or v_cogs_acct is null
     or v_inventory is null or v_other_rev is null then
    return jsonb_build_object('ok', false, 'code', 'CHART_NOT_READY');
  end if;

  v_debit    := round(v_cash + v_card + v_credit + v_cogs, 2);
  v_credit_t := round(v_revenue + v_tax + v_cogs + v_shipping, 2);
  if abs(v_debit - v_credit_t) > 0.001 then
    return jsonb_build_object('ok', false, 'code', 'JOURNAL_UNBALANCED',
      'debit', v_debit, 'credit', v_credit_t);
  end if;

  -- Entry number from the org's journal_entry sequence.
  v_entry_no := public.falcon_next_document_number(
    v_invoice.org_id, 'journal_entry',
    'ENTR-' || to_char(coalesce(v_invoice.invoice_date, now()), 'YYYY'), 4
  );
  if not coalesce((v_entry_no ->> 'ok')::boolean, false) then
    return v_entry_no;
  end if;

  insert into public.journal_entries (
    id, org_id, branch_id, entry_no, entry_date, type, description,
    reference_type, reference_id, total_amount, is_reversed, created_by, created_at
  ) values (
    v_journal_id, v_invoice.org_id, v_invoice.branch_id, v_entry_no ->> 'number',
    coalesce(v_invoice.invoice_date, now()), 'sales',
    'قيد مبيعات ' || v_invoice.invoice_number,
    'sale_invoice', p_invoice_id, v_debit, false,
    v_invoice.created_by, coalesce(v_invoice.invoice_date, now())
  );

  insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
  select gen_random_uuid(), v_journal_id, r.account_id, r.debit, r.credit, null
  from (
    select v_cash_acct  as account_id, v_cash    as debit, 0::numeric as credit
    union all select v_bank_acct, v_card, 0
    union all select v_receivables, v_credit, 0
    union all select v_cogs_acct, v_cogs, 0
    union all select v_sales_acct, 0, v_revenue
    union all select v_accrued, 0, v_tax
    union all select v_inventory, 0, v_cogs
    union all select v_other_rev, 0, v_shipping where v_shipping > 0
  ) as r
  where r.debit <> 0 or r.credit <> 0;

  -- Mirror account balances the same way falcon_create_sales_invoice does.
  update public.accounts a
     set current_balance = round(coalesce(a.current_balance, 0) + (d.debit - d.credit), 2),
         updated_at = now()
    from (
      select v_cash_acct  as account_id, v_cash    as debit, 0::numeric as credit
      union all select v_bank_acct, v_card, 0
      union all select v_receivables, v_credit, 0
      union all select v_cogs_acct, v_cogs, 0
      union all select v_sales_acct, 0, v_revenue
      union all select v_accrued, 0, v_tax
      union all select v_inventory, 0, v_cogs
      union all select v_other_rev, 0, v_shipping where v_shipping > 0
    ) as d
   where a.id = d.account_id
     and (d.debit <> 0 or d.credit <> 0)
     and (d.debit - d.credit) <> 0;

  return jsonb_build_object(
    'ok', true,
    'code', 'BACKFILLED',
    'entry_no', v_entry_no ->> 'number',
    'journal_entry_id', v_journal_id
  );
end;
$$;

grant execute on function public.falcon_backfill_sales_journal(uuid) to authenticated, anon;

-- -------------------------------------------------------------
-- 3) Bulk backfill: every sales invoice missing its journal.
-- -------------------------------------------------------------
create or replace function public.falcon_backfill_missing_sales_journals(p_org_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r record;
  v_result jsonb;
  v_ok integer := 0;
  v_fail jsonb := '[]'::jsonb;
begin
  for r in
    select si.id
      from public.sales_invoices si
     where si.org_id = p_org_id
       and si.is_deleted = false
       and not exists (
         select 1 from public.journal_entries je
          where je.reference_type = 'sale_invoice' and je.reference_id = si.id
       )
     order by si.created_at asc
  loop
    v_result := public.falcon_backfill_sales_journal(r.id);
    if coalesce((v_result ->> 'ok')::boolean, false) then
      v_ok := v_ok + 1;
    else
      v_fail := v_fail || jsonb_build_object('invoice_id', r.id, 'result', v_result);
    end if;
  end loop;

  return jsonb_build_object('ok', jsonb_array_length(v_fail) = 0,
                            'backfilled', v_ok,
                            'failed', v_fail);
end;
$$;

grant execute on function public.falcon_backfill_missing_sales_journals(uuid) to authenticated, anon;

-- -------------------------------------------------------------
-- 4) Recompute every shift's counters absolutely from its invoices.
--    Idempotent. Also repairs expected_closing_balance.
-- -------------------------------------------------------------
create or replace function public.falcon_backfill_shift_totals(p_org_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  update public.cashier_shifts s
     set total_sales_cash = coalesce((
           select round(sum(i.cash_amount), 2)
             from public.sales_invoices i
            where i.shift_id = s.id and i.org_id = p_org_id and i.is_deleted = false), 0),
         total_sales_card = coalesce((
           select round(sum(i.card_amount), 2)
             from public.sales_invoices i
            where i.shift_id = s.id and i.org_id = p_org_id and i.is_deleted = false), 0),
         total_sales_credit = coalesce((
           select round(sum(i.remaining_amount), 2)
             from public.sales_invoices i
            where i.shift_id = s.id and i.org_id = p_org_id and i.is_deleted = false), 0),
         expected_closing_balance = round(
           coalesce(s.opening_balance, 0)
           + coalesce((select round(sum(i.cash_amount), 2)
                         from public.sales_invoices i
                        where i.shift_id = s.id and i.org_id = p_org_id and i.is_deleted = false), 0), 2)
   where s.org_id = p_org_id;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'shifts_updated', v_updated);
end;
$$;

grant execute on function public.falcon_backfill_shift_totals(uuid) to authenticated, anon;

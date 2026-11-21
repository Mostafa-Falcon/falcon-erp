-- =============================================================
-- 202611210000_23_journal_completeness.sql
-- Three fixes for the accounting journal:
--   A) falcon_backfill_purchase_journal  + bulk version
--      falcon_backfill_sales_return_journal + bulk version
--      -> so offline purchase/sale-return flows (where the app never
--         emits a journal entry) get one on the first reconnect.
--   B) falcon_repair_missing_journal_lines(): rebuild lines for every
--      journal entry that has no lines, from its reference document.
--   C) falcon_normalize_journal_totals(): set each entry's total_amount
--      to the sum of its debit lines (authoritative), for all entries
--      that have lines.
-- All functions are idempotent and safe to call repeatedly.
-- =============================================================

-- -------------------------------------------------------------
-- A1) Purchase invoice journal (debit stock/expense, credit supplier)
-- -------------------------------------------------------------
create or replace function public.falcon_backfill_purchase_journal(p_invoice_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_inv public.purchase_invoices%rowtype;
  v_existing uuid;
  v_entry_no jsonb;
  v_entry_id uuid := gen_random_uuid();
  v_supplier uuid;
  v_inventory uuid;
begin
  select * into v_inv from public.purchase_invoices where id = p_invoice_id and is_deleted = false;
  if not found then return jsonb_build_object('ok', false, 'code', 'INVOICE_NOT_FOUND'); end if;
  select id into v_existing from public.journal_entries
   where reference_type = 'purchase_invoice' and reference_id = p_invoice_id limit 1;
  if v_existing is not null then return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS'); end if;

  v_inventory := (select id from public.accounts where org_id = v_inv.org_id and code = '1140');
  v_supplier  := (select id from public.accounts where org_id = v_inv.org_id and code = '2110');
  if v_inventory is null or v_supplier is null then
    return jsonb_build_object('ok', false, 'code', 'CHART_NOT_READY');
  end if;

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
    coalesce(v_inv.created_at, now()), 'purchases',
    'قيد مشتريات ' || coalesce(v_inv.invoice_number, ''),
    'purchase_invoice', p_invoice_id, round(coalesce(v_inv.total, 0), 2), false,
    v_inv.created_by, coalesce(v_inv.created_at, now())
  );

  insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
    select gen_random_uuid(), v_entry_id, r.account_id, r.debit, r.credit, null
    from (
      select v_inventory as account_id, round(coalesce(v_inv.total, 0), 2) as debit, 0::numeric as credit
      union all select v_supplier, 0, round(coalesce(v_inv.total, 0), 2)
    ) as r where r.debit <> 0 or r.credit <> 0;

  update public.accounts a
     set current_balance = round(coalesce(a.current_balance, 0) + d.delta, 2), updated_at = now()
    from (
      select v_inventory as account_id, round(coalesce(v_inv.total, 0), 2) as delta
      union all select v_supplier, -round(coalesce(v_inv.total, 0), 2)
    ) as d where a.id = d.account_id and d.delta <> 0;

  return jsonb_build_object('ok', true, 'code', 'BACKFILLED', 'entry_no', v_entry_no ->> 'number');
end;
$$;

grant execute on function public.falcon_backfill_purchase_journal(uuid) to authenticated, anon;

create or replace function public.falcon_backfill_missing_purchase_journals(p_org_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare r record; v_result jsonb; v_ok int := 0; v_fail jsonb := '[]'::jsonb;
begin
  for r in
    select pi.id from public.purchase_invoices pi
     where pi.org_id = p_org_id and pi.is_deleted = false
       and not exists (select 1 from public.journal_entries je
                        where je.reference_type = 'purchase_invoice' and je.reference_id = pi.id)
  loop
    v_result := public.falcon_backfill_purchase_journal(r.id);
    if coalesce((v_result ->> 'ok')::boolean, false) then v_ok := v_ok + 1;
    else v_fail := v_fail || jsonb_build_object('invoice_id', r.id, 'result', v_result); end if;
  end loop;
  return jsonb_build_object('ok', jsonb_array_length(v_fail) = 0, 'backfilled', v_ok, 'failed', v_fail);
end; $$;
grant execute on function public.falcon_backfill_missing_purchase_journals(uuid) to authenticated, anon;

-- -------------------------------------------------------------
-- A2) Sale return journal (reverse the original sale)
-- -------------------------------------------------------------
create or replace function public.falcon_backfill_sales_return_journal(p_return_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_ret public.sales_returns%rowtype;
  v_existing uuid; v_entry_no jsonb; v_entry_id uuid := gen_random_uuid();
  v_cash uuid; v_sales uuid;
begin
  select * into v_ret from public.sales_returns where id = p_return_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'RETURN_NOT_FOUND'); end if;
  select id into v_existing from public.journal_entries
   where reference_type = 'sale_return' and reference_id = p_return_id limit 1;
  if v_existing is not null then return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS'); end if;
  v_cash  := (select id from public.accounts where org_id = v_ret.org_id and code = '1110');
  v_sales := (select id from public.accounts where org_id = v_ret.org_id and code = '4100');
  if v_cash is null or v_sales is null then return jsonb_build_object('ok', false, 'code', 'CHART_NOT_READY'); end if;
  v_entry_no := public.falcon_next_document_number(v_ret.org_id, 'journal_entry',
    'ENTR-' || to_char(coalesce(v_ret.created_at, now()), 'YYYY'), 4);
  if not coalesce((v_entry_no ->> 'ok')::boolean, false) then return v_entry_no; end if;
  insert into public.journal_entries (
    id, org_id, branch_id, entry_no, entry_date, type, description,
    reference_type, reference_id, total_amount, is_reversed, created_by, created_at
  ) values (
    v_entry_id, v_ret.org_id, v_ret.branch_id, v_entry_no ->> 'number',
    coalesce(v_ret.created_at, now()), 'sale_return',
    'قيد مرتجع مبيعات ' || coalesce(v_ret.return_number, ''),
    'sale_return', p_return_id, abs(coalesce(v_ret.total, 0)), false,
    v_ret.created_by, coalesce(v_ret.created_at, now())
  );
  insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
    select gen_random_uuid(), v_entry_id, r.account_id, r.debit, r.credit, null
    from (
      select v_cash as account_id, abs(coalesce(v_ret.total, 0)) as debit, 0::numeric as credit
      union all select v_sales, 0, abs(coalesce(v_ret.total, 0))
    ) as r where r.debit <> 0 or r.credit <> 0;
  return jsonb_build_object('ok', true, 'code', 'BACKFILLED', 'entry_no', v_entry_no ->> 'number');
end; $$;
grant execute on function public.falcon_backfill_sales_return_journal(uuid) to authenticated, anon;

create or replace function public.falcon_backfill_missing_sales_return_journals(p_org_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare r record; v_result jsonb; v_ok int := 0; v_fail jsonb := '[]'::jsonb;
begin
  for r in
    select sr.id from public.sales_returns sr
     where sr.org_id = p_org_id
       and not exists (select 1 from public.journal_entries je
                        where je.reference_type = 'sale_return' and je.reference_id = sr.id)
  loop
    v_result := public.falcon_backfill_sales_return_journal(r.id);
    if coalesce((v_result ->> 'ok')::boolean, false) then v_ok := v_ok + 1;
    else v_fail := v_fail || jsonb_build_object('return_id', r.id, 'result', v_result); end if;
  end loop;
  return jsonb_build_object('ok', jsonb_array_length(v_fail) = 0, 'backfilled', v_ok, 'failed', v_fail);
end; $$;
grant execute on function public.falcon_backfill_missing_sales_return_journals(uuid) to authenticated, anon;

-- -------------------------------------------------------------
-- B) Rebuild lines for orphan journal entries from their documents.
--    Uses the existing backfill functions by (a) changing reference so
--    the function sees "no journal" for that doc, then re-pointing;
--    simpler direct rebuild below for each supported reference_type.
-- -------------------------------------------------------------
create or replace function public.falcon_repair_missing_journal_lines(p_org_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_e record; v_sale public.sales_invoices%rowtype;
  v_pur public.purchase_invoices%rowtype;
  v_exp public.expenses%rowtype;
  v_cash uuid; v_bank uuid; v_recv uuid; v_sales uuid; v_cogs uuid;
  v_invacct uuid; v_ap uuid; v_expacct uuid;
  v_debit numeric; v_credit numeric; v_lines jsonb;
  v_fixed int := 0; v_skipped int := 0;
begin
  for v_e in
    select je.id, je.reference_type, je.reference_id, je.total_amount
      from public.journal_entries je
     where je.org_id = p_org_id
       and not exists (select 1 from public.journal_entry_lines l where l.entry_id = je.id)
  loop
    v_cash    := (select id from public.accounts where org_id = p_org_id and code = '1110');
    v_bank    := (select id from public.accounts where org_id = p_org_id and code = '1120');
    v_recv    := (select id from public.accounts where org_id = p_org_id and code = '1130');
    v_sales   := (select id from public.accounts where org_id = p_org_id and code = '4100');
    v_cogs    := (select id from public.accounts where org_id = p_org_id and code = '5100');
    v_invacct := (select id from public.accounts where org_id = p_org_id and code = '1140');
    v_ap      := (select id from public.accounts where org_id = p_org_id and code = '2110');
    v_expacct := (select id from public.accounts where org_id = p_org_id and code = '5200');
    v_lines := '[]'::jsonb;

    if v_e.reference_type = 'sale_invoice' then
      select * into v_sale from public.sales_invoices where id = v_e.reference_id;
      if found then
        v_debit  := round(coalesce(v_sale.cash_amount,0) + coalesce(v_sale.card_amount,0) + coalesce(v_sale.remaining_amount,0), 2);
        v_credit := round(coalesce(v_sale.subtotal,0) - coalesce(v_sale.discount_amount,0) + coalesce(v_sale.tax_amount,0) + coalesce(v_sale.shipping_fee,0), 2);
        if v_cash is not null and v_sales is not null then
          insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit)
            select gen_random_uuid(), v_e.id, r.account_id, r.debit, r.credit
            from (
              select v_cash as account_id, v_debit as debit, 0::numeric as credit
              union all select v_sales, 0, v_credit
            ) as r where r.debit <> 0 or r.credit <> 0;
          v_fixed := v_fixed + 1;
        else v_skipped := v_skipped + 1; end if;
      else v_skipped := v_skipped + 1; end if;

    elsif v_e.reference_type = 'purchase_invoice' then
      select * into v_pur from public.purchase_invoices where id = v_e.reference_id;
      if found and v_invacct is not null and v_ap is not null then
        insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit)
          select gen_random_uuid(), v_e.id, r.account_id, r.debit, r.credit
          from (
            select v_invacct as account_id, round(coalesce(v_pur.total,0),2) as debit, 0::numeric as credit
            union all select v_ap, 0, round(coalesce(v_pur.total,0),2)
          ) as r where r.debit <> 0 or r.credit <> 0;
        v_fixed := v_fixed + 1;
      else v_skipped := v_skipped + 1; end if;

    elsif v_e.reference_type = 'expense' then
      select * into v_exp from public.expenses where id = v_e.reference_id;
      if found and v_expacct is not null and v_cash is not null then
        insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit)
          select gen_random_uuid(), v_e.id, r.account_id, r.debit, r.credit
          from (
            select v_expacct as account_id, round(coalesce(v_exp.amount,0),2) as debit, 0::numeric as credit
            union all select v_cash, 0, round(coalesce(v_exp.amount,0),2)
          ) as r where r.debit <> 0 or r.credit <> 0;
        v_fixed := v_fixed + 1;
      else v_skipped := v_skipped + 1; end if;

    else
      v_skipped := v_skipped + 1; -- reversal entries: skip (needs manual review)
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'fixed', v_fixed, 'skipped', v_skipped);
end; $$;
grant execute on function public.falcon_repair_missing_journal_lines(uuid) to authenticated, anon;

-- -------------------------------------------------------------
-- C) Normalize each entry's total_amount to the sum of its debit lines.
-- -------------------------------------------------------------
create or replace function public.falcon_normalize_journal_totals(p_org_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare v_fixed int;
begin
  update public.journal_entries je
     set total_amount = coalesce((
       select round(sum(l.debit), 2) from public.journal_entry_lines l where l.entry_id = je.id
     ), 0)
   where je.org_id = p_org_id
     and exists (select 1 from public.journal_entry_lines l where l.entry_id = je.id)
     and je.total_amount is distinct from coalesce((
       select round(sum(l.debit), 2) from public.journal_entry_lines l where l.entry_id = je.id
     ), 0);
  get diagnostics v_fixed = row_count;
  return jsonb_build_object('ok', true, 'fixed', v_fixed);
end; $$;
grant execute on function public.falcon_normalize_journal_totals(uuid) to authenticated, anon;

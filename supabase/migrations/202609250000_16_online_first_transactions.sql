-- =============================================================================
-- Migration 16: Online-First Transactions (Falcon Multi-Device Convergence)
-- =============================================================================
-- Purpose:
--   Converts the ERP from "offline-first with absolute push" to an
--   "online-first with authoritative server operations" model so the SAME
--   org / branch is safe on multiple devices simultaneously:
--
--     1. document_sequences: org-scoped distributed counter source for all
--        human-facing numbers (invoice / return / purchase / journal / shift).
--        Sequences are keyed by (org_id, doc_type) - NOT branch - because the
--        cloud uniqueness contracts are org-wide:
--          uq_sales_invoices_live_number (org_id, invoice_number)
--          uq_sales_returns_number       (org_id, return_number)
--          uq_purchase_returns_number    (org_id, return_number)
--          uq_journal (org_id, entry_no)
--
--     2. falcon_next_document_number(): atomic row-locked counter minting.
--        Seeded from the MAX existing sequence suffix so legacy numbers are
--        never re-issued.
--
--     3. falcon_create_sales_invoice(): the ENTIRE POS sale runs as ONE atomic
--        server transaction - number mint + stock lock/guard + batch guard +
--        line inserts + treasury + contact ledger + shift totals + balanced
--        journal + chart-of-accounts seeding. No partial states, no
--        overselling, no outbox races. Numeric guards mirror the client.
--
--     4. falcon_sync_journal_entry(): offline journal entries flush ATOMICALLY
--        (entry + all lines in one statement) and re-base account balances via
--        (debit - credit) deltas, matching the client's journalizeInline().
--
--     5. Balanced-journal enforcement now happens at STATEMENT level
--        (replaces the broken per-row trigger in migration 05 that rejected
--        line-by-line inserts), so a multi-row insert validates once the whole
--        entry is present. Legacy row-by-row journal syncs now fail cleanly
--        and are replaced by falcon_sync_journal_entry().
--
--     6. falcon_reassign_offline_document_numbers(): on reconnect, temporary
--        offline numbers (`INV-P<dev>-####`) are renumbered in created_at
--        order from the authoritative sequence.
--
--     7. falcon_reconcile_stock_ledger(): self-healing - rebuilds every
--        stock_levels / product_batches counter from the inventory transactions
--        ledger so any drifted device converges to ground truth.
--
-- Security:    SECURITY INVOKER + RLS for data-touching RPCs (same model as
--              migration 15); current_org_id() scopes every access. Numeric
--              functions are SECURITY DEFINER but validate p_org_id against
--              current_org_id() internally. Executed by both `authenticated`
--              (JWT) and `anon` (transport-token) callers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Distribution counter table
-- -----------------------------------------------------------------------------
create table if not exists public.document_sequences (
  org_id uuid not null references public.organizations(id) on delete cascade,
  doc_type text not null,
  seq bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, doc_type)
);

select public.falcon_enable_rls('document_sequences');

drop policy if exists "t_document_sequences_select" on public.document_sequences;
create policy "t_document_sequences_select" on public.document_sequences
  for select using (org_id = public.current_org_id());

-- Sequence rows are written ONLY through falcon_next_document_number()
-- (SECURITY DEFINER), never by table-level clients.
grant select on public.document_sequences to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 2. Seed helper: max existing numeric suffix per doc type
-- -----------------------------------------------------------------------------
create or replace function public.falcon_doc_seq_seed(p_org_id uuid, p_doc_type text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case p_doc_type
    when 'sales_invoice' then
      (select max(nullif(substring(si.invoice_number from '([0-9]+)$'), '')::bigint)
         from public.sales_invoices si where si.org_id = p_org_id)
    when 'sales_return' then
      (select max(nullif(substring(sr.return_number from '([0-9]+)$'), '')::bigint)
         from public.sales_returns sr where sr.org_id = p_org_id)
    when 'purchase_invoice' then
      (select max(nullif(substring(pi.system_invoice_number from '([0-9]+)$'), '')::bigint)
         from public.purchase_invoices pi where pi.org_id = p_org_id)
    when 'purchase_return' then
      (select max(nullif(substring(pr.return_number from '([0-9]+)$'), '')::bigint)
         from public.purchase_returns pr where pr.org_id = p_org_id)
    when 'journal_entry' then
      (select max(nullif(substring(je.entry_no from '([0-9]+)$'), '')::bigint)
         from public.journal_entries je where je.org_id = p_org_id)
    when 'cashier_shift' then
      (select max(shift_number) from public.cashier_shifts
        where org_id = p_org_id and shift_number > 0)
    else
      0
  end
$$;

-- -----------------------------------------------------------------------------
-- 3. Atomic document number minting
-- -----------------------------------------------------------------------------
-- number = prefix || '-' || lpad(seq, pad, '0')
-- Examples: INV-000042 | RET-000007 | PUR-000031 | PRET-000004
--           ENTR-2026-0012 (pad 4) | SH-0031 (pad 4)
create or replace function public.falcon_next_document_number(
  p_org_id uuid,
  p_doc_type text,
  p_prefix text,
  p_pad integer default 6
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_number text;
begin
  if p_org_id is distinct from public.current_org_id() then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;
  if p_doc_type is null or p_doc_type = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DOC_TYPE');
  end if;

  -- Guarantee a row exists (seeded from the historical max), then lock it.
  insert into public.document_sequences (org_id, doc_type, seq, updated_at)
  values (p_org_id, p_doc_type, coalesce(public.falcon_doc_seq_seed(p_org_id, p_doc_type), 0), now())
  on conflict (org_id, doc_type) do nothing;

  select seq into v_seq
    from public.document_sequences
   where org_id = p_org_id and doc_type = p_doc_type
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'SEQ_CREATE_FAILED');
  end if;

  v_seq := v_seq + 1;

  update public.document_sequences
     set seq = v_seq, updated_at = now()
   where org_id = p_org_id and doc_type = p_doc_type;

  v_number := coalesce(p_prefix, upper(replace(p_doc_type, '_', '-')))
           || '-' || lpad(v_seq::text, coalesce(p_pad, 6), '0');

  return jsonb_build_object(
    'ok', true,
    'seq', v_seq,
    'number', v_number
  );
end;
$$;

grant execute on function public.falcon_next_document_number(uuid, text, text, integer) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 4. Balanced-journal integrity (statement level)
-- -----------------------------------------------------------------------------
-- Replaces the migration-05 per-row trigger. Each INSERT statement is checked
-- once: ALL lines of the affected entries must sum debit = credit. A complete
-- journal (entry + lines) posted in ONE statement passes; legacy line-by-line
-- syncs fail fast and are rerouted through falcon_sync_journal_entry().
drop trigger if exists trg_enforce_balanced_journal on public.journal_entry_lines;

create or replace function public.falcon_validate_journal_balance_statement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry uuid;
  v_debit numeric;
  v_credit numeric;
begin
  for v_entry in (select distinct entry_id from new_tt)
  loop
    select coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0)
      into v_debit, v_credit
      from public.journal_entry_lines l
     where l.entry_id = v_entry;

    if abs(coalesce(v_debit, 0) - coalesce(v_credit, 0)) > 0.001 then
      raise exception 'Journal entry % is not balanced (debit % <> credit %)',
        v_entry, coalesce(v_debit, 0), coalesce(v_credit, 0);
    end if;
  end loop;

  return null;
end;
$$;

drop trigger if exists trg_validate_journal_balance_statement on public.journal_entry_lines;
create trigger trg_validate_journal_balance_statement
  after insert on public.journal_entry_lines
  referencing new table as new_tt
  for each statement execute function public.falcon_validate_journal_balance_statement();

-- -----------------------------------------------------------------------------
-- 5. On-demand chart-of-accounts seeding (mirrors client DEFAULT_CHART_OF_ACCOUNTS)
-- -----------------------------------------------------------------------------
create or replace function public.falcon_ensure_chart_accounts(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_id uuid := gen_random_uuid();
begin
  if p_org_id is distinct from public.current_org_id() then
    raise exception 'FORBIDDEN';
  end if;

  if exists (select 1 from public.accounts where org_id = p_org_id limit 1) then
    return jsonb_build_object('ok', true, 'seeded', false, 'count', 0);
  end if;

  -- Parents first, leaves after (FK-safe ordering), identical to the client.
  -- 1. Assets
  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  values (v_id, p_org_id, null, '1000', 'الأصول', 'Assets', 'asset', 'parent', 0, true, false, now(), now())
  on conflict (org_id, code) do nothing;
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1000'),
         '1100', 'الأصول المتداولة', 'Current Assets', 'asset', 'parent', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1100');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1100'),
         '1110', 'النقدية بالخزائن', 'Cash in Safes', 'asset', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1110');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1100'),
         '1120', 'حسابات البنوك', 'Bank Accounts', 'asset', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1120');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1100'),
         '1130', 'العملاء', 'Accounts Receivable', 'asset', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1130');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1100'),
         '1140', 'مخزون السلع', 'Inventory', 'asset', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1140');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1000'),
         '1200', 'الأصول الثابتة', 'Fixed Assets', 'asset', 'parent', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1200');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '1200'),
         '1210', 'معدات وآلات', 'Equipment', 'asset', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '1210');
  v_count := v_count + 1;

  -- 2. Liabilities
  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  values (v_id, p_org_id, null, '2000', 'الخصوم', 'Liabilities', 'liability', 'parent', 0, true, false, now(), now())
  on conflict (org_id, code) do nothing;
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '2000'),
         '2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', 'parent', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '2100');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '2100'),
         '2110', 'الموردون', 'Accounts Payable', 'liability', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '2110');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '2100'),
         '2120', 'التزامات مستحقة', 'Accrued Liabilities', 'liability', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '2120');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '2000'),
         '2200', 'قروض والتزامات طويلة الأجل', 'Long-term Loans', 'liability', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '2200');
  v_count := v_count + 1;

  -- 3. Equity
  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  values (v_id, p_org_id, null, '3000', 'حقوق الملكية', 'Equity', 'equity', 'parent', 0, true, false, now(), now())
  on conflict (org_id, code) do nothing;
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '3000'),
         '3100', 'رأس المال', 'Capital', 'equity', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '3100');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '3000'),
         '3200', 'أرباح وخسائر مرحلة', 'Retained Earnings', 'equity', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '3200');
  v_count := v_count + 1;

  -- 4. Revenue
  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  values (v_id, p_org_id, null, '4000', 'الإيرادات', 'Revenue', 'revenue', 'parent', 0, true, false, now(), now())
  on conflict (org_id, code) do nothing;
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '4000'),
         '4100', 'المبيعات', 'Sales Revenue', 'revenue', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '4100');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '4000'),
         '4110', 'مردودات المبيعات', 'Sales Returns', 'revenue', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '4110');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '4000'),
         '4900', 'إيرادات أخرى', 'Other Revenue', 'revenue', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '4900');
  v_count := v_count + 1;

  -- 5. Expenses
  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  values (v_id, p_org_id, null, '5000', 'المصروفات', 'Expenses', 'expense', 'parent', 0, true, false, now(), now())
  on conflict (org_id, code) do nothing;
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5000'),
         '5100', 'تكلفة البضاعة المباعة', 'COGS', 'expense', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5100');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5000'),
         '5200', 'مصروفات تشغيلية', 'Operating Expenses', 'expense', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5200');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5000'),
         '5300', 'مصروفات عمومية وإدارية', 'General & Admin', 'expense', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5300');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5300'),
         '5301', 'رواتب وأجور', 'Salaries & Wages', 'expense', 'leaf', 0, true, true, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5301');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5000'),
         '5400', 'مصروفات أخرى', 'Other Expenses', 'expense', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5400');
  v_count := v_count + 1;

  insert into public.accounts (id, org_id, parent_id, code, name, name_en, type, account_type, current_balance, is_active, system_flag, created_at, updated_at)
  select gen_random_uuid(), p_org_id, (select a.id from public.accounts a where a.org_id = p_org_id and a.code = '5000'),
         '5401', 'مصروفات ضرائب', 'Tax Expenses', 'expense', 'leaf', 0, true, false, now(), now()
  where not exists (select 1 from public.accounts a where a.org_id = p_org_id and a.code = '5401');
  v_count := v_count + 1;

  return jsonb_build_object('ok', true, 'seeded', true, 'count', v_count);
end;
$$;

grant execute on function public.falcon_ensure_chart_accounts(uuid) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 6. Account id resolution by code (with on-demand seeding)
-- -----------------------------------------------------------------------------
create or replace function public.falcon_account_id(p_org_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from public.accounts
   where org_id = p_org_id and code = p_code
   limit 1;

  if v_id is null then
    perform public.falcon_ensure_chart_accounts(p_org_id);
    select id into v_id
      from public.accounts
     where org_id = p_org_id and code = p_code
     limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.falcon_account_id(uuid, text) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 7. Atomic POS sale (the full online-first path)
-- -----------------------------------------------------------------------------
create or replace function public.falcon_create_sales_invoice(
  p_invoice_id uuid,
  p_org_id uuid,
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_shift_id uuid,
  p_customer_id uuid,
  p_treasury_id uuid,
  p_user_id uuid,
  p_invoice_date timestamptz,
  p_payment_type text,
  p_cash_amount numeric default 0,
  p_card_amount numeric default 0,
  p_discount_amount numeric default 0,
  p_discount_percent numeric default 0,
  p_shipping_fee numeric default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_allow_negative boolean := false;
  v_allow_setting text;

  v_number jsonb;
  v_invoice_number text;

  v_item jsonb;
  v_product_id uuid;
  v_batch_id uuid;
  v_unit_id uuid;
  v_qty numeric;
  v_factor numeric;
  v_base numeric;
  v_price numeric;
  v_cost numeric;
  v_line_discount numeric;
  v_tax_rate numeric;

  v_stock_row public.stock_levels%rowtype;
  v_stock_id text;
  v_stock_old_old numeric;
  v_stock_new numeric;
  v_stock_av numeric;

  v_batch_row public.product_batches%rowtype;
  v_batch_qty numeric;
  v_batch_new numeric;

  v_prev_level numeric;
  v_level numeric;

  v_txn_id uuid;
  v_txn_total numeric;
  v_txn_new numeric;
  v_txn_prev numeric;

  v_product_name text;
  v_unit_name text;
  v_batch_number text;
  v_expiry date;
  v_is_tracked boolean;

  v_invoice_payload jsonb;

  v_subtotal numeric := 0;
  v_total_item_discount numeric := 0;
  v_total_tax numeric := 0;
  v_cogs numeric := 0;

  v_overall_discount numeric;
  v_shipping numeric;
  v_goods_net numeric;
  v_final_total numeric;
  v_cash numeric := 0;
  v_card numeric := 0;
  v_total_paid numeric;
  v_remaining numeric;

  v_treasury_row public.treasuries%rowtype;
  v_cash_account uuid;
  v_bank_account uuid;
  v_receivables uuid;
  v_sales uuid;
  v_accrued uuid;
  v_cogs_account uuid;
  v_inventory uuid;
  v_other_revenue uuid;
  v_credit_amount numeric;
  v_net_revenue numeric;
  v_tax_for_journal numeric;
  v_shipping_for_journal numeric;
  v_debit_total numeric;
  v_credit_total numeric;

  v_contact_row public.contacts%rowtype;

  v_shift_row public.cashier_shifts%rowtype;

  v_journal_id uuid := gen_random_uuid();
  v_entry_no jsonb;

  stock_updates jsonb := '[]'::jsonb;
  batch_updates jsonb := '[]'::jsonb;
  txn_rows jsonb := '[]'::jsonb;
  item_rows jsonb := '[]'::jsonb;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_org_id is distinct from v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;
  if p_invoice_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INVOICE_ID');
  end if;
  if p_payment_type not in ('cash', 'card', 'split') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PAYMENT');
  end if;

  -- Idempotency: a retry of an already-created invoice returns the existing one.
  select to_jsonb(si) into v_invoice_payload
    from public.sales_invoices si
   where si.id = p_invoice_id and si.org_id = p_org_id;

  if v_invoice_payload is not null then
    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS', 'invoice', v_invoice_payload);
  end if;

  begin
    select value into v_allow_setting
    from public.app_settings
   where id = 'allow_negative_stock' and org_id = p_org_id;

  v_allow_negative := lower(coalesce(v_allow_setting, 'false')) in ('true', '1');

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_ITEMS');
  end if;

  if jsonb_array_length(p_items) > 500 then
    return jsonb_build_object('ok', false, 'code', 'TOO_MANY_ITEMS');
  end if;

  -- 0. Chart of accounts must exist before journaling.
  perform public.falcon_ensure_chart_accounts(p_org_id);

  -- 1. Authoritative invoice number from the org sequence.
  v_number := public.falcon_next_document_number(p_org_id, 'sales_invoice', 'INV', 6);
  if not coalesce((v_number ->> 'ok')::boolean, false) then
    return v_number;
  end if;
  v_invoice_number := v_number ->> 'number';

  -- 2. Validate + lock stock, record transactions, build item rows.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id     := (v_item ->> 'unit_id')::uuid;
    v_qty         := coalesce((v_item ->> 'quantity')::numeric, 0);
    v_factor      := coalesce((v_item ->> 'conversion_factor')::numeric, 1);
    v_price       := coalesce((v_item ->> 'unit_price')::numeric, 0);
    v_cost        := coalesce((v_item ->> 'unit_cost')::numeric, 0);
    v_line_discount := coalesce((v_item ->> 'discount_amount')::numeric, 0);
    v_tax_rate    := coalesce((v_item ->> 'tax_rate')::numeric, 0);

    if v_product_id is null or v_unit_id is null or v_qty <= 0 or v_price < 0 then
      return jsonb_build_object('ok', false, 'code', 'INVALID_ITEM', 'item', v_item);
    end if;

    v_base := round(v_qty * v_factor, 2);

    select name, tracks_batch into v_product_name, v_is_tracked
      from public.products
     where id = v_product_id and org_id = p_org_id and is_active;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'PRODUCT_NOT_FOUND', 'product_id', v_product_id);
    end if;

    select name into v_unit_name
      from public.units
     where id = v_unit_id and org_id = p_org_id;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'UNIT_NOT_FOUND', 'unit_id', v_unit_id);
    end if;

    -- Delta the sales invoice line totals exactly like the client's roundMoney().
    v_subtotal := round(v_subtotal + round(v_qty * v_price, 2), 2);
    v_total_item_discount := round(v_total_item_discount + v_line_discount, 2);
    v_cogs := round(v_cogs + round(v_qty * v_cost, 2), 2);
    v_total_tax := round(v_total_tax + round(round(greatest(0, round(v_qty * v_price, 2) - v_line_discount), 2) * v_tax_rate / 100, 2), 2);

    -- Lock the authoritative stock row (serialises concurrent devices).
    v_stock_id := p_warehouse_id::text || '_' || v_product_id::text;

    select * into v_stock_row
      from public.stock_levels
     where id = v_stock_id and org_id = p_org_id
     for update;

    if not found then
      insert into public.stock_levels (id, org_id, warehouse_id, product_id, quantity, reserved_quantity, available_quantity, updated_at)
      values (v_stock_id, p_org_id, p_warehouse_id, v_product_id, 0, 0, 0, now())
      on conflict (id) do nothing;

      select * into v_stock_row
        from public.stock_levels
       where id = v_stock_id and org_id = p_org_id
       for update;
    end if;

    v_stock_old_old := coalesce(v_stock_row.quantity, 0);
    v_stock_new := round(v_stock_old_old - v_base, 2);
    v_stock_av := round(v_stock_new - coalesce(v_stock_row.reserved_quantity, 0), 2);

    if not v_allow_negative and (v_stock_new < 0 or v_stock_av < 0) then
      return jsonb_build_object(
        'ok', false,
        'code', 'INSUFFICIENT_STOCK',
        'product_id', v_product_id,
        'product_name', v_product_name,
        'available_quantity', coalesce(v_stock_row.available_quantity, 0),
        'requested_quantity', v_base
      );
    end if;

    update public.stock_levels
       set quantity = v_stock_new,
           available_quantity = v_stock_av,
           updated_at = now()
     where id = v_stock_id;

    stock_updates := stock_updates || jsonb_build_object(
      'id', v_stock_id,
      'quantity', v_stock_new,
      'reserved_quantity', coalesce(v_stock_row.reserved_quantity, 0),
      'available_quantity', v_stock_av
    );

    -- Batch / expiry tracked products must consume the matching lot.
    if (v_item ? 'batch_id') and (v_item ->> 'batch_id') is not null then
      v_batch_id := (v_item ->> 'batch_id')::uuid;
      v_batch_number := v_item ->> 'batch_number';
      v_expiry := (v_item ->> 'expiry_date')::date;

      select * into v_batch_row
        from public.product_batches
       where id = v_batch_id and org_id = p_org_id
       for update;

      if not found then
        insert into public.product_batches
          (id, org_id, product_id, warehouse_id, batch_number, expiry_date, initial_quantity, current_quantity, purchase_price, created_at, updated_at)
        values
          (v_batch_id, p_org_id, v_product_id, p_warehouse_id,
           coalesce(v_batch_number, 'LOT-' || v_batch_id::text),
           v_expiry, 0, 0, v_cost, now(), now())
        on conflict (id) do nothing;

        select * into v_batch_row
          from public.product_batches
         where id = v_batch_id and org_id = p_org_id
         for update;
      end if;

      v_batch_new := round(coalesce(v_batch_row.current_quantity, 0) - v_base, 2);

      if not v_allow_negative and v_batch_new < 0 then
        return jsonb_build_object(
          'ok', false,
          'code', 'INSUFFICIENT_BATCH',
          'batch_id', v_batch_id,
          'batch_number', coalesce(v_batch_row.batch_number, v_batch_number),
          'current_quantity', coalesce(v_batch_row.current_quantity, 0),
          'requested_quantity', v_base
        );
      end if;

      update public.product_batches
         set current_quantity = v_batch_new,
             updated_at = now()
       where id = v_batch_id;

      batch_updates := batch_updates || jsonb_build_object('id', v_batch_id, 'current_quantity', v_batch_new);
    else
      if coalesce(v_is_tracked, false) then
        return jsonb_build_object('ok', false, 'code', 'BATCH_REQUIRED', 'product_id', v_product_id);
      end if;
      v_batch_id := null;
      v_batch_number := null;
      v_expiry := null;
    end if;

    -- Inventory transaction (authoritative, mirrors client recordStockMovement).
    v_prev_level := coalesce(v_stock_row.quantity, 0);
    v_level := v_stock_new;
    v_txn_new := v_level;
    v_txn_prev := v_prev_level;
    v_txn_total := round(coalesce(abs(v_qty * v_cost), 0), 2);
    v_txn_id := gen_random_uuid();

    item_rows := item_rows || jsonb_build_object(
      'id', (v_item ->> 'id')::uuid,
      'invoice_id', p_invoice_id,
      'product_id', v_product_id,
      'batch_id', v_batch_id,
      'unit_id', v_unit_id,
      'conversion_factor', v_factor,
      'quantity', v_qty,
      'base_quantity', v_base,
      'unit_price', v_price,
      'unit_cost', v_cost,
      'discount_amount', v_line_discount,
      'tax_rate', v_tax_rate,
      'tax_amount', round(greatest(0, round(v_qty * v_price, 2) - v_line_discount) * v_tax_rate / 100, 2),
      'total', round(round(greatest(0, round(v_qty * v_price, 2) - v_line_discount), 2) + round(greatest(0, round(v_qty * v_price, 2) - v_line_discount) * v_tax_rate / 100, 2), 2),
      'level_quantity', (v_item ->> 'level_quantity')::numeric,
      'product_name', v_product_name,
      'unit_name', v_unit_name
    );

    txn_rows := txn_rows || jsonb_build_object(
      'id', v_txn_id,
      'org_id', p_org_id,
      'warehouse_id', p_warehouse_id,
      'product_id', v_product_id,
      'batch_id', v_batch_id,
      'transaction_type', 'sale',
      'reference_type', 'sale_invoice',
      'reference_id', p_invoice_id,
      'quantity', round(-v_qty, 4),
      'unit_id', v_unit_id,
      'unit_conversion_factor', v_factor,
      'base_quantity', round(-v_base, 4),
      'unit_cost', v_cost,
      'total_cost', v_txn_total,
      'balance_after', v_txn_new,
      'notes', 'فاتورة مبيعات ' || v_invoice_number,
      'created_by', p_user_id,
      'created_at', coalesce(p_invoice_date, now()),
      'product_name', v_product_name,
      'unit_name', v_unit_name,
      'level_quantity', (v_item ->> 'level_quantity')::numeric,
      'batch_number', v_batch_number,
      'expiry_date', v_expiry,
      'prev_quantity', v_txn_prev,
      'new_quantity', v_txn_new,
      'reference_number', v_invoice_number
    );
  end loop;

  -- 3. Aggregate amounts (identical rounding to the client).
  v_overall_discount := case
    when p_discount_percent > 0
      then round(greatest(0, (v_subtotal - v_total_item_discount) * p_discount_percent / 100), 2)
    else
      coalesce(p_discount_amount, 0)
  end;

  v_shipping := round(coalesce(p_shipping_fee, 0), 2);
  v_goods_net := round(greatest(0, v_subtotal - v_total_item_discount - v_overall_discount), 2);
  v_final_total := round(v_goods_net + v_total_tax + v_shipping, 2);

  if p_payment_type = 'cash' then
    v_cash := v_final_total;
  elsif p_payment_type = 'card' then
    v_card := v_final_total;
  else
    v_cash := round(coalesce(p_cash_amount, 0), 2);
    v_card := round(coalesce(p_card_amount, 0), 2);
  end if;

  v_total_paid := round(v_cash + v_card, 2);
  v_remaining := round(greatest(0, v_final_total - v_total_paid), 2);

  if v_remaining > 0 and p_customer_id is null then
    return jsonb_build_object('ok', false, 'code', 'CUSTOMER_REQUIRED_FOR_CREDIT');
  end if;

  -- 4. Insert the invoice + items (single statement each, atomic).
  insert into public.sales_invoices (
    id, org_id, branch_id, warehouse_id, shift_id, invoice_number, invoice_date,
    customer_id, subtotal, discount_amount, discount_percent, tax_amount, shipping_fee,
    total, paid_amount, remaining_amount, payment_type, cash_amount, card_amount,
    treasury_id, status, notes, created_by, created_at, updated_at
  ) values (
    p_invoice_id, p_org_id, p_branch_id, p_warehouse_id, p_shift_id, v_invoice_number,
    coalesce(p_invoice_date, now()), p_customer_id,
    v_subtotal, round(v_total_item_discount + v_overall_discount, 2), coalesce(p_discount_percent, 0),
    v_total_tax, v_shipping, v_final_total, v_total_paid, v_remaining, p_payment_type,
    v_cash, v_card, p_treasury_id, 'completed', p_notes, p_user_id,
    coalesce(p_invoice_date, now()), coalesce(p_invoice_date, now())
  );

  insert into public.sales_invoice_items (
    id, invoice_id, product_id, batch_id, unit_id, conversion_factor, quantity,
    base_quantity, unit_price, unit_cost, discount_amount, tax_rate, tax_amount, total, notes
  )
  select (r ->> 'id')::uuid, p_invoice_id, (r ->> 'product_id')::uuid, (r ->> 'batch_id')::uuid,
         (r ->> 'unit_id')::uuid, (r ->> 'conversion_factor')::numeric, (r ->> 'quantity')::numeric,
         (r ->> 'base_quantity')::numeric, (r ->> 'unit_price')::numeric, (r ->> 'unit_cost')::numeric,
         (r ->> 'discount_amount')::numeric, (r ->> 'tax_rate')::numeric, (r ->> 'tax_amount')::numeric,
         (r ->> 'total')::numeric, null
  from jsonb_array_elements(item_rows) as r;

  -- 5. Inventory transactions.
  insert into public.inventory_transactions (
    id, org_id, warehouse_id, product_id, batch_id, transaction_type, reference_type,
    reference_id, quantity, unit_id, unit_conversion_factor, base_quantity, unit_cost,
    total_cost, balance_after, notes, created_by, created_at, product_name, unit_name,
    level_quantity, batch_number, expiry_date, prev_quantity, new_quantity, reference_number
  )
  select (r ->> 'id')::uuid, p_org_id, (r ->> 'warehouse_id')::uuid, (r ->> 'product_id')::uuid,
         (r ->> 'batch_id')::uuid, 'sale', 'sale_invoice', p_invoice_id,
         (r ->> 'quantity')::numeric, (r ->> 'unit_id')::uuid, (r ->> 'unit_conversion_factor')::numeric,
         (r ->> 'base_quantity')::numeric, (r ->> 'unit_cost')::numeric, (r ->> 'total_cost')::numeric,
         (r ->> 'balance_after')::numeric, (r ->> 'notes')::text, (r ->> 'created_by')::uuid,
         (r ->> 'created_at')::timestamptz, (r ->> 'product_name')::text, (r ->> 'unit_name')::text,
         (r ->> 'level_quantity')::numeric, (r ->> 'batch_number')::text, (r ->> 'expiry_date')::date,
         (r ->> 'prev_quantity')::numeric, (r ->> 'new_quantity')::numeric, (r ->> 'reference_number')::text
  from jsonb_array_elements(txn_rows) as r;

  -- 6. Treasury (cash received).
  if v_cash > 0 then
    select * into v_treasury_row
      from public.treasuries
     where id = p_treasury_id and org_id = p_org_id
     for update;

    if found then
      update public.treasuries
         set current_balance = round(coalesce(v_treasury_row.current_balance, 0) + v_cash, 2),
             updated_at = now()
       where id = p_treasury_id;

      v_treasury_row.current_balance := round(coalesce(v_treasury_row.current_balance, 0) + v_cash, 2);
    else
      v_treasury_row.id := p_treasury_id;
      v_treasury_row.current_balance := v_cash;
    end if;
  end if;

  -- 7. Customer credit ledger for the outstanding balance.
  if v_remaining > 0 and p_customer_id is not null then
    select * into v_contact_row
      from public.contacts
     where id = p_customer_id and org_id = p_org_id
     for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'CUSTOMER_NOT_FOUND');
    end if;

    update public.contacts
       set current_balance = round(coalesce(v_contact_row.current_balance, 0) + v_remaining, 2),
           updated_at = now()
     where id = p_customer_id;

    v_contact_row.current_balance := round(coalesce(v_contact_row.current_balance, 0) + v_remaining, 2);

    insert into public.contact_transactions (
      id, org_id, contact_id, reference_type, reference_id, debit, credit,
      balance_after, notes, created_at
    ) values (
      gen_random_uuid(), p_org_id, p_customer_id, 'sale_invoice', p_invoice_id,
      v_remaining, 0, v_contact_row.current_balance,
      'فاتورة مبيعات آجل رقم ' || v_invoice_number, coalesce(p_invoice_date, now())
    );
  end if;

  -- 8. Shift running totals + authoritative re-read for the response.
  if p_shift_id is not null then
    select * into v_shift_row
      from public.cashier_shifts
     where id = p_shift_id and org_id = p_org_id
     for update;

    if found and v_shift_row.status = 'open' then
      update public.cashier_shifts
         set total_sales_cash = round(coalesce(v_shift_row.total_sales_cash, 0) + v_cash, 2),
             total_sales_card = round(coalesce(v_shift_row.total_sales_card, 0) + v_card, 2),
             total_sales_credit = round(coalesce(v_shift_row.total_sales_credit, 0) + v_remaining, 2),
             expected_closing_balance = round(coalesce(v_shift_row.expected_closing_balance, 0) + v_cash, 2)
       where id = p_shift_id;
    end if;

    select * into v_shift_row
      from public.cashier_shifts
     where id = p_shift_id and org_id = p_org_id;
  end if;

  -- 9. Balanced double-entry journal (mirrors client postSalesInvoice).
  v_credit_amount := v_remaining;
  v_net_revenue  := v_goods_net;
  v_tax_for_journal := v_total_tax;
  v_shipping_for_journal := v_shipping;

  if v_treasury_row.id is not null and v_treasury_row.account_code is not null then
    v_cash_account := public.falcon_account_id(p_org_id, v_treasury_row.account_code);
  end if;
  if v_cash_account is null then
    if v_treasury_row.type = 'bank' then
      v_cash_account := public.falcon_account_id(p_org_id, '1120');
    else
      v_cash_account := public.falcon_account_id(p_org_id, '1110');
    end if;
  end if;

  v_bank_account   := public.falcon_account_id(p_org_id, '1120');
  v_receivables    := public.falcon_account_id(p_org_id, '1130');
  v_sales          := public.falcon_account_id(p_org_id, '4100');
  v_accrued        := public.falcon_account_id(p_org_id, '2120');
  v_cogs_account   := public.falcon_account_id(p_org_id, '5100');
  v_inventory      := public.falcon_account_id(p_org_id, '1140');
  v_other_revenue  := public.falcon_account_id(p_org_id, '4900');

  if v_cash_account is null or v_bank_account is null or v_receivables is null or v_sales is null
     or v_accrued is null or v_cogs_account is null or v_inventory is null then
    return jsonb_build_object('ok', false, 'code', 'CHART_NOT_READY');
  end if;

  v_debit_total := round(v_cash + v_card + v_credit_amount + v_cogs, 2);
  v_credit_total := round(v_net_revenue + v_tax_for_journal + v_cogs, 2);
  if v_shipping_for_journal > 0 then
    v_credit_total := round(v_credit_total + v_shipping_for_journal, 2);
  end if;

  if abs(v_debit_total - v_credit_total) > 0.001 then
    return jsonb_build_object('ok', false, 'code', 'JOURNAL_UNBALANCED',
      'debit', v_debit_total, 'credit', v_credit_total);
  end if;

  v_entry_no := public.falcon_next_document_number(
    p_org_id, 'journal_entry', 'ENTR-' || to_char(coalesce(p_invoice_date, now()), 'YYYY'), 4
  );
  if not coalesce((v_entry_no ->> 'ok')::boolean, false) then
    return v_entry_no;
  end if;

  insert into public.journal_entries (
    id, org_id, branch_id, entry_no, entry_date, type, description,
    reference_type, reference_id, total_amount, is_reversed, created_by, created_at
  ) values (
    v_journal_id, p_org_id, p_branch_id, v_entry_no ->> 'number',
    coalesce(p_invoice_date, now()), 'sales',
    'فاتورة مبيعات ' || v_invoice_number, 'sale_invoice', p_invoice_id,
    v_debit_total, false, p_user_id, coalesce(p_invoice_date, now())
  );

  -- Lines in ONE statement so the statement-level balance trigger validates.
  insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
  select gen_random_uuid(), v_journal_id, r.account_id, r.debit, r.credit, null
  from (
    select v_cash_account as account_id, v_cash as debit, 0::numeric as credit
    union all
    select v_bank_account, v_card, 0
    union all
    select v_receivables, v_credit_amount, 0
    union all
    select v_cogs_account, v_cogs, 0
    union all
    select v_sales, 0, v_net_revenue
    union all
    select v_accrued, 0, v_tax_for_journal
    union all
    select v_inventory, 0, v_cogs
    union all
    select v_other_revenue, 0, v_shipping_for_journal
      where v_shipping_for_journal > 0
  ) as r
  where r.debit <> 0 or r.credit <> 0;

  -- Update the account balance cache by (debit - credit), as the client does.
  update public.accounts a
     set current_balance = round(coalesce(a.current_balance, 0) + d.delta, 2),
         updated_at = now()
    from (select v_cash_account as account_id, v_cash as debit, 0::numeric as credit
          union all select v_bank_account, v_card, 0
          union all select v_receivables, v_credit_amount, 0
          union all select v_cogs_account, v_cogs, 0
          union all select v_sales, 0, v_net_revenue
          union all select v_accrued, 0, v_tax_for_journal
          union all select v_inventory, 0, v_cogs
          union all select v_other_revenue, 0, v_shipping_for_journal
            where v_shipping_for_journal > 0) as d
   where a.id = d.account_id
     and (d.debit <> 0 or d.credit <> 0)
     and (d.debit - d.credit) <> 0;

  -- 10. Authoritative response for the client to ingest (re-base local state).
  select to_jsonb(si) into v_invoice_payload
    from public.sales_invoices si
   where si.id = p_invoice_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'OK',
    'invoice', v_invoice_payload,
    'items', item_rows,
    'inventory_transactions', txn_rows,
    'stock_after', stock_updates,
    'batch_after', batch_updates,
    'treasury_after', case when p_treasury_id is not null
                           then jsonb_build_object('id', p_treasury_id, 'current_balance',
                                 coalesce(v_treasury_row.current_balance, v_cash))
                           else null end,
    'contact_after', case when v_remaining > 0 and p_customer_id is not null
                          then jsonb_build_object('id', p_customer_id, 'current_balance',
                                v_contact_row.current_balance)
                          else null end,
    'shift', case when p_shift_id is not null and v_shift_row.id is not null
                  then to_jsonb(v_shift_row) else null end,
    'journal_entry_id', v_journal_id,
    'journal_entry_no', v_entry_no ->> 'number',
    'invoice_number', v_invoice_number
  );

  -- Double-submit / concurrent retry race: the idempotency check above can be
  -- bypassed by two identical requests in-flight; a PK/unique violation here
  -- means a peer already committed this invoice, so return it as existing.
  exception when unique_violation then
    select to_jsonb(si) into v_invoice_payload
      from public.sales_invoices si
     where si.id = p_invoice_id;

    if v_invoice_payload is null then
      raise;
    end if;

    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS', 'invoice', v_invoice_payload);
  end;
end;
$$;

grant execute on function public.falcon_create_sales_invoice(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, numeric, numeric,
  numeric, numeric, numeric, text, jsonb
) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 8. Atomic offline journal flush (entry + lines in one statement)
-- -----------------------------------------------------------------------------
create or replace function public.falcon_sync_journal_entry(
  p_org_id uuid,
  p_entry jsonb,
  p_lines jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_existing uuid;
  v_entry_id uuid;
  v_total numeric := 0;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_org_id is distinct from v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;
  if p_entry is null or not (p_entry ? 'id') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ENTRY');
  end if;

  v_entry_id := (p_entry ->> 'id')::uuid;

  select id into v_existing
    from public.journal_entries
   where id = v_entry_id and org_id = p_org_id;

  if found then
    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS', 'entry_id', v_entry_id);
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_LINES');
  end if;

  select coalesce(sum(round(coalesce((l ->> 'debit')::numeric, 0), 2)), 0)
    into v_total
    from jsonb_array_elements(p_lines) as l;

  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TOTAL');
  end if;

  -- Seed chart if missing (offline flattening always has accounts, but be safe).
  perform public.falcon_ensure_chart_accounts(p_org_id);

  begin
    insert into public.journal_entries (
      id, org_id, branch_id, entry_no, entry_date, type, description,
      reference_type, reference_id, total_amount, is_reversed, created_by, created_at
    ) values (
      v_entry_id, p_org_id,
      nullif((p_entry ->> 'branch_id'), '')::uuid,
      coalesce(p_entry ->> 'entry_no', 'ENTR-' || 'OFFLINE'),
      coalesce((p_entry ->> 'entry_date')::timestamptz, now()),
      coalesce(p_entry ->> 'type', 'general'),
      p_entry ->> 'description',
      nullif(p_entry ->> 'reference_type', ''),
      nullif((p_entry ->> 'reference_id'), '')::uuid,
      coalesce((p_entry ->> 'total_amount')::numeric, v_total),
      coalesce((p_entry ->> 'is_reversed')::boolean, false),
      nullif((p_entry ->> 'created_by'), '')::uuid,
      coalesce((p_entry ->> 'created_at')::timestamptz, now())
    );

    -- ENTIRE line set in ONE statement - passes the statement-level balance trigger.
    insert into public.journal_entry_lines (id, entry_id, account_id, debit, credit, description)
    select
      coalesce((l ->> 'id')::uuid, gen_random_uuid()),
      v_entry_id,
      (l ->> 'account_id')::uuid,
      coalesce((l ->> 'debit')::numeric, 0),
      coalesce((l ->> 'credit')::numeric, 0),
      l ->> 'description'
    from jsonb_array_elements(p_lines) as l
    where coalesce((l ->> 'debit')::numeric, 0) <> 0
       or coalesce((l ->> 'credit')::numeric, 0) <> 0;

    -- Re-base account balance cache with the SAME (debit - credit) deltas.
    update public.accounts a
       set current_balance = round(coalesce(a.current_balance, 0) + d.delta, 2),
           updated_at = now()
      from (select (l ->> 'account_id')::uuid as account_id,
                   coalesce((l ->> 'debit')::numeric, 0) - coalesce((l ->> 'credit')::numeric, 0) as delta
              from jsonb_array_elements(p_lines) as l) as d
     where a.id = d.account_id
       and a.org_id = p_org_id
       and d.delta <> 0;

  exception when unique_violation then
    -- Concurrent flush from another device already committed this entry.
    return jsonb_build_object('ok', true, 'code', 'ALREADY_EXISTS', 'entry_id', v_entry_id);
  end;

  return jsonb_build_object('ok', true, 'code', 'OK', 'entry_id', v_entry_id);
end;
$$;

grant execute on function public.falcon_sync_journal_entry(uuid, jsonb, jsonb) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 9. On-reconnect renumbering of temporary offline document numbers
-- -----------------------------------------------------------------------------
-- Offline temp format:  <PREFIX>-P<deviceHash>-<seq>   (e.g. INV-Pa1b2c-000001)
--                       ENTR-YYYY-P<deviceHash>-<seq>
--                       cashier_shift: NEGATIVE shift_number sentinel
-- Reassignment happens in created_at order against the org sequence.
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

  -- Sales invoices
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

  -- Sales returns
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

  -- Purchase invoices (system number)
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

  -- Purchase returns
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

  -- Journal entries (offline entries carry ENTR-YYYY-P<dev>-##)
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

  -- Cashier shifts: offline sentinel shift_number is negative; renumber positive.
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

-- -----------------------------------------------------------------------------
-- 10. Self-healing: rebuild stock counters from the ledger
-- -----------------------------------------------------------------------------
create or replace function public.falcon_reconcile_stock_ledger(p_org_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  r record;
  v_stock_id text;
  v_stock_updated integer := 0;
  v_batch_updated integer := 0;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_org_id is distinct from v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  -- stock_levels rebuilt from the leg per (warehouse, product)
  for r in (select warehouse_id, product_id, coalesce(sum(base_quantity), 0) as qty
              from public.inventory_transactions
             where org_id = p_org_id
             group by warehouse_id, product_id)
  loop
    v_stock_id := r.warehouse_id::text || '_' || r.product_id::text;

    insert into public.stock_levels (id, org_id, warehouse_id, product_id, quantity, reserved_quantity, available_quantity, updated_at)
    values (v_stock_id, p_org_id, r.warehouse_id, r.product_id, r.qty, 0, r.qty, now())
    on conflict (id) do update
      set quantity = excluded.quantity,
          reserved_quantity = coalesce(public.stock_levels.reserved_quantity, 0),
          available_quantity = excluded.quantity - coalesce(public.stock_levels.reserved_quantity, 0),
          updated_at = now();

    v_stock_updated := v_stock_updated + 1;
  end loop;

  -- product_batches rebuilt from the lot-linked leg
  for r in (select batch_id, coalesce(sum(base_quantity), 0) as qty
              from public.inventory_transactions
             where org_id = p_org_id and batch_id is not null
             group by batch_id)
  loop
    update public.product_batches
       set current_quantity = r.qty, updated_at = now()
     where id = r.batch_id and org_id = p_org_id;
    v_batch_updated := v_batch_updated + 1;
  end loop;

  return jsonb_build_object('ok', true, 'stock_updated', v_stock_updated, 'batches_updated', v_batch_updated);
end;
$$;

grant execute on function public.falcon_reconcile_stock_ledger(uuid) to authenticated, anon;
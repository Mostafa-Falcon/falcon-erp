-- ═══════════════════════════════════════════════════════════════
-- 🦅 FALCON UNIVERSAL ERP — DEFERRED INSTALLMENTS & GUARANTORS MODULE SCHEMA
-- Cloud database tables for Installment Plans, Monthly Schedules,
-- and Guarantors with RLS policies and indexes.
-- Mirrors local Dexie tables (`installment_plans`, `installment_schedules`, `guarantors`).
-- ═══════════════════════════════════════════════════════════════

-- 1) Installment Plans Header
create table if not exists public.installment_plans (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  invoice_id uuid references public.sales_invoices(id) on delete set null,
  invoice_number text,
  customer_id uuid not null references public.contacts(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  plan_number text not null,
  total_invoice_amount numeric(15,4) not null default 0,
  down_payment numeric(15,4) not null default 0,
  financed_amount numeric(15,4) not null default 0,
  interest_rate_percent numeric(10,2) not null default 0,
  interest_amount numeric(15,4) not null default 0,
  total_financed_with_interest numeric(15,4) not null default 0,
  number_of_installments integer not null default 12,
  installment_frequency text not null default 'monthly'
    check (installment_frequency in ('monthly', 'weekly')),
  installment_amount numeric(15,4) not null default 0,
  start_date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'defaulted', 'cancelled')),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, plan_number)
);

create index if not exists idx_installment_plans_org on public.installment_plans(org_id, status);
create index if not exists idx_installment_plans_customer on public.installment_plans(customer_id);

-- 2) Installment Schedules (Monthly / Periodic Due Items)
create table if not exists public.installment_schedules (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.installment_plans(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(15,4) not null default 0,
  principal_amount numeric(15,4) not null default 0,
  interest_amount numeric(15,4) not null default 0,
  paid_amount numeric(15,4) not null default 0,
  remaining_amount numeric(15,4) not null default 0,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partially_paid', 'paid', 'overdue')),
  paid_at timestamptz,
  treasury_id uuid references public.treasuries(id) on delete set null,
  voucher_id uuid references public.financial_vouchers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_installment_schedules_plan on public.installment_schedules(plan_id, installment_number);
create index if not exists idx_installment_schedules_due on public.installment_schedules(due_date, status);

-- 3) Guarantors Ledger
create table if not exists public.guarantors (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.installment_plans(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.contacts(id) on delete set null,
  full_name text not null,
  national_id text not null,
  phone text not null,
  work_place text,
  relationship text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guarantors_plan on public.guarantors(plan_id);
create index if not exists idx_guarantors_national_id on public.guarantors(national_id);

-- 4) RLS Security Policies
alter table public.installment_plans enable row level security;
alter table public.installment_schedules enable row level security;
alter table public.guarantors enable row level security;

-- Updated timestamp triggers
drop trigger if exists trg_update_timestamp_installment_plans on public.installment_plans;
create trigger trg_update_timestamp_installment_plans
  before update on public.installment_plans
  for each row execute function public.update_timestamp_column();

drop trigger if exists trg_update_timestamp_installment_schedules on public.installment_schedules;
create trigger trg_update_timestamp_installment_schedules
  before update on public.installment_schedules
  for each row execute function public.update_timestamp_column();

drop trigger if exists trg_update_timestamp_guarantors on public.guarantors;
create trigger trg_update_timestamp_guarantors
  before update on public.guarantors
  for each row execute function public.update_timestamp_column();

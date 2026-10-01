-- ═══════════════════════════════════════════════════════════════
-- 🦅 FALCON UNIVERSAL ERP — MOBILE SHOPS & ELECTRONICS MODULE SCHEMA
-- Cloud database tables for IMEI & Serial tracking, Repair Maintenance Center,
-- Spare Parts, and Digital Wallets (Vodafone Cash, InstaPay, Fawry, Top-up).
-- Mirrors local Dexie tables (`product_serials`, `maintenance_tickets`,
-- `maintenance_ticket_items`, `digital_wallet_transactions`).
-- ═══════════════════════════════════════════════════════════════

-- 1) Product IMEI & Serial Numbers
create table if not exists public.product_serials (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text,
  serial_number text not null,
  imei2 text,
  condition text not null default 'new'
    check (condition in ('new', 'used', 'refurbished')),
  status text not null default 'in_stock'
    check (status in ('in_stock', 'sold', 'under_maintenance', 'returned', 'transferred', 'damaged')),
  cost_price numeric(15,4) not null default 0,
  selling_price numeric(15,4) not null default 0,
  warranty_months integer not null default 12,
  supplier_id uuid references public.contacts(id) on delete set null,
  customer_id uuid references public.contacts(id) on delete set null,
  purchase_invoice_id uuid references public.purchase_invoices(id) on delete set null,
  sale_invoice_id uuid references public.sales_invoices(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, serial_number)
);

create index if not exists idx_product_serials_org on public.product_serials(org_id, status);
create index if not exists idx_product_serials_product on public.product_serials(product_id);
create index if not exists idx_product_serials_number on public.product_serials(serial_number);

-- 2) Maintenance & Repair Job Cards
create table if not exists public.maintenance_tickets (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  ticket_number text not null,
  customer_id uuid references public.contacts(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  device_model text not null,
  imei_or_serial text,
  passcode_or_pattern text,
  problem_description text not null,
  accessories_received text,
  status text not null default 'received'
    check (status in ('received', 'diagnosing', 'waiting_approval', 'repairing', 'ready', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partially_paid', 'paid')),
  technician_id uuid references public.users(id) on delete set null,
  technician_name text,
  estimated_cost numeric(15,4) not null default 0,
  actual_parts_cost numeric(15,4) not null default 0,
  labor_fee numeric(15,4) not null default 0,
  discount_amount numeric(15,4) not null default 0,
  total_amount numeric(15,4) not null default 0,
  paid_amount numeric(15,4) not null default 0,
  remaining_amount numeric(15,4) not null default 0,
  treasury_id uuid references public.treasuries(id) on delete set null,
  notes text,
  received_at timestamptz not null default now(),
  ready_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ticket_number)
);

create index if not exists idx_maintenance_tickets_org on public.maintenance_tickets(org_id, status);
create index if not exists idx_maintenance_tickets_customer on public.maintenance_tickets(customer_id);

-- 3) Maintenance Ticket Spare Parts Line Items
create table if not exists public.maintenance_ticket_items (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_id uuid references public.units(id) on delete set null,
  conversion_factor numeric(10,4) not null default 1,
  quantity numeric(15,4) not null default 1,
  unit_price numeric(15,4) not null default 0,
  unit_cost numeric(15,4) not null default 0,
  total numeric(15,4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_maintenance_ticket_items_ticket on public.maintenance_ticket_items(ticket_id);

-- 4) Digital Wallet & Top-up Services
create table if not exists public.digital_wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  shift_id uuid references public.cashier_shifts(id) on delete set null,
  treasury_id uuid not null references public.treasuries(id) on delete restrict,
  service_type text not null,
  service_label text not null,
  phone_number text,
  amount numeric(15,4) not null default 0,
  commission_amount numeric(15,4) not null default 0,
  total_collected numeric(15,4) not null default 0,
  reference_number text,
  customer_id uuid references public.contacts(id) on delete set null,
  customer_name text,
  notes text,
  user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_digital_wallet_tx_org on public.digital_wallet_transactions(org_id);
create index if not exists idx_digital_wallet_tx_shift on public.digital_wallet_transactions(shift_id);

-- 5) RLS Security Policies for Organization Isolation
alter table public.product_serials enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.maintenance_ticket_items enable row level security;
alter table public.digital_wallet_transactions enable row level security;

-- Updated timestamp triggers
drop trigger if exists trg_update_timestamp_product_serials on public.product_serials;
create trigger trg_update_timestamp_product_serials
  before update on public.product_serials
  for each row execute function public.update_timestamp_column();

drop trigger if exists trg_update_timestamp_maintenance_tickets on public.maintenance_tickets;
create trigger trg_update_timestamp_maintenance_tickets
  before update on public.maintenance_tickets
  for each row execute function public.update_timestamp_column();

drop trigger if exists trg_update_timestamp_digital_wallet_transactions on public.digital_wallet_transactions;
create trigger trg_update_timestamp_digital_wallet_transactions
  before update on public.digital_wallet_transactions
  for each row execute function public.update_timestamp_column();

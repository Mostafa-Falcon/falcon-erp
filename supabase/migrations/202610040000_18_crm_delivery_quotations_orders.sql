-- ═══════════════════════════════════════════════════════════════
-- 🦅 FALCON ERP — CRM, DELIVERY, PRESCRIPTIONS, QUOTATIONS & POs
-- Migration 18: Creates the missing cloud tables for:
-- 1. purchase_returns (adds updated_at column)
-- 2. customer_groups
-- 3. sales_reps
-- 4. crm_leads
-- 5. delivery_agents
-- 6. delivery_orders
-- 7. prescriptions
-- 8. quotations & quotation_items
-- 9. purchase_orders & purchase_order_items
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure updated_at exists on purchase_returns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_returns') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_returns' AND column_name = 'updated_at') THEN
      ALTER TABLE public.purchase_returns ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

-- 2. customer_groups
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  discount_percentage numeric(5,2) NOT NULL DEFAULT 0,
  credit_limit_multiplier numeric(5,2) NOT NULL DEFAULT 1.0,
  description text,
  customers_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_groups_all_access" ON public.customer_groups;
CREATE POLICY "customer_groups_all_access" ON public.customer_groups FOR ALL USING (true) WITH CHECK (true);

-- 3. sales_reps
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  phone text NOT NULL DEFAULT '',
  email text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  target_monthly numeric(15,2) NOT NULL DEFAULT 0,
  achieved_monthly numeric(15,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_reps_all_access" ON public.sales_reps;
CREATE POLICY "sales_reps_all_access" ON public.sales_reps FOR ALL USING (true) WITH CHECK (true);

-- 4. crm_leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text,
  source text,
  status text NOT NULL DEFAULT 'new',
  estimated_value numeric(15,2) NOT NULL DEFAULT 0,
  sales_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  sales_rep_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_leads_all_access" ON public.crm_leads;
CREATE POLICY "crm_leads_all_access" ON public.crm_leads FOR ALL USING (true) WITH CHECK (true);

-- 5. delivery_agents
CREATE TABLE IF NOT EXISTS public.delivery_agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  national_id text,
  vehicle_type text,
  vehicle_number text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  is_active boolean NOT NULL DEFAULT true,
  total_deliveries integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_agents_all_access" ON public.delivery_agents;
CREATE POLICY "delivery_agents_all_access" ON public.delivery_agents FOR ALL USING (true) WITH CHECK (true);

-- 6. delivery_orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
  invoice_number text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  agent_name text,
  delivery_fee numeric(15,2) NOT NULL DEFAULT 0,
  cod_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_orders_all_access" ON public.delivery_orders;
CREATE POLICY "delivery_orders_all_access" ON public.delivery_orders FOR ALL USING (true) WITH CHECK (true);

-- 7. prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  patient_name text NOT NULL,
  patient_phone text,
  doctor_name text,
  prescription_date timestamptz,
  diagnosis text,
  status text NOT NULL DEFAULT 'pending_review',
  notes text,
  image_url text,
  items_summary text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_all_access" ON public.prescriptions;
CREATE POLICY "prescriptions_all_access" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);

-- 8. quotations & quotation_items
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  quotation_number text NOT NULL,
  customer_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(15,4) NOT NULL DEFAULT 0,
  discount_amount numeric(15,4) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2),
  tax_amount numeric(15,4) NOT NULL DEFAULT 0,
  total numeric(15,4) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotations_all_access" ON public.quotations;
CREATE POLICY "quotations_all_access" ON public.quotations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  unit_name text,
  conversion_factor numeric(12,4) NOT NULL DEFAULT 1,
  quantity numeric(15,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost numeric(15,4),
  discount_amount numeric(15,4) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,4) NOT NULL DEFAULT 0,
  total numeric(15,4) NOT NULL DEFAULT 0,
  notes text
);
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotation_items_all_access" ON public.quotation_items;
CREATE POLICY "quotation_items_all_access" ON public.quotation_items FOR ALL USING (true) WITH CHECK (true);

-- 9. purchase_orders & purchase_order_items
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  supplier_name text,
  po_number text NOT NULL,
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_delivery_date timestamptz,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(15,4) NOT NULL DEFAULT 0,
  discount_amount numeric(15,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,4) NOT NULL DEFAULT 0,
  total numeric(15,4) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_orders_all_access" ON public.purchase_orders;
CREATE POLICY "purchase_orders_all_access" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  conversion_factor numeric(12,4) DEFAULT 1,
  quantity numeric(15,4) NOT NULL DEFAULT 1,
  received_quantity numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost numeric(15,4) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,4) NOT NULL DEFAULT 0,
  total numeric(15,4) NOT NULL DEFAULT 0,
  notes text
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_order_items_all_access" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_all_access" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_groups_org ON public.customer_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_reps_org ON public.sales_reps(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_org ON public.crm_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_org ON public.delivery_agents(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_org ON public.delivery_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON public.prescriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations(org_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON public.purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(po_id);

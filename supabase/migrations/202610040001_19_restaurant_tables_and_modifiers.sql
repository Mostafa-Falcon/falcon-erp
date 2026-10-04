-- 19: Restaurant Tables, Dining Sections, and Order Modifiers
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    table_number TEXT NOT NULL,
    section_name TEXT DEFAULT 'الصالة الرئيسية',
    capacity INT DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'billing'
    current_invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    current_order_total NUMERIC DEFAULT 0,
    opened_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.order_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    type TEXT NOT NULL DEFAULT 'addon', -- 'size', 'addon', 'customization'
    price NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_org ON public.restaurant_tables(org_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_order_modifiers_org ON public.order_modifiers(org_id);
CREATE INDEX IF NOT EXISTS idx_order_modifiers_type ON public.order_modifiers(type);

-- RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_modifiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "restaurant_tables_org_isolation" ON public.restaurant_tables;
    CREATE POLICY "restaurant_tables_org_isolation" ON public.restaurant_tables
        FOR ALL USING (
            org_id IN (
                SELECT org_id FROM public.users WHERE id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "order_modifiers_org_isolation" ON public.order_modifiers;
    CREATE POLICY "order_modifiers_org_isolation" ON public.order_modifiers
        FOR ALL USING (
            org_id IN (
                SELECT org_id FROM public.users WHERE id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

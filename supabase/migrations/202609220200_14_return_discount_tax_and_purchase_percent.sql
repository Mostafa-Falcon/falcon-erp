-- =========================================================================
-- Falcon ERP - Purchase Invoice Discount Percent + Return Discount/Tax Columns
-- Migration: 202609220000_14_return_discount_tax_and_purchase_percent.sql
--
-- 1) purchase_invoices.discount_percent: mirrors sales_invoices so purchase
--    discounts can be recorded as a percentage (compute the EGP amount).
-- 2) sales_returns/purchase_returns.discount_amount + tax_amount: persist the
--    invoice-style discounts and optional tax applied to returns, keeping the
--    stored return total consistent across devices.
--
-- All additive and nullable; legacy rows keep NULL.
-- =========================================================================

ALTER TABLE public.purchase_invoices
ADD COLUMN IF NOT EXISTS discount_percent numeric;

ALTER TABLE public.sales_returns
ADD COLUMN IF NOT EXISTS discount_amount numeric,
ADD COLUMN IF NOT EXISTS tax_amount numeric;

ALTER TABLE public.purchase_returns
ADD COLUMN IF NOT EXISTS discount_amount numeric,
ADD COLUMN IF NOT EXISTS tax_amount numeric;
-- =========================================================================
-- Falcon ERP - Sales Invoice Shipping Fee Column
-- Migration: 202609220000_13_sales_invoices_shipping_fee.sql
--
-- The POS charges an optional delivery/shipping fee that is part of the
-- total the customer pays. It must persist on the invoice (and sync to the
-- cloud) so the saved invoice never totals less than the received cash, and
-- the GL entry can credit the OTHER_REVENUE (4900) account separately from
-- goods revenue.
--
-- Additive and nullable; existing invoices keep NULL (no shipping).
-- =========================================================================

ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS shipping_fee numeric;
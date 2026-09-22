-- =========================================================================
-- Falcon ERP - Inventory Unit-Levels Sync Columns (Level Names + Quantities)
-- Migration: 202609220000_12_inventory_unit_levels_sync_columns.sql
--
-- Ports the pharmacy_system unit-levels methodology (migrations 28/30/50/51)
-- to the remote schema, so owner-entered level names and per-level quantities
-- persist in the cloud and survive cross-device pulls.
--
-- All columns are additive and nullable; the client's Dexie transactions stay
-- the SINGLE SOURCE OF TRUTH for stock. NO stock-computing trigger is created
-- here (see pharmacy_system migration 96 lesson: client-computed stock must not
-- be double-counted server-side).
-- =========================================================================

-- 1. product_units: level display + silo carried by the level record
ALTER TABLE public.product_units
ADD COLUMN IF NOT EXISTS unit_name text,
ADD COLUMN IF NOT EXISTS level_order integer,
ADD COLUMN IF NOT EXISTS available_quantity numeric;

-- 2. product_batches: unit-level info recorded at batch entry
ALTER TABLE public.product_batches
ADD COLUMN IF NOT EXISTS unit_id uuid,
ADD COLUMN IF NOT EXISTS unit_name text,
ADD COLUMN IF NOT EXISTS level_quantity numeric;

-- 3. inventory_transactions: denormalized display snapshots + level quantity
--    (same intent as pharmacy migration 30 "denormalized names sync" and 51
--    "inventory_transaction_level_quantities"); expiry_date mirrors the
--    product_batches.expiry_date column type.
ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS unit_name text,
ADD COLUMN IF NOT EXISTS level_quantity numeric,
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS prev_quantity numeric,
ADD COLUMN IF NOT EXISTS new_quantity numeric,
ADD COLUMN IF NOT EXISTS reference_number text;
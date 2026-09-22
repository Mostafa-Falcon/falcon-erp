# ADR-002: Inventory Unit-Levels & Client-Side Stock Authority Sync

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Eng. Mostafa "Al-Saqr" (Logixa Systems)
- **Context Source:** pharmacy_system (Flutter + Drift + Supabase), migrations 28 / 30 / 50 / 51 / 61 / 62 / 96

## Context

The owner enters unit-level names per business domain (pharmacy: دواء/تشغيلة/صلاحية;
retail: صنف/دفعة/انتهاء). These names and the per-level quantities must be:

1. Saved with the owner's exact string on the item/level/batch records.
2. Displayed without JOINs (offline-first safety) — denormalized name snapshots.
3. Safe against the dual-write + pull-reconcile sync model so a cloud pull never
   wipes locally-enriched fields.

pharmacy_system learned the hard way (migration 96): a Postgres trigger that
computes stock caused double counting after PowerSync replication — the client
must be the single authority that computes and writes stock. Additionally,
per-level quantity silos (`unit1/2/3_quantity`) and denormalized `*_name`
columns are what make offline display and reporting correct.

## Decision

1. **Stock is client-computed and client-authoritative.** No server trigger and no
   server-side recomputation of `stock_levels` / `product_batches` quantities on
   write. Supabase is a mirror; the local Dexie transaction is the single
   source of truth for quantities (same lesson as pharmacy migration 96).

2. **Owner-entered level names are snapshotted at write time.** `ProductUnit`
   records carry `unit_name` (denormalized from `units`), `level_order`
   (1 = base unit, 2+ = secondary levels), and `available_quantity`
   (per-level silo). `ProductBatch` and `InventoryTransaction` carry optional
   `unit_name` / `level_quantity` plus display snapshots
   (`product_name`, `batch_number`, `expiry_date`, `prev_quantity`,
   `new_quantity`, `reference_number`).

3. **These fields are LOCAL-only for now** (not in the remote schema). They are
   stripped from cloud payloads by `sanitizePayloadForCloud` via
   `CLOUD_COLUMN_MAP` (sync_coordinator.ts), and preserved across cloud pulls
   by the shield mechanism in `mergeIntoLocal` (pull_sync_service.ts).

4. **Opening stock does not post GL entries** (mirrors pharmacy_system):
   valuation flows into P&L through COGS/stocktake, not through an opening entry.

## Remote Schema Roadmap (applied 2026-09-22)

Applied via migration `supabase/migrations/202609220000_12_inventory_unit_levels_sync_columns.sql`
(pushed to project `swsmmnuisefafzofezus`):

- Columns added (additive, nullable):
  - `product_units`: `unit_name (text)`, `level_order (integer)`, `available_quantity (numeric)`
  - `product_batches`: `unit_id (uuid)`, `unit_name (text)`, `level_quantity (numeric)`
  - `inventory_transactions`: `product_name (text)`, `unit_name (text)`,
    `level_quantity (numeric)`, `batch_number (text)`, `expiry_date (date)`,
    `prev_quantity (numeric)`, `new_quantity (numeric)`, `reference_number (text)`
- `CLOUD_COLUMN_MAP` (sync_coordinator.ts) now allows these on push; the
  `mergeIntoLocal` shield stays as a fallback so legacy cloud rows never wipe
  the local snapshots.
- No stock-computing trigger was created on the server (migration 96 lesson).

## Consequences

- Offline display of levels, batches and movement history is correct without
  lookup by id, exactly as in pharmacy_system.
- Cloud pull never drops owner-typed names (shield guarantees invariants).
- No backfill needed for existing local rows: `unit_name` falls back to the
  `units` table lookup at write time; display code prefers the snapshot and
  gracefully falls back to the join.
- Adding the remote columns later is additive and zero-risk.
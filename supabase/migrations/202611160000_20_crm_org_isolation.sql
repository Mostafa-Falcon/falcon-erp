-- =============================================================
-- 202611160000_20_crm_org_isolation.sql
-- Security fix: migration 202610040000_18 created the CRM/Delivery
-- tables with org-blind `USING (true)` policies. Any anonymous or
-- authenticated caller holding only the public publishable apikey
-- could read/modify every organization's data (confirmed live:
-- public read of customer_groups without any token).
--
-- This migration replaces the ten wide-open policies with
-- organization-scoped policies using the canonical helper
-- public.current_org_id() (same pattern as migration 05).
-- Child tables without org_id resolve through their parent.
-- =============================================================

-- 1) Direct org_id tables
drop policy if exists "customer_groups_all_access" on public.customer_groups;
create policy "customer_groups_org_isolation" on public.customer_groups
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "sales_reps_all_access" on public.sales_reps;
create policy "sales_reps_org_isolation" on public.sales_reps
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "crm_leads_all_access" on public.crm_leads;
create policy "crm_leads_org_isolation" on public.crm_leads
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "delivery_agents_all_access" on public.delivery_agents;
create policy "delivery_agents_org_isolation" on public.delivery_agents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "delivery_orders_all_access" on public.delivery_orders;
create policy "delivery_orders_org_isolation" on public.delivery_orders
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "prescriptions_all_access" on public.prescriptions;
create policy "prescriptions_org_isolation" on public.prescriptions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "quotations_all_access" on public.quotations;
create policy "quotations_org_isolation" on public.quotations
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "purchase_orders_all_access" on public.purchase_orders;
create policy "purchase_orders_org_isolation" on public.purchase_orders
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- 2) Child tables WITHOUT org_id: resolve through their parent document
drop policy if exists "quotation_items_all_access" on public.quotation_items;
create policy "quotation_items_org_isolation" on public.quotation_items
  for all using (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_id and q.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_id and q.org_id = public.current_org_id()
    )
  );

drop policy if exists "purchase_order_items_all_access" on public.purchase_order_items;
create policy "purchase_order_items_org_isolation" on public.purchase_order_items
  for all using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = po_id and po.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.purchase_orders po
      where po.id = po_id and po.org_id = public.current_org_id()
    )
  );

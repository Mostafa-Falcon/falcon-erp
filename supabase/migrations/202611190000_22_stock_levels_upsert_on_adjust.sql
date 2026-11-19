-- =============================================================
-- 202611190000_22_stock_levels_upsert_on_adjust.sql
-- Root-cause fix for offline-first stock_levels:
--   falcon_adjust_stock (migration 15) returned NOT_FOUND for any delta
--   applied to a stock_levels row that had never been pushed from the
--   creating device (the 2026-11-16 401 outage prevented many initial
--   rows from reaching Supabase). Result: every subsequent delta got
--   marked as a permanent rejection (dead letter), so quantity stayed
--   0 in cloud forever even though batches/transactions had been
--   re-synced later.
--
--   The function now upserts the missing row atomically
--   (INSERT ... ON CONFLICT DO NOTHING + SELECT ... FOR UPDATE) so
--   any delta lands against a row that always exists.
-- =============================================================

create or replace function public.falcon_adjust_stock(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_delta_quantity numeric default 0,
  p_delta_reserved numeric default 0,
  p_allow_negative boolean default false
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_id text := p_warehouse_id::text || '_' || p_product_id::text;
  v_row public.stock_levels%rowtype;
  v_qty numeric;
  v_res numeric;
  v_av numeric;
begin
  -- When invoked from the app, v_org comes from the auth/transport token.
  -- Direct SQL maintenance (pooler, postgres role) has no auth context;
  -- fall back to the warehouse's org so the operation stays consistent.
  if v_org is null then
    select org_id into v_org from public.warehouses where id = p_warehouse_id;
  end if;
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;

  -- Ensure the row exists (zero placeholder) so FOR UPDATE lock works even
  -- on previously-missing rows. Concurrent inserts are handled by DO NOTHING.
  insert into public.stock_levels (
    id, org_id, warehouse_id, product_id, quantity, reserved_quantity, available_quantity, updated_at
  ) values (
    v_id, v_org, p_warehouse_id, p_product_id, 0, 0, 0, now()
  )
  on conflict (id) do nothing;

  select * into v_row
    from public.stock_levels
   where id = v_id and org_id = v_org
   for update;

  v_qty := round(coalesce(v_row.quantity, 0) + p_delta_quantity, 4);
  v_res := round(coalesce(v_row.reserved_quantity, 0) + p_delta_reserved, 4);
  v_av  := round(v_qty - v_res, 4);

  if not p_allow_negative and (v_qty < 0 or v_av < 0) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_STOCK',
      'quantity', coalesce(v_row.quantity, 0),
      'available_quantity', coalesce(v_row.available_quantity, 0)
    );
  end if;

  update public.stock_levels
     set quantity = v_qty,
         reserved_quantity = v_res,
         available_quantity = v_av,
         updated_at = now()
   where id = v_id and org_id = v_org;

  return jsonb_build_object(
    'ok', true,
    'quantity', v_qty,
    'reserved_quantity', v_res,
    'available_quantity', v_av
  );
end;
$$;

grant execute on function public.falcon_adjust_stock(uuid, uuid, numeric, numeric, boolean) to authenticated, anon;
-- =============================================================
-- Migration 15: Atomic Counter Deltas (Falcon Concurrency Fix)
-- =============================================================
-- Problem: stock & money counters were pushed to Supabase as ABSOLUTE
-- values (read-modify-write on one device, then full-row upsert).
-- Under multi-device use this caused lost updates and overselling.
--
-- Fix: counters now converge through SERVER-SIDE ATOMIC DELTAS only.
--   - Clients enqueue DELTA amounts (commutative), never absolutes.
--   - Each RPC applies the delta inside a single row-locked statement,
--     enforces guards (e.g. stock cannot go negative) and returns the
--     authoritative new values the client re-baselines to.
--   - new counter ROW creation (insert of a brand-new id) intentionally
--     stays on the legacy absolute INSERT path: a brand-new row has no
--     prior writer, so there is nothing to race against.
--
-- Security: SECURITY INVOKER + RLS. `current_org_id()` scopes the row
-- so a caller can only adjust counters that belong to its own org.
-- =============================================================

-- Stock level counter (id = "<warehouse_id>_<product_id>").
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
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_delta_quantity = 0 and p_delta_reserved = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_DELTA');
  end if;

  -- Row lock serialises concurrent deltas from multiple devices.
  select * into v_row
    from public.stock_levels
   where id = v_id and org_id = v_org
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_qty := v_row.quantity + p_delta_quantity;
  v_res := coalesce(v_row.reserved_quantity, 0) + p_delta_reserved;
  v_av  := v_qty - v_res;

  if not p_allow_negative and (v_qty < 0 or v_av < 0) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_STOCK',
      'quantity', v_row.quantity,
      'available_quantity', v_row.available_quantity
    );
  end if;

  update public.stock_levels
     set quantity = v_qty,
         reserved_quantity = v_res,
         available_quantity = v_av,
         updated_at = now()
   where id = v_id;

  return jsonb_build_object(
    'ok', true,
    'quantity', v_qty,
    'reserved_quantity', v_res,
    'available_quantity', v_av
  );
end;
$$;

grant execute on function public.falcon_adjust_stock(uuid, uuid, numeric, numeric, boolean) to authenticated;

-- Product batch (lot) counter.
create or replace function public.falcon_adjust_batch(
  p_batch_id uuid,
  p_delta_current_quantity numeric default 0,
  p_allow_negative boolean default false
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_row public.product_batches%rowtype;
  v_qty numeric;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_delta_current_quantity = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_DELTA');
  end if;

  select * into v_row
    from public.product_batches
   where id = p_batch_id and org_id = v_org
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_qty := v_row.current_quantity + p_delta_current_quantity;

  if not p_allow_negative and v_qty < 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_STOCK',
      'current_quantity', v_row.current_quantity
    );
  end if;

  update public.product_batches
     set current_quantity = v_qty,
         updated_at = now()
   where id = p_batch_id;

  return jsonb_build_object('ok', true, 'current_quantity', v_qty);
end;
$$;

grant execute on function public.falcon_adjust_batch(uuid, numeric, boolean) to authenticated;

-- Treasury balance counter.
create or replace function public.falcon_adjust_treasury(
  p_treasury_id uuid,
  p_delta_balance numeric default 0
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_row public.treasuries%rowtype;
  v_bal numeric;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_delta_balance = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_DELTA');
  end if;

  select * into v_row
    from public.treasuries
   where id = p_treasury_id and org_id = v_org
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_bal := v_row.current_balance + p_delta_balance;

  update public.treasuries
     set current_balance = v_bal,
         updated_at = now()
   where id = p_treasury_id;

  return jsonb_build_object('ok', true, 'current_balance', v_bal);
end;
$$;

grant execute on function public.falcon_adjust_treasury(uuid, numeric) to authenticated;

-- Contact (customer / supplier) balance counter.
create or replace function public.falcon_adjust_contact(
  p_contact_id uuid,
  p_delta_balance numeric default 0
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_row public.contacts%rowtype;
  v_bal numeric;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_delta_balance = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_DELTA');
  end if;

  select * into v_row
    from public.contacts
   where id = p_contact_id and org_id = v_org
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_bal := v_row.current_balance + p_delta_balance;

  update public.contacts
     set current_balance = v_bal,
         updated_at = now()
   where id = p_contact_id;

  return jsonb_build_object('ok', true, 'current_balance', v_bal);
end;
$$;

grant execute on function public.falcon_adjust_contact(uuid, numeric) to authenticated;

-- Chart-of-accounts balance counter.
create or replace function public.falcon_adjust_account(
  p_account_id uuid,
  p_delta_balance numeric default 0
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid := public.current_org_id();
  v_row public.accounts%rowtype;
  v_bal numeric;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ORG');
  end if;
  if p_delta_balance = 0 then
    return jsonb_build_object('ok', false, 'code', 'EMPTY_DELTA');
  end if;

  select * into v_row
    from public.accounts
   where id = p_account_id and org_id = v_org
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_bal := v_row.current_balance + p_delta_balance;

  update public.accounts
     set current_balance = v_bal,
         updated_at = now()
   where id = p_account_id;

  return jsonb_build_object('ok', true, 'current_balance', v_bal);
end;
$$;

grant execute on function public.falcon_adjust_account(uuid, numeric) to authenticated;
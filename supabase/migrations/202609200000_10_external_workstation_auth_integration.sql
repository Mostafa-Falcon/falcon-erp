-- =========================================================================
-- Falcon ERP - External Workstation & Supabase Auth Sync Integration
-- Migration: 202609200000_10_external_workstation_auth_integration.sql
-- 
-- Integrates accounts created or modified externally via Logixa Workstation Hub
-- (D:\projects\work\Systems) or Supabase Dashboard.
-- 1. Auto-provisions ERP tenant tables for any valid auth.users account on first login.
-- 2. Validates credentials against both pin_code_hash and auth.users bcrypt password.
-- 3. Synchronizes account suspension (banned_until) instantly with public.users/organizations.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Enhanced falcon_authenticate_device function
CREATE OR REPLACE FUNCTION public.falcon_authenticate_device(
  p_identifier text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_id text;
  v_clean_pass text;
  v_user record;
  v_auth record;
  v_org record;
  v_branch record;
  v_wh_id uuid;
  v_tr_id uuid;
  v_pass_valid boolean := false;
BEGIN
  v_clean_id := lower(trim(p_identifier));
  v_clean_pass := trim(p_password);

  IF v_clean_id = '' OR v_clean_pass = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور'
    );
  END IF;

  -- 1. Search for user in public.users
  SELECT * INTO v_user
  FROM public.users
  WHERE lower(trim(email)) = v_clean_id OR lower(trim(username)) = v_clean_id
  LIMIT 1;

  -- 2. Lookup user in auth.users
  SELECT * INTO v_auth
  FROM auth.users
  WHERE lower(trim(email)) = v_clean_id
     OR id::text = v_clean_id
     OR (v_user.id IS NOT NULL AND id = v_user.id)
  LIMIT 1;

  -- Case A: User does NOT exist in public.users yet (created externally via Workstation Hub or Supabase Auth)
  IF v_user.id IS NULL THEN
    IF v_auth.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'بيانات الدخول غير صحيحة أو المستخدم غير موجود'
      );
    END IF;

    -- Check if suspended in auth
    IF v_auth.banned_until IS NOT NULL AND v_auth.banned_until > now() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'تم إيقاف هذا الحساب من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.'
      );
    END IF;

    -- Verify password against auth.users encrypted_password
    IF v_auth.encrypted_password IS NOT NULL AND v_auth.encrypted_password = extensions.crypt(v_clean_pass, v_auth.encrypted_password) THEN
      v_pass_valid := true;
    END IF;

    IF NOT v_pass_valid THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'كلمة المرور غير صحيحة. يرجى التحقق من كلمة المرور والمحاولة مجدداً.'
      );
    END IF;

    -- Auto-provision ERP tenant for this auth user
    DECLARE
      v_new_org_id uuid := COALESCE((v_auth.raw_user_meta_data->>'org_id')::uuid, v_auth.id);
      v_new_branch_id uuid := gen_random_uuid();
      v_new_name text := COALESCE(v_auth.raw_user_meta_data->>'name', v_auth.raw_user_meta_data->>'full_name', 'صاحب المنشأة');
      v_new_facility text := COALESCE(v_auth.raw_user_meta_data->>'facility_name', 'مؤسسة ' || v_new_name);
      v_new_role text := COALESCE(v_auth.raw_user_meta_data->>'role', (CASE WHEN v_auth.raw_user_meta_data->>'account_type' = 'employee' THEN 'cashier' ELSE 'owner' END));
      v_new_activity text := COALESCE(v_auth.raw_user_meta_data->>'activity_type', 'retail');
    BEGIN
      INSERT INTO public.organizations (id, name, currency, activity_type, transport_token, is_active, created_at, updated_at)
      VALUES (v_new_org_id, v_new_facility, 'EGP', v_new_activity, gen_random_uuid()::text, true, now(), now())
      ON CONFLICT (id) DO UPDATE SET 
        is_active = true,
        activity_type = COALESCE(public.organizations.activity_type, EXCLUDED.activity_type),
        updated_at = now();

      INSERT INTO public.branches (id, org_id, code, name, is_main, is_active, created_at, updated_at)
      VALUES (v_new_branch_id, v_new_org_id, 'BR-01', 'الفرع الرئيسي', true, true, now(), now())
      ON CONFLICT (id) DO NOTHING;

      v_wh_id := gen_random_uuid();
      INSERT INTO public.warehouses (id, org_id, branch_id, code, name, is_main, is_active, created_at, updated_at)
      VALUES (v_wh_id, v_new_org_id, v_new_branch_id, 'WH-01', 'المستودع الرئيسي', true, true, now(), now())
      ON CONFLICT (id) DO NOTHING;

      v_tr_id := gen_random_uuid();
      INSERT INTO public.treasuries (id, org_id, branch_id, name, account_code, type, current_balance, is_default, is_active, created_at, updated_at)
      VALUES (v_tr_id, v_new_org_id, v_new_branch_id, 'الخزينة الرئيسية', '1110', 'safe', 0, true, true, now(), now())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.users (id, org_id, branch_id, username, full_name, email, role, pin_code_hash, is_active, created_at, updated_at)
      VALUES (v_auth.id, v_new_org_id, v_new_branch_id, split_part(v_auth.email, '@', 1), v_new_name, v_auth.email, v_new_role, v_clean_pass, true, now(), now())
      ON CONFLICT (id) DO UPDATE SET 
        pin_code_hash = v_clean_pass,
        is_active = true,
        updated_at = now()
      RETURNING * INTO v_user;
    END;
  ELSE
    -- Case B: User exists in public.users
    -- Check suspension
    IF v_user.is_active = false OR (v_auth.id IS NOT NULL AND v_auth.banned_until IS NOT NULL AND v_auth.banned_until > now()) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'تم إيقاف هذا المستخدم من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.'
      );
    END IF;

    -- Verify password against pin_code_hash OR auth.users bcrypt
    IF v_user.pin_code_hash IS NOT NULL AND v_user.pin_code_hash = v_clean_pass THEN
      v_pass_valid := true;
    ELSIF v_auth.encrypted_password IS NOT NULL AND v_auth.encrypted_password = extensions.crypt(v_clean_pass, v_auth.encrypted_password) THEN
      v_pass_valid := true;
      -- Synchronize local PIN hash with newly updated cloud password
      UPDATE public.users 
      SET pin_code_hash = v_clean_pass, updated_at = now() 
      WHERE id = v_user.id;
      v_user.pin_code_hash := v_clean_pass;
    END IF;

    IF NOT v_pass_valid THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'كلمة المرور غير صحيحة. يرجى التحقق من كلمة المرور والمحاولة مجدداً.'
      );
    END IF;
  END IF;

  -- 3. Load active organization
  SELECT * INTO v_org
  FROM public.organizations
  WHERE id = v_user.org_id
  LIMIT 1;

  IF v_org.id IS NULL OR v_org.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'تم إيقاف حساب هذه المنشأة من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.'
    );
  END IF;

  -- Ensure transport token exists on organization
  IF v_org.transport_token IS NULL OR v_org.transport_token = '' THEN
    UPDATE public.organizations
    SET transport_token = gen_random_uuid()::text, updated_at = now()
    WHERE id = v_org.id
    RETURNING * INTO v_org;
  END IF;

  -- 4. Load the user's branch or main branch
  SELECT * INTO v_branch
  FROM public.branches
  WHERE org_id = v_org.id
    AND (id = v_user.branch_id OR is_main = true)
    AND is_active = true
  ORDER BY (CASE WHEN id = v_user.branch_id THEN 0 WHEN is_main THEN 1 ELSE 2 END)
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'user', to_jsonb(v_user),
    'organization', to_jsonb(v_org),
    'branch', CASE WHEN v_branch.id IS NOT NULL THEN to_jsonb(v_branch) ELSE null END,
    'transport_token', v_org.transport_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.falcon_authenticate_device(text, text) TO anon, authenticated, service_role;

-- 2. Trigger function to synchronize Workstation Hub actions (ban, unban, delete)
CREATE OR REPLACE FUNCTION public.sync_auth_user_status_to_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_active boolean;
  v_user_role text;
  v_org_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_is_active := (NEW.banned_until IS NULL OR NEW.banned_until <= now());

    SELECT role, org_id INTO v_user_role, v_org_id
    FROM public.users
    WHERE id = NEW.id;

    IF v_user_role IS NOT NULL THEN
      UPDATE public.users
      SET is_active = v_is_active, updated_at = now()
      WHERE id = NEW.id;

      -- If owner or business_owner, also toggle organization and its users
      IF v_user_role IN ('owner', 'super_admin') OR NEW.raw_user_meta_data->>'account_type' = 'business_owner' THEN
        IF v_org_id IS NOT NULL THEN
          UPDATE public.organizations
          SET is_active = v_is_active, updated_at = now()
          WHERE id = v_org_id;

          UPDATE public.users
          SET is_active = v_is_active, updated_at = now()
          WHERE org_id = v_org_id;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user_status ON auth.users;
CREATE TRIGGER trg_sync_auth_user_status
AFTER UPDATE OF banned_until OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_status_to_public();

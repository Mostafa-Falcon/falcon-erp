-- =========================================================================
-- Falcon ERP - Organization Subscription Tiers & Logixa Licensing
-- Migration: 202609200100_11_subscription_tiers.sql
--
-- Supports external subscription management via Logixa Control Panel (D:\projects\work\Systems).
--
-- Supported subscription_tier values:
-- 1. 'vip_gold'   -> VIP Gold (VIP جولد - ذهبي 👑)
-- 2. 'vip_silver' -> VIP Silver (VIP سيلفر - فضي 🥈)
-- 3. 'vip_bronze' -> VIP Bronze (VIP برونز - برونزي 🥉)
-- 4. 'standard'   -> Standard / Regular Business Owner Plan (اشتراك قياسي 🏢)
-- =========================================================================

-- 1. Add subscription columns to public.organizations if not present
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- 2. Update existing null tiers to 'standard'
UPDATE public.organizations
SET subscription_tier = 'standard'
WHERE subscription_tier IS NULL;

-- 3. Helper RPC for Logixa Control Panel to update an organization's subscription tier
CREATE OR REPLACE FUNCTION public.logixa_update_organization_subscription(
  p_org_id uuid,
  p_subscription_tier text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text := lower(trim(p_subscription_tier));
  v_updated record;
BEGIN
  IF v_tier NOT IN ('standard', 'vip_bronze', 'vip_silver', 'vip_gold') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'نوع الباقة غير صحيح. الباقات المتاحة: standard, vip_bronze, vip_silver, vip_gold'
    );
  END IF;

  UPDATE public.organizations
  SET
    subscription_tier = v_tier,
    subscription_expires_at = p_expires_at,
    updated_at = now()
  WHERE id = p_org_id
  RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'المنشأة غير موجودة'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث ترقية اشتراك المنشأة بنجاح',
    'organization', to_jsonb(v_updated)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.logixa_update_organization_subscription(uuid, text, timestamptz) TO service_role, authenticated, anon;

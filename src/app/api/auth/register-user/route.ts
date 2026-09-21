import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const {
      email,
      password,
      fullName,
      orgId,
      orgName,
      activityType = 'retail',
      transportToken,
      branchId,
      warehouseId,
      treasuryId,
      userId,
      role = 'super_admin',
    } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanFullName = fullName?.trim() || 'مدير النظام';
    const now = new Date().toISOString();
    const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabaseAdmin = createAdminClient();

    // 1. Create or update user in Supabase auth.users directly via admin API
    let authUserId: string | null = null;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        org_id: orgId || '',
        role: role,
        account_type: 'business_owner',
        activity_type: activityType,
        subscription_tier: 'trial',
      },
    });

    if (authError) {
      // If user already exists in auth.users, update the password to ensure consistency
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          authUserId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              full_name: cleanFullName,
              org_id: orgId || '',
              role: role,
              account_type: 'business_owner',
              activity_type: activityType,
              subscription_tier: 'trial',
            },
          });
        }
      } else {
        console.warn('[register-user] auth.admin.createUser error:', authError.message);
      }
    } else if (authData?.user) {
      authUserId = authData.user.id;
    }

    // 2. Populate public.organizations if orgId is provided (Default: 7-Day Trial)
    if (orgId) {
      const { error: orgErr } = await supabaseAdmin.from('organizations').upsert(
        {
          id: orgId,
          name: orgName || `مؤسسة ${cleanFullName}`,
          currency: 'EGP',
          activity_type: activityType,
          subscription_tier: 'trial',
          subscription_expires_at: trialExpiresAt,
          transport_token: transportToken || '',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
      if (orgErr) {
        console.error('[register-user] organization upsert error:', orgErr.message);
      }

      // 3. Populate public.branches
      if (branchId) {
        const { error: branchErr } = await supabaseAdmin.from('branches').upsert(
          {
            id: branchId,
            org_id: orgId,
            code: 'BR-01',
            name: 'الفرع الرئيسي',
            is_main: true,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
        if (branchErr) {
          console.error('[register-user] branch upsert error:', branchErr.message);
        }
      }

      // 4. Populate public.warehouses
      if (warehouseId && branchId) {
        const { error: whErr } = await supabaseAdmin.from('warehouses').upsert(
          {
            id: warehouseId,
            org_id: orgId,
            branch_id: branchId,
            code: 'WH-01',
            name: 'المستودع الرئيسي',
            is_main: true,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
        if (whErr) {
          console.error('[register-user] warehouse upsert error:', whErr.message);
        }
      }

      // 5. Populate public.treasuries
      if (treasuryId && branchId) {
        const { error: trErr } = await supabaseAdmin.from('treasuries').upsert(
          {
            id: treasuryId,
            org_id: orgId,
            branch_id: branchId,
            name: 'الخزينة الرئيسية',
            account_code: '1110',
            type: 'safe',
            current_balance: 0,
            is_default: true,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
        if (trErr) {
          console.error('[register-user] treasury upsert error:', trErr.message);
        }
      }

      // 6. Populate public.users
      const finalUserId = userId || authUserId || crypto.randomUUID();
      const { error: userErr } = await supabaseAdmin.from('users').upsert(
        {
          id: finalUserId,
          org_id: orgId,
          branch_id: branchId || orgId,
          username: cleanEmail.split('@')[0] || 'admin',
          full_name: cleanFullName,
          email: cleanEmail,
          role: role,
          pin_code_hash: cleanPassword,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
      if (userErr) {
        console.error('[register-user] user upsert error:', userErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      authUserId,
      message: 'User and organization successfully provisioned in cloud.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[register-user] fatal error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

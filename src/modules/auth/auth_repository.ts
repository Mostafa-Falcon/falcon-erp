import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured, setOrgTransportToken, restoreOrgTransportToken } from '@/core/supabase/supabase_client';
import { networkListener } from '@/core/sync/network_listener';
import { PullSyncService } from '@/core/sync/pull_sync_service';
import { syncCoordinator } from '@/core/sync/sync_coordinator';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import type { User, Organization, Branch } from '@/types';

export class AuthRepository {
  private static readonly SESSION_STORAGE_KEY = 'falcon_erp_active_user';

  /**
   * Fast offline login via PIN Code (crucial for retail & cashiers)
   * with multi-device cloud fallback if the device is not yet seeded.
   */
  public static async loginWithPin(pin: string): Promise<User | null> {
    const cleanPin = pin.trim();

    // 1. Fast local Dexie check
    const user = await db.users
      .filter((u) => u.pin_code_hash === cleanPin && Boolean(u.is_active))
      .first();

    if (user) {
      // 1. Verify that organization and user are active
      const org = await db.organizations.get(user.org_id);
      if (org && org.is_active === false) {
        throw new Error('تم إيقاف حساب هذه المنشأة من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.');
      }
      if (user.is_active === false) {
        throw new Error('تم إيقاف هذا المستخدم من قبل إدارة المنظومة.');
      }

      await restoreOrgTransportToken();
      this.saveSession(user);

      if (networkListener.getStatus() && isSupabaseConfigured()) {
        const aligned = await this.syncDeviceCloudContext(user.email || user.username, cleanPin, user);
        if (aligned) {
          return aligned;
        }
      }

      return user;
    }

    // 2. Multi-device cloud lookup if device is online and not yet seeded
    if (networkListener.getStatus() && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('falcon_authenticate_device', {
          p_identifier: cleanPin,
          p_password: cleanPin,
        });

        if (!error && data?.success && data.user) {
          await this.bootstrapDeviceFromCloud(
            data.user,
            data.organization,
            data.branch,
            data.transport_token,
            cleanPin
          );

          this.saveSession(data.user);
          if (data.user.email) {
            this.establishAuthSession(data.user.email, cleanPin).catch(() => {});
          }
          return data.user;
        }
      } catch (err) {
        console.warn('[AuthRepository] Cloud PIN login failed:', err);
      }
    }

    return null;
  }

  /**
   * يربط الجهاز بجلسة Supabase Auth حقيقية (JWT يحمل user_metadata.org_id)
   * حتى تمر أحداث Realtime من فلتر RLS وتصل للأجهزة الأخرى فوراً.
   */
  /**
   * يُحدّث هوية الجهاز على السحابة بعد كل نجاح دخول (حتى المحلي):
   * 1) يستدعي falcon_authenticate_device للحصول على المنظمة + transport_token الرسميين.
   * 2) يخزن التوكن الرسمي محلياً (localStorage + Dexie) ليُستخدم في REST RLS.
   * 3) يزامن المستخدم/المنظمة/الفرع محلياً مع المصدر الموثوق.
   * 4) يبني جلسة Supabase Auth (JWT حامل org_id) كي يمرر Realtime.
   * 5) يسحب كامل بيانات المنظمة في الخلفية.
   */
  private static async syncDeviceCloudContext(
    identifier: string,
    password: string,
    localUser: User
  ): Promise<User | null> {
    if (!networkListener.getStatus() || !isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('falcon_authenticate_device', {
        p_identifier: identifier.trim().toLowerCase() || localUser.email?.toLowerCase() || '',
        p_password: password,
      });

      if (error || !data?.success || !data.user) {
        console.warn('[AuthRepository] Cloud context refresh failed:', error?.message);
        this.establishAuthSession(identifier, password).catch(() => {});
        PullSyncService.pullAll(localUser.org_id).catch(() => {});
        return null;
      }

      // التوكن الرسمي للمنظمة (نفسه لكل أجهزة المنشأة)
      if (data.transport_token) {
        setOrgTransportToken(data.transport_token);
      }

      const cloudOrgId = (data.organization?.id as string) || data.user.org_id;
      const alignedUser: User = {
        ...localUser,
        id: data.user.id,
        org_id: cloudOrgId,
        branch_id: data.user.branch_id || data.branch?.id || localUser.branch_id,
        username: data.user.username || localUser.username,
        full_name: data.user.full_name || localUser.full_name,
        email: data.user.email || localUser.email,
        role: data.user.role || localUser.role,
      };

      await this.bootstrapDeviceFromCloud(
        alignedUser,
        data.organization as Organization,
        data.branch as Branch,
        data.transport_token,
        password
      );

      this.saveSession(alignedUser);
      this.establishAuthSession(data.user.email, password).catch(() => {});
      PullSyncService.pullAll(cloudOrgId).catch((err) => {
        console.warn('[AuthRepository] Post-login pull failed:', err);
      });

      return alignedUser;
    } catch (err) {
      console.warn('[AuthRepository] Cloud context refresh error:', err);
      PullSyncService.pullAll(localUser.org_id).catch(() => {});
      return null;
    }
  }

  private static async establishAuthSession(identifier: string, password: string): Promise<void> {
    const targetEmail = identifier.trim().toLowerCase();
    if (!networkListener.getStatus() || !isSupabaseConfigured() || !targetEmail.includes('@')) {
      return;
    }

    try {
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session?.user?.email?.toLowerCase() === targetEmail) {
        await this.ensureOrgInAuthMetadata(existing.session.user, password);
        return;
      }

      await supabase.auth.signOut().catch(() => {});
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error || !data.session?.user) {
        console.warn('[AuthRepository] Supabase session establish failed:', error?.message);
        return;
      }

      await this.ensureOrgInAuthMetadata(data.session.user, password);
    } catch (err) {
      console.warn('[AuthRepository] Supabase session establish error:', err);
    }
  }

  /**
   * يضمن وجود org_id في user_metadata ليرتبط JWT بالمؤسسة (مهم لحسابات قديمة
   * أُنشئت قبل إضافة التعريف، أو لحسابات غير متطابقة المعرفات مع public.users).
   */
  private static async ensureOrgInAuthMetadata(
    authUser: { email?: string | null; user_metadata?: Record<string, unknown> },
    password?: string
  ): Promise<void> {
    if (!authUser?.email) return;
    const currentUser = this.getCurrentUser();
    if (!currentUser?.org_id) return;

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const orgOk = meta.org_id === currentUser.org_id;
    const nameOk = meta.full_name === currentUser.full_name;

    if (orgOk && nameOk) return;

    try {
      const res = await fetch('/api/auth/provision-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ensure',
          email: authUser.email,
          orgId: currentUser.org_id,
          fullName: currentUser.full_name,
          role: currentUser.role,
        }),
      });
      if (res.ok && password) {
        // إعادة إنشاء الجلسة ليتحدث JWT ويحمل org_id الجديد فوراً
        await supabase.auth.signOut().catch(() => {});
        await supabase.auth
          .signInWithPassword({ email: authUser.email!, password })
          .catch((err: unknown) => console.warn('[AuthRepository] Session reissue after metadata update failed:', err));
      }
    } catch (err) {
      console.warn('[AuthRepository] Ensure org metadata failed:', err);
    }
  }

  /**
   * Hybrid authentication: local Dexie fast check + multi-device cloud RPC
   */
  public static async loginWithEmail(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    const cleanIdentifier = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Check local Dexie first (offline-first architecture)
      const localUser = await db.users
        .filter((u) => (
          (u.username.toLowerCase() === cleanIdentifier || u.email?.toLowerCase() === cleanIdentifier) &&
          Boolean(u.is_active)
        ))
        .first();

      // If user exists locally and password/PIN matches local record
      if (localUser && localUser.pin_code_hash === cleanPassword) {
        const org = await db.organizations.get(localUser.org_id);
        if (org && org.is_active === false) {
          return { user: null, error: 'تم إيقاف حساب هذه المنشأة من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.' };
        }
        if (localUser.is_active === false) {
          return { user: null, error: 'تم إيقاف هذا المستخدم من قبل إدارة المنظومة.' };
        }

        await restoreOrgTransportToken();
        this.saveSession(localUser);

        // If online, capture authoritative org/token and pull updates from other devices
        if (networkListener.getStatus() && isSupabaseConfigured()) {
          const aligned = await this.syncDeviceCloudContext(cleanIdentifier, cleanPassword, localUser);
          if (aligned) {
            return { user: aligned };
          }
        }

        return { user: localUser };
      }

      // Check if user was deactivated locally
      const inactiveUser = await db.users
        .filter((u) => (
          (u.username.toLowerCase() === cleanIdentifier || u.email?.toLowerCase() === cleanIdentifier) &&
          !u.is_active
        ))
        .first();
      if (inactiveUser && inactiveUser.pin_code_hash === cleanPassword) {
        return { user: null, error: 'تم إيقاف هذا المستخدم من قبل إدارة المنظومة.' };
      }

      // 2. Multi-device cloud login: query falcon_authenticate_device RPC or fallback to Supabase Auth
      if (networkListener.getStatus() && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.rpc('falcon_authenticate_device', {
            p_identifier: cleanIdentifier,
            p_password: cleanPassword,
          });

          if (!error && data?.success && data.user) {
            await this.bootstrapDeviceFromCloud(
              data.user,
              data.organization,
              data.branch,
              data.transport_token,
              cleanPassword
            );

            this.saveSession(data.user);
            this.establishAuthSession(data.user.email || cleanIdentifier, cleanPassword).catch(() => {});
            return { user: data.user };
          } else if (data && !data.success && data.error && !data.error.includes('غير موجود') && !data.error.includes('كلمة المرور غير صحيحة')) {
            // E.g. account suspension or organization inactive error
            return { user: null, error: data.error };
          }
        } catch (cloudErr) {
          console.warn('[AuthRepository] Cloud authentication error:', cloudErr);
        }

        // External/Workstation Hub fallback: Authenticate via Supabase Auth
        // Handles users created from Logixa Workstation Hub or whose passwords were changed externally
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanIdentifier,
            password: cleanPassword,
          });

          if (authError) {
            if (authError.message.toLowerCase().includes('banned') || authError.message.toLowerCase().includes('disabled')) {
              return { user: null, error: 'تم إيقاف هذا الحساب من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.' };
            }
          } else if (authData?.user) {
            const authUser = authData.user;

            // Check if user is suspended in auth.users
            if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
              await supabase.auth.signOut().catch(() => {});
              return { user: null, error: 'تم إيقاف هذا الحساب من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.' };
            }

            // Check if user exists in public.users
            const { data: cloudUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();

            if (cloudUser) {
              if (cloudUser.is_active === false) {
                await supabase.auth.signOut().catch(() => {});
                return { user: null, error: 'تم إيقاف هذا المستخدم من قبل إدارة المنظومة.' };
              }

              const { data: cloudOrg } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', cloudUser.org_id)
                .maybeSingle();

              if (cloudOrg && cloudOrg.is_active === false) {
                await supabase.auth.signOut().catch(() => {});
                return { user: null, error: 'تم إيقاف حساب هذه المنشأة من قبل إدارة المنظومة. يرجى مراجعة الدعم الفني.' };
              }

              // Update password/PIN hash in public.users if changed from Workstation Hub
              if (cloudUser.pin_code_hash !== cleanPassword) {
                await supabase
                  .from('users')
                  .update({ pin_code_hash: cleanPassword, updated_at: new Date().toISOString() })
                  .eq('id', cloudUser.id);
                cloudUser.pin_code_hash = cleanPassword;
              }

              let branch: Branch | null = null;
              if (cloudUser.branch_id) {
                const { data: branchData } = await supabase
                  .from('branches')
                  .select('*')
                  .eq('id', cloudUser.branch_id)
                  .maybeSingle();
                branch = branchData;
              }
              if (!branch) {
                const { data: mainBranch } = await supabase
                  .from('branches')
                  .select('*')
                  .eq('org_id', cloudUser.org_id)
                  .eq('is_main', true)
                  .maybeSingle();
                branch = mainBranch;
              }

              await this.bootstrapDeviceFromCloud(
                cloudUser,
                cloudOrg,
                branch,
                cloudOrg?.transport_token || '',
                cleanPassword
              );

              this.saveSession(cloudUser);
              this.ensureOrgInAuthMetadata(authUser, cleanPassword).catch(() => {});
              PullSyncService.pullAll(cloudUser.org_id).catch(() => {});
              return { user: cloudUser };
            } else {
              // User was created directly in Supabase Auth (e.g. from Logixa Workstation Hub)
              // Auto-provision ERP organization and initial branches/warehouses/treasury
              const targetOrgId = authUser.user_metadata?.org_id || crypto.randomUUID();
              const targetBranchId = crypto.randomUUID();
              const targetWarehouseId = crypto.randomUUID();
              const targetTreasuryId = crypto.randomUUID();
              const targetTransportToken = crypto.randomUUID();
              const rawName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'صاحب المنشأة';
              const facilityName = authUser.user_metadata?.facility_name || `مؤسسة ${rawName}`;
              const role = authUser.user_metadata?.role || (authUser.user_metadata?.account_type === 'employee' ? 'cashier' : 'owner');
              const activityType = authUser.user_metadata?.activity_type || 'retail';

              const regResponse = await fetch('/api/auth/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: cleanIdentifier,
                  password: cleanPassword,
                  fullName: rawName,
                  orgId: targetOrgId,
                  orgName: facilityName,
                  activityType,
                  transportToken: targetTransportToken,
                  branchId: targetBranchId,
                  warehouseId: targetWarehouseId,
                  treasuryId: targetTreasuryId,
                  userId: authUser.id,
                  role,
                }),
              });

              if (regResponse.ok) {
                await this.ensureOrgInAuthMetadata(authUser, cleanPassword).catch(() => {});

                const { data: postBootData } = await supabase.rpc('falcon_authenticate_device', {
                  p_identifier: cleanIdentifier,
                  p_password: cleanPassword,
                });

                if (postBootData?.success && postBootData.user) {
                  await this.bootstrapDeviceFromCloud(
                    postBootData.user,
                    postBootData.organization,
                    postBootData.branch,
                    postBootData.transport_token,
                    cleanPassword
                  );

                  this.saveSession(postBootData.user);
                  PullSyncService.pullAll(postBootData.user.org_id).catch(() => {});
                  return { user: postBootData.user };
                }
              }
            }
          }
        } catch (fallbackErr) {
          console.warn('[AuthRepository] Fallback auth failed:', fallbackErr);
        }
      }

      // 3. Informative, precise error reporting
      if (localUser) {
        return { user: null, error: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور والمحاولة مجدداً.' };
      }

      return { user: null, error: 'بيانات الدخول غير صحيحة أو المستخدم غير موجود. إذا كانت هذه أول مرة، يرجى إنشاء حساب منشأة جديد.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة تسجيل الدخول.';
      return { user: null, error: msg };
    }
  }

  /**
   * Initializes a brand-new device with the organization's cloud profile,
   * configures RLS transport headers, and seeds local Dexie for offline readiness.
   */
  private static async bootstrapDeviceFromCloud(
    cloudUser: User,
    cloudOrg: Organization | null,
    cloudBranch: Branch | null,
    transportToken: string,
    cleanPassword?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Activate transport token on client immediately for all cloud requests
    if (transportToken) {
      setOrgTransportToken(transportToken);
    }

    // 2. Clear local Dexie database if logging into a different organization to prevent data leaks
    const currentStoredUser = this.getCurrentUser();
    if (currentStoredUser && currentStoredUser.org_id !== cloudUser.org_id) {
      try {
        await Promise.all(db.tables.map((table) => table.clear()));
      } catch (err) {
        console.warn('[AuthRepository] Failed to purge old org local data:', err);
      }
    }

    // 3. Persist organization, branch, user, and transport setting in local Dexie
    await db.transaction(
      'rw',
      [db.organizations, db.branches, db.users, db.app_settings],
      async () => {
        if (cloudOrg) {
          await db.organizations.put({
            id: cloudOrg.id,
            name: cloudOrg.name,
            activity_type: cloudOrg.activity_type || 'retail',
            subscription_tier: cloudOrg.subscription_tier || 'standard',
            subscription_expires_at: cloudOrg.subscription_expires_at || null,
            currency: cloudOrg.currency || 'EGP',
            transport_token: transportToken,
            is_active: cloudOrg.is_active !== undefined ? cloudOrg.is_active : true,
            created_at: cloudOrg.created_at || now,
            updated_at: cloudOrg.updated_at || now,
            sync_status: 'synced',
          });
        }

        if (cloudBranch) {
          await db.branches.put({
            id: cloudBranch.id,
            org_id: cloudBranch.org_id || cloudUser.org_id,
            code: cloudBranch.code || 'BR-01',
            name: cloudBranch.name || 'الفرع الرئيسي',
            is_main: cloudBranch.is_main ?? true,
            is_active: true,
            created_at: cloudBranch.created_at || now,
            updated_at: cloudBranch.updated_at || now,
            sync_status: 'synced',
          });
        }

        if (transportToken) {
          await db.app_settings.put({
            id: 'org_transport_token',
            org_id: cloudUser.org_id,
            value: transportToken,
            description: 'Organization transport token for multi-device RLS authorization.',
            updated_at: now,
            sync_status: 'synced',
          });
        }

        await db.users.put({
          id: cloudUser.id,
          org_id: cloudUser.org_id,
          branch_id: cloudUser.branch_id || cloudBranch?.id,
          username: cloudUser.username,
          full_name: cloudUser.full_name,
          email: cloudUser.email,
          role: cloudUser.role,
          pin_code_hash: cleanPassword || cloudUser.pin_code_hash, // cached locally for subsequent offline logins
          is_active: true,
          created_at: cloudUser.created_at || now,
          updated_at: cloudUser.updated_at || now,
          sync_status: 'synced',
        });
      }
    );

    // 4. Await complete pull sync for all organizational data (products, invoices, categories, etc.)
    try {
      await PullSyncService.pullAll(cloudUser.org_id);
    } catch (err) {
      console.warn('[AuthRepository] Initial multi-device background pull failed:', err);
    }
  }

  public static saveSession(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(user));
      document.cookie = 'falcon_session_active=1; path=/; max-age=2592000; SameSite=Lax';
    }
  }

  public static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static async logout(): Promise<void> {
    // 1. المزامنة الفورية اللحظية لكافة الطوابير المعلقة قبل الخروج
    try {
      if (networkListener.getStatus() && isSupabaseConfigured()) {
        await Promise.race([
          syncCoordinator.triggerSync(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }
    } catch (err) {
      console.warn('[AuthRepository] Pre-logout sync error:', err);
    }

    // 2. تفريغ وتنظيف كافة جداول التخزين المحلي Dexie لحماية البيانات ومنع التداخل بين الحسابات
    try {
      await Promise.all(db.tables.map((table) => table.clear()));
    } catch (err) {
      console.warn('[AuthRepository] Dexie database clear error:', err);
    }

    // 3. حذف الجلسة والملفات المؤقتة والتسجيل السحابي
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
      localStorage.removeItem('falcon_active_branch_id');
      document.cookie = 'falcon_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }

    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
  }

  /**
   * Updates owner or current user profile information and optional password.
   * Email is strictly protected and immutable as per security guidelines.
   */
  public static async updateOwnerProfile(params: {
    userId: string;
    fullName: string;
    username: string;
    phone?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const user = await db.users.get(params.userId);
    if (!user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    const now = new Date().toISOString();
    const updatedUser: User = {
      ...user,
      full_name: params.fullName.trim(),
      username: params.username.trim(),
      phone: params.phone?.trim() || undefined,
      pin_code_hash: params.newPassword ? params.newPassword.trim() : user.pin_code_hash,
      updated_at: now,
      sync_status: 'pending',
    };

    // 1. Update in local Dexie and enqueue sync for public.users
    await db.transaction('rw', [db.users, db.sync_queue], async () => {
      await db.users.put(updatedUser);
      await SyncQueueManager.enqueue('users', user.id, 'update', updatedUser);
    });

    // 2. Update session in local storage
    this.saveSession(updatedUser);

    // 3. If password changed and online, update auth.users on Supabase for multi-device sync
    if (params.newPassword && user.email) {
      try {
        await fetch('/api/auth/provision-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ensure',
            email: user.email,
            password: params.newPassword.trim(),
            fullName: updatedUser.full_name,
            orgId: updatedUser.org_id,
            role: updatedUser.role,
          }),
        });

        // Also update client session password if active
        if (isSupabaseConfigured()) {
          await supabase.auth.updateUser({ password: params.newPassword.trim() }).catch(() => {});
        }
      } catch (cloudErr) {
        console.warn('[AuthRepository] Cloud password sync warning:', cloudErr);
      }
    }

    return { success: true, user: updatedUser };
  }
}

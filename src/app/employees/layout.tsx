'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import { toast } from 'sonner';

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const checkAccess = async () => {
      try {
        const org = await db.organizations.get(orgId);
        const perms = getSubscriptionPermissions(
          org?.subscription_tier,
          org?.subscription_expires_at ? new Date(org.subscription_expires_at) < new Date() : false
        );
        if (!perms.canManageEmployees) {
          toast.error('قسم إدارة الموظفين والموارد البشرية (HR) غير متاح في الحساب القياسي. يرجى ترقية الاشتراك لباقة VIP لتفعيل قسم HR والموظفين.');
          router.replace('/');
          setIsAllowed(false);
        } else {
          setIsAllowed(true);
        }
      } catch (err) {
        console.error('Error checking HR permissions:', err);
        setIsAllowed(true);
      }
    };
    checkAccess();
  }, [orgId, router]);

  if (isAllowed === false) {
    return null;
  }

  return <>{children}</>;
}

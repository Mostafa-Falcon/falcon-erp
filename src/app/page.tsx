'use client';

import React from'react';
import { AppShell } from'@/components/layout/AppShell';
import { HomeLauncherHub } from'@/components/dashboard/HomeLauncherHub';

export default function HomePage() {
 return (
 <AppShell title="لوحة المتابعة الرئيسية"hideHeaderBanner>
 <HomeLauncherHub />
 </AppShell>
 );
}
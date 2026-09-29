'use client';

import React from'react';
import { AppShell } from'@/components/layout/AppShell';
import { MonitoringDashboard } from'@/components/monitoring/MonitoringDashboard';

export default function MonitoringPage() {
 return (
 <AppShell title="لوحة المتابعة"hideHeaderBanner>
 <MonitoringDashboard />
 </AppShell>
 );
}
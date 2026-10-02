import React, { useEffect, useState } from'react';
import { useRouter } from'next/navigation';
import { useSessionStore } from'@/core/state/useSessionStore';
import { AppShell } from'@/components/layout/AppShell';
import { POS } from'@/components/sales/pos';

export default function PosPage() {
 const router = useRouter();
 const { currentUser } = useSessionStore();
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => {
 setIsMounted(true);
 }, []);

 useEffect(() => {
 if (isMounted && !currentUser) {
 router.replace('/login');
 }
 }, [isMounted, currentUser, router]);

 if (!isMounted || !currentUser) {
 return (
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="flex flex-col items-center gap-3">
 <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-500">جاري تهيئة نقطة البيع (الكاشير)...</span>
 </div>
 </div>
 );
 }

 return (
 <AppShell hideHeaderBanner title="نقطة البيع الكاشير (POS)">
 <POS />
 </AppShell>
 );
}
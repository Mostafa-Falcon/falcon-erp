'use client';

import React, { useEffect } from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { useNotificationStore } from'@/core/state/useNotificationStore';
import { useSessionStore } from'@/core/state/useSessionStore';
import {
 Bell,
 ArrowRight,
 ArrowLeft,
 Check,
 CheckCheck,
 Trash2,
 Inbox,
 AlertTriangle,
 Truck,
 ShoppingCart,
} from'lucide-react';

export default function NotificationsPage() {
 const router = useRouter();
 const { currentUser } = useSessionStore();
 const {
 notifications,
 loadNotifications,
 markAsRead,
 markAllAsRead,
 deleteNotification,
 clearAll,
 } = useNotificationStore();

 useEffect(() => {
 if (currentUser?.org_id) {
 loadNotifications(currentUser.org_id);
 }
 }, [currentUser, loadNotifications]);

 return (
 <AppShell title="الإشعارات"hideHeaderBanner>
 <div className="flex flex-col gap-5 w-full select-none"dir="rtl">
 {/* Page Top Header Card matching Screenshot 2 */}
 <div className="bg-surface rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.back()}
 className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer shrink-0"
 title="رجوع"
 >
 <ArrowRight className="w-5 h-5"/>
 </button>
 <div>
 <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
 الإشعارات
 </h1>
 <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
 مركز الإشعارات والتنبيهات للنظام
 </p>
 </div>
 </div>

 {/* Header Action Buttons matching Screenshot 2 */}
 <div className="flex items-center gap-2.5">
 <button
 onClick={() => markAllAsRead()}
 className="h-9 px-3.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
 >
 <span>تحديد الكل كمقروء</span>
 <CheckCheck className="w-4 h-4"/>
 </button>

 <button
 onClick={() => {
 if (window.confirm('هل تريد مسح جميع الإشعارات؟')) {
 clearAll();
 }
 }}
 className="h-9 px-3.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
 >
 <span>مسح جميع الإشعارات</span>
 <Trash2 className="w-4 h-4"/>
 </button>
 </div>
 </div>

 {/* Notifications List matching Screenshot 2 */}
 <div className="flex flex-col gap-3">
 {notifications.length === 0 ? (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-16 flex flex-col items-center justify-center text-center gap-3 text-slate-400 shadow-xs">
 <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-300">
 <Inbox className="w-8 h-8"/>
 </div>
 <span className="font-extrabold text-base text-slate-700 dark:text-slate-200">
 سجل الإشعارات فارغ
 </span>
 <span className="text-xs text-slate-400 max-w-sm">
 لا توجد أي تنبيهات أو إشعارات جديدة حالياً. ستظهر هنا الإشعارات فور تسجيل أي حركة أو حدوث تنبيه.
 </span>
 </div>
 ) : (
 notifications.map((n) => (
 <div
 key={n.id}
 className={`bg-surface rounded-2xl p-4 sm:p-5 border shadow-xs flex items-center justify-between gap-4 transition-all hover:shadow-sm ${
 !n.isRead
 ?'border-blue-200/90 dark:border-blue-900/60 bg-blue-50/10'
 :'border-slate-200/80 dark:border-slate-800'
 }`}
 >
 {/* Right details */}
 <div className="flex items-center gap-3.5 flex-1 min-w-0">
 {/* Bell Icon in Blue Circle */}
 <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs border border-blue-100 dark:border-blue-900">
 <Bell className="w-5 h-5"/>
 </div>

 <div className="flex flex-col min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
 {n.title}
 </h3>
 {!n.isRead && (
 <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-3xs">
 جديد
 </span>
 )}
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
 {n.description}
 </p>
 <span className="text-3xs text-slate-400 font-semibold mt-1">
 {n.timeAgo}
 </span>
 </div>
 </div>

 {/* Left Action Buttons matching Screenshot 2 */}
 <div className="flex items-center gap-2 shrink-0">
 {/* Mark as read button */}
 {!n.isRead && (
 <button
 onClick={() => markAsRead(n.id)}
 className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
 title="تحديد كمقروء"
 >
 <Check className="w-4 h-4"/>
 </button>
 )}

 {/* Delete button */}
 <button
 onClick={() => deleteNotification(n.id)}
 className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
 title="حذف الإشعار"
 >
 <Trash2 className="w-4 h-4"/>
 </button>

 {/* Open / Navigate button */}
 {n.link && (
 <button
 onClick={() => {
 markAsRead(n.id);
 router.push(n.link!);
 }}
 className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 title="فتح التفاصيل"
 >
 <ArrowLeft className="w-4 h-4"/>
 </button>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </AppShell>
 );
}
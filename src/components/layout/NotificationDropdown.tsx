'use client';

import React, { useState } from'react';
import Link from'next/link';
import { useRouter } from'next/navigation';
import { useNotificationStore, type AppNotification } from'@/core/state/useNotificationStore';
import {
 CheckCheck,
 Truck,
 AlertTriangle,
 Bell,
 ShoppingCart,
 Layers,
 CheckCircle2,
 Inbox,
 Trash2,
 ArrowLeft,
} from'lucide-react';

interface NotificationDropdownProps {
 isOpen: boolean;
 onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
 const router = useRouter();
 const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
 const [activeTab, setActiveTab] = useState<'all'|'unread'|'messages'>('all');

 if (!isOpen) return null;

 const filteredNotifications = notifications.filter((n) => {
 if (activeTab ==='unread') return !n.isRead;
 if (activeTab ==='messages') return false; // Messages tab
 return true; // All
 });

 const handleItemClick = (n: AppNotification) => {
 markAsRead(n.id);
 onClose();
 if (n.link) router.push(n.link);
 };

 return (
 <>
 {/* Backdrop overlay */}
 <div className="fixed inset-0 z-40"onClick={onClose} />

 {/* Popover Card */}
 <div
 className="absolute left-0 mt-2 w-[340px] sm:w-[380px] bg-surface rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden flex flex-col text-right select-none animate-in fade-in-50 zoom-in-95 duration-150"
 dir="rtl"
 >
 {/* Header */}
 <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
 <div className="flex items-center gap-2">
 <h3 className="font-black text-base text-slate-900 dark:text-white">
 الإشعارات
 </h3>
 {unreadCount > 0 && (
 <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-3xs">
 {unreadCount} جديد
 </span>
 )}
 </div>

 <button
 onClick={() => markAllAsRead()}
 className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
 >
 <span>تحديد الكل كمقروء</span>
 <CheckCheck className="w-3.5 h-3.5"/>
 </button>
 </div>

 {/* Tabs Bar */}
 <div className="flex items-center border-b border-slate-100 dark:border-slate-800/80 px-3 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-bold">
 <button
 onClick={() => setActiveTab('all')}
 className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
 activeTab ==='all'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
 }`}
 >
 الكل ({notifications.length})
 </button>
 <button
 onClick={() => setActiveTab('unread')}
 className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
 activeTab ==='unread'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
 }`}
 >
 غير مقروء ({unreadCount})
 </button>
 <button
 onClick={() => setActiveTab('messages')}
 className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
 activeTab ==='messages'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
 }`}
 >
 رسائل (0)
 </button>
 </div>

 {/* Notifications List */}
 <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
 {filteredNotifications.length === 0 ? (
 <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
 <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-300">
 <Inbox className="w-6 h-6"/>
 </div>
 <span className="font-bold text-xs text-slate-600 dark:text-slate-300">
 لا توجد إشعارات حالياً
 </span>
 <span className="text-3xs text-slate-400">
 ستصلك هنا التنبيهات الفورية لحركات البيع والمخزون
 </span>
 </div>
 ) : (
 filteredNotifications.slice(0, 10).map((n) => (
 <div
 key={n.id}
 onClick={() => handleItemClick(n)}
 className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer relative ${
 !n.isRead ?'bg-blue-50/20 dark:bg-blue-950/20':''
 }`}
 >
 {/* Unread indicator dot */}
 {!n.isRead && (
 <span className="absolute right-1.5 top-5 w-2 h-2 rounded-full bg-blue-600"/>
 )}

 {/* Content */}
 <div className="flex-1 pr-2">
 <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight mb-1">
 {n.title}
 </h4>
 <p className="text-2xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1.5 font-medium">
 {n.description}
 </p>
 <span className="text-3xs text-slate-400 font-semibold">
 {n.timeAgo}
 </span>
 </div>

 {/* Icon box on left/right matching Screenshot 1 */}
 <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs border border-teal-100 dark:border-teal-900">
 {n.iconType ==='alert'? (
 <AlertTriangle className="w-5 h-5 text-amber-500"/>
 ) : n.iconType ==='sale'? (
 <ShoppingCart className="w-5 h-5 text-blue-600"/>
 ) : (
 <Truck className="w-5 h-5 text-teal-600"/>
 )}
 </div>
 </div>
 ))
 )}
 </div>

 {/* Footer: عرض الكل */}
 <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
 <Link
 href="/notifications"
 onClick={onClose}
 className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <span>عرض الكل</span>
 <ArrowLeft className="w-3.5 h-3.5"/>
 </Link>
 </div>
 </div>
 </>
 );
};
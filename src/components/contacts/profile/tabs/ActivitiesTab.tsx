'use client';

import React from'react';
import { CheckCircle2, Clock } from'lucide-react';
import type { Contact } from'@/types';

interface ActivitiesTabProps {
 customer: Contact;
}

export function ActivitiesTab({ customer }: ActivitiesTabProps) {
 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل النشاطات والتعديلات</h3>
 <p className="text-xs text-slate-400 mt-0.5">تتبع تاريخ إنشاء وتحديث حساب العميل</p>
 </div>

 <div className="space-y-3 pt-2">
 <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
 <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 <div>
 <div className="text-xs font-black text-slate-800 dark:text-white">
 تم إنشاء حساب العميل في منظومة فالكون
 </div>
 <div className="text-2xs text-slate-400 font-mono mt-0.5">
 {new Date(customer.created_at).toLocaleString('ar-EG')}
 </div>
 </div>
 </div>

 {customer.updated_at && customer.updated_at !== customer.created_at && (
 <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
 <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
 <Clock className="w-5 h-5"/>
 </div>
 <div>
 <div className="text-xs font-black text-slate-800 dark:text-white">
 آخر تحديث للبيانات والملف المالي
 </div>
 <div className="text-2xs text-slate-400 font-mono mt-0.5">
 {new Date(customer.updated_at).toLocaleString('ar-EG')}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
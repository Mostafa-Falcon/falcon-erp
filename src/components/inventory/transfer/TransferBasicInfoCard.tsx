import React from'react';
import Link from'next/link';
import { Branch } from'@/types';
import { Icons } from'@/components/ui/Icons';
import { Textarea } from'@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface TransferBasicInfoCardProps {
 transferNumber: string;
 currentBranch: Branch | null;
 targetBranchId: string;
 branches: Branch[];
 notes: string;
 onTargetBranchChange: (branchId: string) => void;
 onNotesChange: (notes: string) => void;
}

export const TransferBasicInfoCard: React.FC<TransferBasicInfoCardProps> = ({
 transferNumber,
 currentBranch,
 targetBranchId,
 branches,
 notes,
 onTargetBranchChange,
 onNotesChange,
}) => {
 const otherBranches = branches.filter((b) => b.id !== currentBranch?.id);

 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Icons.Info />
 </div>
 <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
 بيانات التحويل الأساسية
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
 {/* 1. Transfer Number */}
 <div>
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 رقم التحويل
 </label>
 <div className="relative">
 <input
 type="text"
 readOnly
 value={transferNumber}
 className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-default"
 />
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
 <Icons.QrCode />
 </div>
 </div>
 </div>

 {/* 2. Sender Branch (Current Active Branch of the Business Owner) */}
 <div>
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 من الفرع المرسل <span className="text-emerald-600 dark:text-emerald-400 text-2xs font-normal">(الفرع الحالي النشط)</span>
 </label>
 <div className="relative">
 <input
 type="text"
 readOnly
 value={
 currentBranch
 ?`${currentBranch.name}${currentBranch.code ?`(${currentBranch.code})`:''}`
 :'الفرع الرئيسي'
 }
 className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-default"
 />
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
 <Icons.Store />
 </div>
 </div>
 </div>

 {/* 3. Receiver Branch (Using Shadcn Select component) */}
 <div>
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 إلى الفرع المستلم <span className="text-rose-500">*</span>
 </label>
 <div className="relative">
 <Select
 value={targetBranchId}
 onValueChange={onTargetBranchChange}
 disabled={otherBranches.length === 0}
 >
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue
 placeholder={
 otherBranches.length > 0
 ?'اختر من القائمة...'
 :'لا توجد فروع أخرى مضافة...'
 }
 />
 </SelectTrigger>
 {otherBranches.length > 0 && (
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {otherBranches.map((b) => (
 <SelectItem
 key={b.id}
 value={b.id}
 className=""
 >
 {b.name} {b.code ?`(${b.code})`:''}
 </SelectItem>
 ))}
 </SelectContent>
 )}
 </Select>
 </div>

 {otherBranches.length === 0 && (
 <p className="mt-1.5 text-2xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
 <span>⚠️ يمكنك إضافة فروع جديدة من</span>
 <Link href="/settings"className="underline hover:text-amber-700">
 إعدادات الفروع
 </Link>
 </p>
 )}
 </div>
 </div>

 {/* 4. Notes / Reason (Using Shadcn Textarea component) */}
 <div>
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 ملاحظات / سبب التحويل
 </label>
 <Textarea
 rows={2}
 value={notes}
 onChange={(e) => onNotesChange(e.target.value)}
 placeholder="مثلاً: تغطية عجز في مخزون الفرع أو تحويل أصناف مطلوبة"
 className="w-full min-h-[64px] resize-none p-3 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500"
 />
 </div>
 </div>
 );
};
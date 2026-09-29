'use client';

import React, { useState, useEffect } from'react';
import { useRouter } from'next/navigation';
import {
 Lock,
 Wallet,
 Coins,
 XCircle,
 Loader2,
 HardDrive,
} from'lucide-react';
import { toast } from'sonner';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import type { CashierShift, Treasury, User as UserType } from'@/types';

interface PosOpenShiftViewProps {
 currentUser: UserType | null;
 orgId: string;
 branchId: string;
 treasuries: Treasury[];
 onShiftOpened: (shift: CashierShift) => void;
}

export function PosOpenShiftView({
 currentUser,
 orgId,
 branchId,
 treasuries,
 onShiftOpened,
}: PosOpenShiftViewProps) {
 const router = useRouter();

 const [availableTreasuries, setAvailableTreasuries] = useState<Treasury[]>(treasuries);
 const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
 const [openingBalance, setOpeningBalance] = useState<string>('0');
 const [isBusy, setIsBusy] = useState<boolean>(false);

 // Initialize or auto-heal default treasury
 useEffect(() => {
 let isMounted = true;

 async function initTreasury() {
 try {
 const { db } = await import('@/core/db/app_database');
 let list = treasuries.length > 0 ? treasuries : [];

 if (list.length === 0 && orgId) {
 list = await db.treasuries
 .where('org_id')
 .equals(orgId)
 .and((t) => t.is_active)
 .toArray();

 if (list.length === 0) {
 const def = await TreasuryRepository.ensureDefaultTreasury({
 orgId,
 branchId: branchId || undefined,
 });
 list = [def];
 }
 }

 if (isMounted) {
 setAvailableTreasuries(list);
 if (!selectedTreasuryId && list.length > 0) {
 const def = list.find((t) => t.is_default) || list[0];
 setSelectedTreasuryId(def.id);
 }
 }
 } catch (err) {
 console.warn('PosOpenShiftView initTreasury warning:', err);
 }
 }

 initTreasury();

 return () => {
 isMounted = false;
 };
 }, [orgId, branchId, treasuries, selectedTreasuryId]);

 const selectedTreasury = availableTreasuries.find((t) => t.id === selectedTreasuryId);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser || !orgId) {
 toast.error('بيانات المستخدم غير مكتملة');
 return;
 }

 let targetTreasuryId = selectedTreasuryId;
 if (!targetTreasuryId && availableTreasuries.length > 0) {
 targetTreasuryId = availableTreasuries[0].id;
 setSelectedTreasuryId(targetTreasuryId);
 }

 if (!targetTreasuryId) {
 toast.error('يرجى تحديد حساب درج الكاشير للبدء');
 return;
 }

 const parsedBalance = parseFloat(openingBalance.replace(/,/g,''));
 if (isNaN(parsedBalance) || parsedBalance < 0) {
 toast.error('يرجى إدخال رصيد افتتاحي صحيح (صفر أو أكثر)');
 return;
 }

 try {
 setIsBusy(true);

 const targetBranchId = branchId || currentUser.branch_id ||'';

 // Check if user already has an active open shift
 const existing = await SalesRepository.getCurrentOpenShift(currentUser.id, targetBranchId, orgId);
 if (existing) {
 toast.info(`توجد وردية نشطة بالفعل لهذا الكاشير (#${existing.shift_number})`);
 onShiftOpened(existing);
 return;
 }

 // Open shift with real production data
 const shift = await SalesRepository.openShift({
 orgId,
 branchId: targetBranchId,
 userId: currentUser.id,
 treasuryId: targetTreasuryId,
 openingBalance: parsedBalance,
 });

 toast.success(`تم استلام العهدة وفتح الوردية رقم #${shift.shift_number} بنجاح!`);
 onShiftOpened(shift);
 } catch (err: any) {
 console.error('Error opening shift:', err);
 toast.error(err?.message ||'حدث خطأ أثناء فتح الوردية');
 } finally {
 setIsBusy(false);
 }
 };

 return (
 <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-app dark:bg-[#090d16] select-none">
 <div className="max-w-md w-full bg-surface rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
 {/* Pink Lock Icon Circle matching exact user design */}
 <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/50 flex items-center justify-center text-[#d90479] dark:text-pink-400 shadow-xs shrink-0">
 <Lock className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]"/>
 </div>

 {/* Headings */}
 <div className="space-y-1">
 <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
 استلام عهدة / فتح الدرج
 </h2>
 <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
 يجب فتح وردية كاشير جديدة لبدء عمليات البيع:
 </p>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="w-full space-y-4">
 {/* 1. الحساب المستهدف (الدرج) */}
 <div className="text-right">
 <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
 <div className="flex flex-col flex-1 min-w-0 pr-1">
 <span className="text-3xs sm:text-2xs font-bold text-slate-400">
 الحساب المستهدف (الدرج)
 </span>
 {availableTreasuries.length > 1 ? (
 <select
 value={selectedTreasuryId}
 onChange={(e) => {
 const newId = e.target.value;
 setSelectedTreasuryId(newId);
 const t = availableTreasuries.find((x) => x.id === newId);
 if (t) setOpeningBalance(String(t.current_balance ?? 0));
 }}
 className="bg-transparent font-black text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer mt-0.5"
 >
 {availableTreasuries.map((t) => (
 <option key={t.id} value={t.id} className="text-slate-900 dark:bg-slate-900">
 {t.name} (رصيد مسجل: {Number(t.current_balance || 0).toFixed(2)} ج.م)
 </option>
 ))}
 </select>
 ) : (
 <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">
 {selectedTreasury?.name ||'درج الكاشير الرئيسي'}
 </span>
 )}
 </div>
 <div className="w-9 h-9 rounded-xl bg-pink-100/60 dark:bg-pink-950/60 text-[#d90479] flex items-center justify-center shrink-0">
 <Wallet className="w-5 h-5"/>
 </div>
 </div>
 </div>

 {/* 2. الرصيد الافتتاحي بالدرج حالياً */}
 <div className="text-right space-y-1">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 pr-1">
 الرصيد الافتتاحي بالدرج حالياً
 </label>
 {selectedTreasury && (
 <span className="text-3xs font-medium text-slate-400 font-mono">
 (المسجل: {Number(selectedTreasury.current_balance || 0).toFixed(2)} ج.م)
 </span>
 )}
 </div>
 <div className="relative flex items-center h-12 rounded-2xl bg-surface border-2 border-[#d90479] ring-2 ring-[#d90479]/15 shadow-2xs px-3 transition-all">
 {/* Clear button (Left side in RTL) */}
 {openingBalance && openingBalance !=='0'&& (
 <button
 type="button"
 onClick={() => setOpeningBalance('0')}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
 >
 <XCircle className="w-4 h-4"/>
 </button>
 )}

 {/* Input in Center */}
 <input
 type="number"
 step="any"
 min="0"
 value={openingBalance}
 onChange={(e) => setOpeningBalance(e.target.value)}
 onFocus={(e) => e.target.select()}
 placeholder="0"
 className="w-full text-center font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white bg-transparent focus:outline-none"
 />

 {/* Cash icon (Right side in RTL) */}
 <div className="text-[#d90479] shrink-0 pl-1 pointer-events-none">
 <HardDrive className="w-4 h-4"/>
 </div>
 </div>
 </div>

 {/* 3. زر تأكيد الاستلام وفتح الوردية */}
 <button
 type="submit"
 disabled={isBusy}
 className="w-full h-12 rounded-2xl bg-[#d90479] hover:bg-[#be036a] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition-all cursor-pointer disabled:opacity-50"
 >
 {isBusy ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin"/>
 <span>جاري فتح الوردية...</span>
 </>
 ) : (
 <span>تأكيد الاستلام وفتح الوردية</span>
 )}
 </button>

 {/* 4. رابط العودة للرئيسية */}
 <div className="pt-1">
 <button
 type="button"
 onClick={() => router.push('/')}
 className="text-xs font-black text-[#d90479] hover:underline transition-colors cursor-pointer"
 >
 العودة للرئيسية
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
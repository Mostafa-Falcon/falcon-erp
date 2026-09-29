'use client';

import React, { useState, useEffect, useMemo } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Label } from'@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Info,
 Layers,
 Plus,
 Calendar,
 CreditCard,
 Building,
 DollarSign,
 AlignRight,
 Loader2,
 CheckCircle,
 X,
 Wallet,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber } from'@/lib/format';
import type { Treasury, ExpenseCategory, CashierShift, User as UserType } from'@/types';
import { toast } from'sonner';

interface PosExpenseModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 treasuries: Treasury[];
 onExpenseAdded: () => void;
}

export function PosExpenseModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 treasuries,
 onExpenseAdded,
}: PosExpenseModalProps) {
 const [categories, setCategories] = useState<ExpenseCategory[]>([]);
 const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
 const [expenseDate, setExpenseDate] = useState<string>(
 new Date().toISOString().split('T')[0]
 );
 const [sourceType, setSourceType] = useState<'shift_drawer'| string>('shift_drawer');
 const [amount, setAmount] = useState<string>('');
 const [description, setDescription] = useState<string>('');
 const [isSaving, setIsSaving] = useState<boolean>(false);
 const [isLoading, setIsLoading] = useState<boolean>(false);

 // Quick category creation modal/state
 const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
 const [newCategoryName, setNewCategoryName] = useState<string>('');

 // Load active expense categories
 useEffect(() => {
 if (!isOpen) return;

 let isMounted = true;
 const loadCategories = async () => {
 setIsLoading(true);
 try {
 let cats = await db.expense_categories.where('is_active').equals(1).toArray();
 if (cats.length === 0 && currentUser?.org_id) {
 // Auto-seed default expense categories if empty
 const defaults = ['مصاريف يومية وبوفيه','نثريات ونظافة','صيانة وتشغيل','كهرباء ومياه وانترنت','مرتبات ومكافآت','إيجار ومستلزمات'];
 for (const defName of defaults) {
 await TreasuryRepository.createExpenseCategory(currentUser.org_id, defName);
 }
 cats = await db.expense_categories.toArray();
 }
 if (isMounted) {
 setCategories(cats);
 if (cats.length > 0 && !selectedCategoryId) {
 setSelectedCategoryId(cats[0].id);
 }
 }
 } catch (err) {
 console.error('Error loading expense categories:', err);
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadCategories();
 return () => {
 isMounted = false;
 };
 }, [isOpen, currentUser, selectedCategoryId]);

 // Set default source treasury
 useEffect(() => {
 if (activeShift) {
 setSourceType('shift_drawer');
 } else if (treasuries.length > 0) {
 const def = treasuries.find((t) => t.is_default) || treasuries[0];
 setSourceType(def.id);
 }
 }, [activeShift, treasuries, isOpen]);

 // Determine effective treasury ID and live balance
 const effectiveTreasury = useMemo(() => {
 if (sourceType ==='shift_drawer'&& activeShift) {
 return treasuries.find((t) => t.id === activeShift.treasury_id) || treasuries[0];
 }
 return treasuries.find((t) => t.id === sourceType) || treasuries[0];
 }, [sourceType, activeShift, treasuries]);

 const liveSourceBalance = useMemo(() => {
 if (sourceType ==='shift_drawer'&& activeShift) {
 return activeShift.expected_closing_balance;
 }
 return effectiveTreasury?.current_balance ?? 0;
 }, [sourceType, activeShift, effectiveTreasury]);

 const sourceName = useMemo(() => {
 if (sourceType ==='shift_drawer'&& activeShift) {
 return`درج الكاشير الحالي (وردية #${activeShift.shift_number})`;
 }
 return effectiveTreasury?.name ||'الخزينة المحددة';
 }, [sourceType, activeShift, effectiveTreasury]);

 // Create new category inline
 const handleCreateCategory = async () => {
 if (!newCategoryName.trim() || !currentUser?.org_id) return;
 try {
 const cat = await TreasuryRepository.createExpenseCategory(
 currentUser.org_id,
 newCategoryName.trim()
 );
 setCategories((prev) => [...prev, cat]);
 setSelectedCategoryId(cat.id);
 setNewCategoryName('');
 setIsAddingCategory(false);
 toast.success(`تمت إضافة الفئة «${cat.name}» بنجاح!`);
 } catch (err) {
 toast.error('حدث خطأ أثناء إضافة الفئة.');
 }
 };

 // Submit Expense
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser?.org_id) return;

 const numAmount = parseFloat(amount);
 if (isNaN(numAmount) || numAmount <= 0) {
 toast.error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
 return;
 }

 if (!selectedCategoryId) {
 toast.error('يرجى اختيار فئة المصروف');
 return;
 }

 const targetTreasuryId = effectiveTreasury?.id;
 if (!targetTreasuryId) {
 toast.error('يرجى اختيار الخزينة أو درج الكاشير للخصم منها');
 return;
 }

 if (numAmount > liveSourceBalance) {
 toast.warning(`تنبيه: المبلغ المصروف (${formatNumber(numAmount)} ج.م) أكبر من الرصيد الحالي (${formatNumber(liveSourceBalance)} ج.م)`);
 }

 setIsSaving(true);
 try {
 await TreasuryRepository.recordExpense({
 orgId: currentUser.org_id,
 categoryId: selectedCategoryId,
 treasuryId: targetTreasuryId,
 shiftId: sourceType ==='shift_drawer'&& activeShift ? activeShift.id : null,
 amount: numAmount,
 description: description.trim() ||'مصروف نقدي من الكاشير',
 userId: currentUser.id,
 });

 toast.success(`تم تسجيل وحفظ المصروف بقيمة ${formatNumber(numAmount)} ج.م بنجاح!`);
 setAmount('');
 setDescription('');
 onExpenseAdded();
 onClose();
 } catch (err: any) {
 console.error('Error saving expense:', err);
 toast.error(err.message ||'حدث خطأ أثناء حفظ المصروف.');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-xl p-6 sm:p-7 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
 <DialogTitle className="text-lg font-black text-slate-900 dark:text-white text-center">
 إضافة مصروف جديد
 </DialogTitle>
 <DialogDescription className="text-xs text-slate-400 text-center">
 تسجيل مصروفات تشغيلية وخصمها من درج الوردية أو الخزينة المحددة
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
 {/* SECTION 1: بيانات المصروف الأساسية */}
 <div className="space-y-2.5">
 <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
 <Info className="w-4 h-4 text-sky-500"/>
 <span>بيانات المصروف الأساسية</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Category selector + Quick Add */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">الفئة الضريبية / النوع:</Label>
 <div className="flex items-center gap-1.5">
 <Select
 value={selectedCategoryId}
 onValueChange={setSelectedCategoryId}
 disabled={isLoading}
 >
 <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold flex-1">
 <SelectValue placeholder="اختر فئة المصروف..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl max-h-56">
 {categories.map((cat) => (
 <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold cursor-pointer py-1.5">
 {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <button
 type="button"
 onClick={() => setIsAddingCategory((prev) => !prev)}
 title="إضافة فئة مصروفات جديدة"
 className="w-10 h-10 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-200/60 dark:border-pink-900/50 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
 >
 <Plus className="w-4 h-4"/>
 </button>
 </div>
 </div>

 {/* Expense Date */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">تاريخ المصروف:</Label>
 <div className="relative">
 <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
 <Input
 type="date"
 value={expenseDate}
 onChange={(e) => setExpenseDate(e.target.value)}
 className="h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
 />
 </div>
 </div>
 </div>

 {/* Inline Add Category Drawer */}
 {isAddingCategory && (
 <div className="p-3 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50 rounded-2xl space-y-2 animate-in fade-in-50 duration-200">
 <span className="text-2xs font-bold text-pink-700 dark:text-pink-300 block">
 إضافة فئة مصروف جديدة سريعة:
 </span>
 <div className="flex items-center gap-2">
 <Input
 value={newCategoryName}
 onChange={(e) => setNewCategoryName(e.target.value)}
 placeholder="اسم الفئة (مثال: بوفيه وضيافة، وقود وسيارة...)"
 className="h-9 rounded-xl bg-surface border-pink-200 text-xs"
 autoFocus
 />
 <Button
 type="button"
 onClick={handleCreateCategory}
 disabled={!newCategoryName.trim()}
 className="h-9 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold"
 >
 إضافة
 </Button>
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsAddingCategory(false)}
 className="h-9 px-2 text-xs"
 >
 إلغاء
 </Button>
 </div>
 </div>
 )}
 </div>

 {/* SECTION 2: التفاصيل المالية ومصدر الصرف */}
 <div className="space-y-2.5 pt-1">
 <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
 <Wallet className="w-4 h-4 text-emerald-500"/>
 <span>التفاصيل المالية ومصدر الصرف</span>
 </div>

 {/* Live Drawer / Treasury Balance Badge Banner */}
 <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/50 flex items-center justify-between shadow-2xs">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
 <CreditCard className="w-4 h-4"/>
 </div>
 <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
 {sourceType ==='shift_drawer'?'رصيد درج الكاشير الحالي (لحظي)':`رصيد «${sourceName}»:`}
 </span>
 </div>
 <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400">
 {formatNumber(liveSourceBalance)} ج.م
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Financial Source Dropdown */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">الحساب المالي (المصدر):</Label>
 <Select value={sourceType} onValueChange={setSourceType}>
 <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر مصدر الصرف..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 {activeShift && (
 <SelectItem value="shift_drawer"className="text-xs font-black text-emerald-600 dark:text-emerald-400 cursor-pointer py-2">
 درج وردية الكاشير الرئيسية (#{activeShift.shift_number})
 </SelectItem>
 )}
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id} className="text-xs font-bold cursor-pointer py-1.5">
 {t.name} {t.is_default ?'(الخزينة الرئيسية)':'(خزينة فرعية)'}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Amount Input */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">المبلغ المستحق:</Label>
 <div className="relative">
 <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
 <Input
 type="number"
 min="0.01"
 step="0.01"
 required
 autoFocus
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="0.00"
 className="h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm font-black font-mono text-slate-900 dark:text-white"
 />
 </div>
 </div>
 </div>

 {/* Description / Notes */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">البيان / ملاحظات إضافية:</Label>
 <div className="relative">
 <AlignRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none"/>
 <textarea
 rows={2}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="اكتب بيان الصرف والغرض منه..."
 className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
 />
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
 <Button
 type="submit"
 disabled={isSaving || !amount || parseFloat(amount) <= 0}
 className="h-11 px-6 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
 >
 {isSaving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin"/>
 <span>جارٍ الحفظ...</span>
 </>
 ) : (
 <>
 <CheckCircle className="w-4 h-4"/>
 <span>حفظ المصروف</span>
 </>
 )}
 </Button>

 <button
 type="button"
 onClick={onClose}
 className="text-xs font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400 py-1.5 px-4 rounded-lg transition-colors cursor-pointer"
 >
 إلغاء
 </button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}
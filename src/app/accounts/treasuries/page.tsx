'use client';

import React, { useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
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
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from'@/components/ui/dialog';
import {
 RefreshCw,
 Plus,
 ArrowLeftRight,
 UserPlus,
 Wallet,
 TrendingUp,
 CreditCard,
 Banknote,
 ArrowDownCircle,
 CircleDollarSign,
 Trash2,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import type { Treasury, TreasuryType } from'@/types';
import { toast } from'sonner';
import { formatNumber } from'@/lib/format';

export default function TreasuriesPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const userId = currentUser?.id ||'';

 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [currency, setCurrency] = useState('ج.م');

 // Modals state
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
 const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
 const [selectedTreasury, setSelectedTreasury] = useState<Treasury | null>(null);

 // Form states
 const [newTreasuryName, setNewTreasuryName] = useState('');
 const [newTreasuryType, setNewTreasuryType] = useState<TreasuryType>('safe');
 const [newTreasuryOpening, setNewTreasuryOpening] = useState('0');
 const [isSaving, setIsSaving] = useState(false);

 // Transfer state
 const [transferFrom, setTransferFrom] = useState('');
 const [transferTo, setTransferTo] = useState('');
 const [transferAmount, setTransferAmount] = useState('');
 const [transferNote, setTransferNote] = useState('');

 // Voucher state (Deposit/Withdraw)
 const [voucherType, setVoucherType] = useState<'receipt'|'payment'>('receipt');
 const [voucherAmount, setVoucherAmount] = useState('');
 const [voucherNote, setVoucherNote] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [list, org] = await Promise.all([
 TreasuryRepository.getTreasuries(orgId),
 import('@/core/db/app_database').then((m) => m.db.organizations.get(orgId)),
 ]);
 setTreasuries(list);
 if (org?.currency ==='EGP') setCurrency('ج.م');
 else if (org?.currency) setCurrency(org.currency);
 } catch (err) {
 console.error('Error loading treasuries:', err);
 toast.error('حدث خطأ أثناء تحميل البيانات المالية');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleCreateTreasury = async () => {
 if (!newTreasuryName.trim()) {
 toast.error('يرجى إدخال اسم الخزينة');
 return;
 }
 setIsSaving(true);
 try {
 await TreasuryRepository.createTreasury({
 orgId,
 name: newTreasuryName.trim(),
 type: newTreasuryType,
 openingBalance: Number(newTreasuryOpening) || 0,
 isDefault: treasuries.length === 0,
 });
 toast.success('تم إنشاء الخزينة بنجاح');
 setIsAddModalOpen(false);
 setNewTreasuryName('');
 setNewTreasuryOpening('0');
 await loadData();
 } catch (err) {
 toast.error('حدث خطأ أثناء إنشاء الخزينة');
 } finally {
 setIsSaving(false);
 }
 };

 const handleTransfer = async () => {
 if (!transferFrom || !transferTo || !transferAmount) {
 toast.error('يرجى إكمال بيانات التحويل');
 return;
 }
 setIsSaving(true);
 try {
 await TreasuryRepository.internalTransfer({
 orgId,
 fromTreasuryId: transferFrom,
 toTreasuryId: transferTo,
 amount: Number(transferAmount),
 description: transferNote ||'تحويل داخلي',
 userId,
 });
 toast.success('تمت عملية التحويل بنجاح');
 setIsTransferModalOpen(false);
 setTransferAmount('');
 setTransferNote('');
 await loadData();
 } catch (err: any) {
 toast.error(err.message ||'حدث خطأ أثناء التحويل');
 } finally {
 setIsSaving(false);
 }
 };

 const handleVoucher = async () => {
 if (!selectedTreasury || !voucherAmount) {
 toast.error('يرجى إدخال المبلغ');
 return;
 }
 setIsSaving(true);
 try {
 await TreasuryRepository.createVoucher({
 orgId,
 userId,
 treasuryId: selectedTreasury.id,
 type: voucherType,
 amount: Number(voucherAmount),
 description: voucherNote || (voucherType ==='receipt'?'إيداع رصيد':'سحب رصيد'),
 });
 toast.success(voucherType ==='receipt'?'تم الإيداع بنجاح':'تم السحب بنجاح');
 setIsVoucherModalOpen(false);
 setVoucherAmount('');
 setVoucherNote('');
 await loadData();
 } catch (err) {
 toast.error('حدث خطأ أثناء العملية المالية');
 } finally {
 setIsSaving(false);
 }
 };

 const handleDeleteTreasury = async (id: string) => {
 const confirmed = window.confirm('هل أنت متأكد من حذف هذه الخزينة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.');
 if (!confirmed) return;

 try {
 await TreasuryRepository.deleteTreasury(id, orgId);
 toast.success('تم حذف الخزينة بنجاح');
 await loadData();
 } catch (err: any) {
 toast.error(err.message ||'حدث خطأ أثناء الحذف');
 }
 };

 const headerActions = (
 <Button
 onClick={loadData}
 variant="outline"
 className="h-10 px-4 border-blue-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-all cursor-pointer"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} />
 تحديث البيانات
 </Button>
 );

 return (
 <AppShell
 title="الخزائن والبنوك"
 subtitle="إدارة الخزائن، الأرصدة، والتحكم في السيولة النقدية لضمان استقرار المؤسسة."
 actions={headerActions}
 >
 <div className="space-y-6 text-right"dir="rtl">
 {/* Main Action Buttons */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Button
 onClick={() => {
 setNewTreasuryType('safe');
 setIsAddModalOpen(true);
 }}
 className="h-14 bg-primary hover:bg-blue-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-3 shadow-md shadow-blue-500/10 cursor-pointer transition-transform hover:scale-[1.01] active:scale-95"
 >
 <Plus className="w-5 h-5"/>
 خزينة مؤسسة جديدة
 </Button>

 <Button
 onClick={() => setIsTransferModalOpen(true)}
 className="h-14 bg-[#f59e0b] hover:bg-orange-600 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-3 shadow-md shadow-orange-500/10 cursor-pointer transition-transform hover:scale-[1.01] active:scale-95"
 >
 <ArrowLeftRight className="w-5 h-5"/>
 تحويل بين الخزائن
 </Button>

 <Button
 onClick={() => {
 setNewTreasuryType('pos_terminal');
 setIsAddModalOpen(true);
 }}
 className="h-14 bg-[#10b981] hover:bg-emerald-600 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-3 shadow-md shadow-emerald-500/10 cursor-pointer transition-transform hover:scale-[1.01] active:scale-95"
 >
 <UserPlus className="w-5 h-5"/>
 إنشاء خزينة مالك شخصية
 </Button>
 </div>

 {/* Treasury Cards List */}
 <div className="space-y-3">
 {isLoading ? (
 <div className="py-20 flex flex-col items-center justify-center gap-3">
 <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-400">جاري تحميل الحسابات المالية...</span>
 </div>
 ) : treasuries.length === 0 ? (
 <div className="bg-surface rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
 <div className="w-16 h-14 mx-auto bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
 <Wallet className="w-8 h-8"/>
 </div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">لا توجد خزائن مسجلة</h3>
 <p className="text-xs text-slate-400">ابدأ بإضافة أول خزينة للمؤسسة لإدارة معاملاتك المالية</p>
 </div>
 ) : (
 treasuries.map((t) => (
 <div
 key={t.id}
 className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs hover:shadow-sm transition-all group"
 >
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${
 t.type ==='bank'?'bg-blue-50 text-blue-600':
 t.type ==='pos_terminal'?'bg-emerald-50 text-emerald-600':'bg-slate-50 text-slate-600'
 }`}>
 {t.type ==='bank'? <CircleDollarSign className="w-6 h-6"/> :
 t.type ==='pos_terminal'? <CreditCard className="w-6 h-6"/> : <Banknote className="w-6 h-6"/>}
 </div>
 <div>
 <h4 className="text-sm font-black text-slate-900 dark:text-white">{t.name}</h4>
 <p className="text-3xs font-bold text-slate-400 mt-0.5">كود الحساب: {t.account_code ||'—'}</p>
 </div>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-left"dir="ltr">
 <span className={`text-lg font-black ${t.current_balance < 0 ?'text-red-500':'text-[#10b981]'}`}>
 {formatNumber(t.current_balance)} <span className="text-3xs font-bold ml-0.5">{currency}</span>
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={() => {
 setSelectedTreasury(t);
 setVoucherType('receipt');
 setIsVoucherModalOpen(true);
 }}
 variant="outline"
 className="h-9 px-4 border-blue-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
 >
 <ArrowDownCircle className="w-4 h-4"/>
 إيداع رصيد
 </Button>

 <Button
 onClick={() => {
 setTransferFrom(t.id);
 setIsTransferModalOpen(true);
 }}
 variant="outline"
 className="h-9 px-4 border-orange-200 dark:border-slate-800 text-orange-600 dark:text-orange-400 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-orange-50 cursor-pointer"
 >
 <ArrowLeftRight className="w-4 h-4"/>
 تحويل صادر
 </Button>

 {!t.is_default && (
 <button
 onClick={() => handleDeleteTreasury(t.id)}
 className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
 title="حذف الخزينة"
 >
 <Trash2 className="w-4.5 h-4.5"/>
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* ==================== MODALS ==================== */}

 {/* 1. Add Treasury Modal */}
 <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
 <DialogContent className="sm:max-w-[420px] text-right"dir="rtl">
 <DialogHeader>
 <div className="flex items-center gap-2 text-blue-600 mb-1">
 <Wallet className="w-5 h-5"/>
 <DialogTitle>{newTreasuryType ==='safe'?'إضافة خزينة جديدة':'إنشاء خزينة مالك'}</DialogTitle>
 </div>
 <DialogDescription>
 سيتم إنشاء حساب مالي جديد لإدارة المعاملات النقدية أو البنكية.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 pt-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-black">اسم الخزينة / الحساب</Label>
 <Input
 value={newTreasuryName}
 onChange={(e) => setNewTreasuryName(e.target.value)}
 placeholder="مثال: الخزينة الرئيسية، حساب بنك مصر"
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-black">نوع الحساب</Label>
 <Select value={newTreasuryType} onValueChange={(v: any) => setNewTreasuryType(v)}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="safe">خزينة نقدية (Safe)</SelectItem>
 <SelectItem value="bank">حساب بنكي (Bank)</SelectItem>
 <SelectItem value="pos_terminal">ماكينة دفع / عهدة (POS)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-black">الرصيد الافتتاحي</Label>
 <Input
 type="number"
 value={newTreasuryOpening}
 onChange={(e) => setNewTreasuryOpening(e.target.value)}
 className="h-10 text-xs font-bold font-mono"
 />
 </div>
 </div>

 <DialogFooter className="mt-4 gap-2">
 <Button variant="outline"onClick={() => setIsAddModalOpen(false)} className="h-10 px-6 font-bold text-xs rounded-xl">إلغاء</Button>
 <Button onClick={handleCreateTreasury} disabled={isSaving} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">
 {isSaving ?'جاري الحفظ...':'إنشاء الحساب'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 2. Internal Transfer Modal */}
 <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
 <DialogContent className="sm:max-w-[440px] text-right"dir="rtl">
 <DialogHeader>
 <div className="flex items-center gap-2 text-orange-500 mb-1">
 <ArrowLeftRight className="w-5 h-5"/>
 <DialogTitle>تحويل مالي داخلي</DialogTitle>
 </div>
 <DialogDescription>نقل الأموال بين الخزائن والحسابات البنكية للمؤسسة.</DialogDescription>
 </DialogHeader>

 <div className="space-y-4 pt-3">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-black">من (المصدر)</Label>
 <Select value={transferFrom} onValueChange={setTransferFrom}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر الخزينة"/>
 </SelectTrigger>
 <SelectContent>
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-black">إلى (المستلم)</Label>
 <Select value={transferTo} onValueChange={setTransferTo}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر الخزينة"/>
 </SelectTrigger>
 <SelectContent>
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-black">المبلغ المراد تحويله ({currency})</Label>
 <Input
 type="number"
 value={transferAmount}
 onChange={(e) => setTransferAmount(e.target.value)}
 placeholder="0.00"
 className="h-11 text-sm font-black font-mono text-orange-600"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-black">بيان / ملاحظات التحويل</Label>
 <Input
 value={transferNote}
 onChange={(e) => setTransferNote(e.target.value)}
 placeholder="اكتب سبب التحويل..."
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <DialogFooter className="mt-4 gap-2">
 <Button variant="outline"onClick={() => setIsTransferModalOpen(false)} className="h-10 px-6 font-bold text-xs rounded-xl">إلغاء</Button>
 <Button onClick={handleTransfer} disabled={isSaving} className="h-10 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl">
 {isSaving ?'جاري التحويل...':'تأكيد التحويل الآن'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 3. Voucher Modal (Deposit/Withdraw) */}
 <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
 <DialogContent className="sm:max-w-[400px] text-right"dir="rtl">
 <DialogHeader>
 <div className="flex items-center gap-2 text-blue-600 mb-1">
 <TrendingUp className="w-5 h-5"/>
 <DialogTitle>{voucherType ==='receipt'?'إيداع رصيد نقدي':'سحب رصيد نقدي'}</DialogTitle>
 </div>
 <DialogDescription>
 {voucherType ==='receipt'?'إضافة مبلغ مالي إلى رصيد':'خصم مبلغ مالي من رصيد'} : <span className="font-black text-slate-900">{selectedTreasury?.name}</span>
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 pt-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-black">المبلغ ({currency})</Label>
 <Input
 type="number"
 value={voucherAmount}
 onChange={(e) => setVoucherAmount(e.target.value)}
 placeholder="0.00"
 className="h-11 text-sm font-black font-mono text-blue-600"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-black">البيان</Label>
 <Input
 value={voucherNote}
 onChange={(e) => setVoucherNote(e.target.value)}
 placeholder="مثال: رصيد أول المدة، سحب مصروفات..."
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <DialogFooter className="mt-4 gap-2">
 <Button variant="outline"onClick={() => setIsVoucherModalOpen(false)} className="h-10 px-6 font-bold text-xs rounded-xl">إلغاء</Button>
 <Button onClick={handleVoucher} disabled={isSaving} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">
 {isSaving ?'جاري التنفيذ...':'تأكيد العملية'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}
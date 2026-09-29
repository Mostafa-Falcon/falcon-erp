'use client';

import React, { useState, useEffect, useMemo, useRef } from'react';
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
import { Badge } from'@/components/ui/badge';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 UserCheck,
 Search,
 Calendar,
 CreditCard,
 Building,
 DollarSign,
 Tag,
 Hash,
 AlignRight,
 Loader2,
 CheckCircle,
 X,
 Phone,
 User,
 Users,
} from'lucide-react';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { Contact, Treasury, CashierShift, User as UserType } from'@/types';
import { toast } from'sonner';

interface PosCustomerPaymentModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 contacts: Contact[];
 treasuries: Treasury[];
 onPaymentRecorded: () => void;
}

export function PosCustomerPaymentModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 contacts,
 treasuries,
 onPaymentRecorded,
}: PosCustomerPaymentModalProps) {
 const [customerTypeFilter, setCustomerTypeFilter] = useState<'all'|'customer'|'both'>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

 const [destinationType, setDestinationType] = useState<'shift_drawer'| string>('shift_drawer');
 const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'bank_transfer'|'cheque'>('cash');
 const [paymentDate, setPaymentDate] = useState<string>(
 new Date().toISOString().split('T')[0]
 );
 const [amount, setAmount] = useState<string>('');
 const [discount, setDiscount] = useState<string>('');
 const [referenceNo, setReferenceNo] = useState<string>('');
 const [notes, setNotes] = useState<string>('');
 const [isSaving, setIsSaving] = useState<boolean>(false);

 const dropdownRef = useRef<HTMLDivElement>(null);

 // Generate reference number on open
 useEffect(() => {
 if (isOpen) {
 setReferenceNo(`RCV-${Math.floor(1000 + Math.random() * 9000)}`);
 setAmount('');
 setDiscount('');
 setNotes('');
 setSearchQuery('');
 setSelectedContact(null);
 setIsDropdownOpen(false);
 }
 }, [isOpen]);

 // Set default destination treasury
 useEffect(() => {
 if (activeShift) {
 setDestinationType('shift_drawer');
 } else if (treasuries.length > 0) {
 const def = treasuries.find((t) => t.is_default) || treasuries[0];
 setDestinationType(def.id);
 }
 }, [activeShift, treasuries, isOpen]);

 // Filter contacts to customers or both
 const eligibleContacts = useMemo(() => {
 return contacts.filter((c) => {
 if (customerTypeFilter ==='customer') return c.type ==='customer';
 if (customerTypeFilter ==='both') return c.type ==='both';
 return c.type ==='customer'|| c.type ==='both';
 });
 }, [contacts, customerTypeFilter]);

 // Filtered dropdown list
 const searchResults = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 if (!q) return eligibleContacts.slice(0, 15);

 return eligibleContacts
 .filter(
 (c) =>
 c.name.toLowerCase().includes(q) ||
 (c.phone && c.phone.includes(q)) ||
 (c.code && c.code.toLowerCase().includes(q))
 )
 .slice(0, 15);
 }, [eligibleContacts, searchQuery]);

 // Handle clicking outside dropdown
 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setIsDropdownOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Determine effective treasury ID and live balance
 const effectiveTreasury = useMemo(() => {
 if (destinationType ==='shift_drawer'&& activeShift) {
 return treasuries.find((t) => t.id === activeShift.treasury_id) || treasuries[0];
 }
 return treasuries.find((t) => t.id === destinationType) || treasuries[0];
 }, [destinationType, activeShift, treasuries]);

 const liveDestinationBalance = useMemo(() => {
 if (destinationType ==='shift_drawer'&& activeShift) {
 return activeShift.expected_closing_balance;
 }
 return effectiveTreasury?.current_balance ?? 0;
 }, [destinationType, activeShift, effectiveTreasury]);

 const destinationName = useMemo(() => {
 if (destinationType ==='shift_drawer'&& activeShift) {
 return`درج الكاشير الرئيسي (#${activeShift.shift_number})`;
 }
 return effectiveTreasury?.name ||'الخزينة المحددة';
 }, [destinationType, activeShift, effectiveTreasury]);

 // Submit Customer Payment Receipt
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser?.org_id) return;

 if (!selectedContact) {
 toast.error('يرجى اختيار العميل أو العميل/مورد المراد التحصيل منه');
 return;
 }

 const numAmount = parseFloat(amount);
 if (isNaN(numAmount) || numAmount <= 0) {
 toast.error('يرجى إدخال مبلغ تحصيل صحيح أكبر من الصفر');
 return;
 }

 const numDiscount = parseFloat(discount) || 0;
 const targetTreasuryId = effectiveTreasury?.id;
 if (!targetTreasuryId) {
 toast.error('يرجى اختيار الخزينة أو حساب الإيداع');
 return;
 }

 setIsSaving(true);
 try {
 await TreasuryRepository.recordCustomerPayment({
 orgId: currentUser.org_id,
 contactId: selectedContact.id,
 treasuryId: targetTreasuryId,
 shiftId: destinationType ==='shift_drawer'&& activeShift ? activeShift.id : null,
 amount: numAmount,
 discount: numDiscount,
 paymentMethod,
 referenceNo: referenceNo.trim() || undefined,
 notes: notes.trim() || undefined,
 userId: currentUser.id,
 });

 toast.success(
`تم تحصيل دفعة بمبلغ ${formatNumber(numAmount)} ج.م من «${selectedContact.name}» بنجاح!`
 );
 onPaymentRecorded();
 onClose();
 } catch (err: any) {
 console.error('Error saving customer payment:', err);
 toast.error(err.message ||'حدث خطأ أثناء تسجيل تحصيل العميل.');
 } finally {
 setIsSaving(false);
 }
 };

 // Date parsing for custom format display
 const dateObj = useMemo(() => {
 try {
 const d = new Date(paymentDate);
 return {
 year: d.getFullYear(),
 month: d.getMonth() + 1,
 day: d.getDate(),
 };
 } catch {
 return { year: 2026, month: 9, day: 17 };
 }
 }, [paymentDate]);

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-xl p-6 sm:p-7 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
 <div className="flex items-center justify-center gap-2">
 <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
 <UserCheck className="w-4 h-4"/>
 </div>
 <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
 تسجيل دفعة من عميل
 </DialogTitle>
 </div>
 <DialogDescription className="text-xs text-slate-400 text-center">
 تحصيل مبالغ مالية وسندات قبض من العملاء أو (عميل/مورد) لحساب درج الكاشير أو الخزائن
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
 {/* Customer Type Filter Pills */}
 <div className="flex items-center justify-between gap-2 pb-1">
 <span className="text-2xs font-bold text-slate-500">نوع جهة التعامل:</span>
 <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
 <button
 type="button"
 onClick={() => setCustomerTypeFilter('all')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 customerTypeFilter ==='all'
 ?'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
 :'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 الكل ({contacts.filter((c) => c.type ==='customer'|| c.type ==='both').length})
 </button>
 <button
 type="button"
 onClick={() => setCustomerTypeFilter('customer')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 customerTypeFilter ==='customer'
 ?'bg-emerald-600 text-white shadow-2xs'
 :'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 عميل ({contacts.filter((c) => c.type ==='customer').length})
 </button>
 <button
 type="button"
 onClick={() => setCustomerTypeFilter('both')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 customerTypeFilter ==='both'
 ?'bg-purple-600 text-white shadow-2xs'
 :'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 عميل / مورد ({contacts.filter((c) => c.type ==='both').length})
 </button>
 </div>
 </div>

 {/* 1. Contact Search & Selector (الطرف) */}
 <div className="space-y-1.5 relative"ref={dropdownRef}>
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 الطرف <span className="text-rose-500">*</span>
 </Label>
 <div className="relative">
 <div className="relative flex items-center">
 <Input
 type="text"
 placeholder="ابحث باسم العميل أو رقم الهاتف..."
 value={selectedContact ? selectedContact.name : searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setSelectedContact(null);
 setIsDropdownOpen(true);
 }}
 onFocus={() => setIsDropdownOpen(true)}
 className="h-10 text-xs pr-9 pl-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
 />
 <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none"/>

 {/* Badge count of filtered contacts */}
 <div className="absolute left-3 flex items-center gap-1">
 {selectedContact && (
 <button
 type="button"
 onClick={() => {
 setSelectedContact(null);
 setSearchQuery('');
 }}
 className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 <Badge
 variant="outline"
 className="text-3xs font-mono font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700"
 >
 {eligibleContacts.length}
 </Badge>
 </div>
 </div>

 {/* Dropdown Menu */}
 {isDropdownOpen && (
 <div className="absolute z-50 top-full mt-1.5 w-full bg-white dark:bg-[#151c2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
 {searchResults.length === 0 ? (
 <div className="p-4 text-center text-slate-400">
 لا توجد نتائج مطابقة للبحث
 </div>
 ) : (
 searchResults.map((c) => {
 const isSelected = selectedContact?.id === c.id;
 const balance = c.current_balance || 0;
 return (
 <div
 key={c.id}
 onClick={() => {
 setSelectedContact(c);
 setIsDropdownOpen(false);
 }}
 className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
 isSelected
 ?'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
 :'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
 }`}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <div
 className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
 c.type ==='both'
 ?'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
 :'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
 }`}
 >
 {c.type ==='both'? (
 <Users className="w-3.5 h-3.5"/>
 ) : (
 <User className="w-3.5 h-3.5"/>
 )}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="font-bold text-xs truncate">{c.name}</span>
 <Badge
 className={`text-4xs px-1.5 py-0 h-4 border-0 font-medium ${
 c.type ==='both'
 ?'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
 :'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
 }`}
 >
 {c.type ==='both'?'عميل/مورد':'عميل'}
 </Badge>
 </div>
 <div className="text-3xs text-slate-400 flex items-center gap-2 mt-0.5">
 {c.phone && (
 <span className="flex items-center gap-0.5">
 <Phone className="w-2.5 h-2.5"/>
 {c.phone}
 </span>
 )}
 {c.code && <span>#{c.code}</span>}
 </div>
 </div>
 </div>

 {/* Balance info */}
 <div className="text-left shrink-0">
 <div
 className={`text-2xs font-mono font-bold ${
 balance > 0
 ?'text-rose-600 dark:text-rose-400'
 : balance < 0
 ?'text-emerald-600 dark:text-emerald-400'
 :'text-slate-400'
 }`}
 >
 رصيد: {formatNumber(Math.abs(balance))} ج.م{''}
 <span className="text-4xs font-sans font-normal">
 {balance > 0 ?'(عليه)': balance < 0 ?'(له)':'(متزن)'}
 </span>
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>

 {/* Selected Contact Card summary */}
 {selectedContact && (
 <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl p-2 flex items-center justify-between text-xs animate-in fade-in duration-150">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"/>
 <span className="font-bold text-slate-800 dark:text-slate-200">
 {selectedContact.name}
 </span>
 <Badge
 variant="outline"
 className="text-3xs bg-surface border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
 >
 {selectedContact.type ==='both'?'عميل / مورد':'عميل'}
 </Badge>
 </div>
 <div className="text-2xs font-mono font-bold text-slate-700 dark:text-slate-300">
 الرصيد الحالي:{''}
 <span
 className={
 (selectedContact.current_balance || 0) > 0
 ?'text-rose-600 dark:text-rose-400 font-black'
 : (selectedContact.current_balance || 0) < 0
 ?'text-emerald-600 dark:text-emerald-400 font-black'
 :'text-slate-500'
 }
 >
 {formatNumber(Math.abs(selectedContact.current_balance || 0))} ج.م{''}
 {(selectedContact.current_balance || 0) > 0
 ?'(مطلوب منه)'
 : (selectedContact.current_balance || 0) < 0
 ?'(له رصيد دائن)'
 :'(حساب متزن)'}
 </span>
 </div>
 </div>
 )}
 </div>

 {/* 2. Destination Treasury / Account (الخزينة / الحساب) */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 الخزينة / الحساب <span className="text-rose-500">*</span>
 </Label>
 <span className="text-3xs text-slate-400 font-mono">
 الرصيد المتوفر: {formatNumber(liveDestinationBalance)} ج.م
 </span>
 </div>

 <Select value={destinationType} onValueChange={setDestinationType}>
 <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
 <SelectValue placeholder="اختر الخزينة أو الحساب"/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
 {activeShift && (
 <SelectItem value="shift_drawer"className="text-xs py-2">
 <div className="flex items-center justify-between gap-3 w-full">
 <span className="font-bold text-emerald-700 dark:text-emerald-400">
 درج الكاشير الرئيسي (الوردية الحالية #{activeShift.shift_number})
 </span>
 <Badge
 variant="secondary"
 className="text-3xs font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
 >
 {formatNumber(activeShift.expected_closing_balance)} ج.م
 </Badge>
 </div>
 </SelectItem>
 )}

 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id} className="text-xs py-2">
 <div className="flex items-center justify-between gap-3 w-full">
 <span>{t.name}</span>
 <Badge
 variant="outline"
 className="text-3xs font-mono border-slate-200 dark:border-slate-700"
 >
 {formatNumber(t.current_balance)} ج.م
 </Badge>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* 3. Payment Method & Date (طريقة الدفع وتاريخ العملية) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* طريقة الدفع */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 طريقة الدفع
 </Label>
 <Select
 value={paymentMethod}
 onValueChange={(val: any) => setPaymentMethod(val)}
 >
 <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
 <SelectItem value="cash"className="text-xs py-2">
 نقدي
 </SelectItem>
 <SelectItem value="card"className="text-xs py-2">
 بطاقة
 </SelectItem>
 <SelectItem value="bank_transfer"className="text-xs py-2">
 تحويل
 </SelectItem>
 <SelectItem value="cheque"className="text-xs py-2">
 شيك
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* تاريخ العملية */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 تاريخ العملية
 </Label>
 <div className="relative flex items-center">
 <Input
 type="date"
 value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="h-10 text-xs pr-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono"
 />
 <Calendar className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none"/>
 </div>
 </div>
 </div>

 {/* 4. Amount & Discount (المبلغ والخصم) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* المبلغ */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 المبلغ <span className="text-rose-500">*</span>
 </Label>
 <div className="relative flex items-center">
 <Input
 type="number"
 step="any"
 placeholder="0.00"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 className="h-10 text-xs font-mono font-bold pr-3 pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
 required
 />
 <span className="text-2xs font-bold text-slate-400 absolute left-3">
 ج.م
 </span>
 </div>
 </div>

 {/* الخصم المسموح به إن وجد */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 الخصم (إن وجد)
 </Label>
 <div className="relative flex items-center">
 <Input
 type="number"
 step="any"
 placeholder="0.00"
 value={discount}
 onChange={(e) => setDiscount(e.target.value)}
 className="h-10 text-xs font-mono pr-3 pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
 />
 <span className="text-2xs font-bold text-slate-400 absolute left-3">
 ج.م
 </span>
 </div>
 </div>
 </div>

 {/* 5. Reference Number (رقم مرجعي) */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 رقم مرجعي
 </Label>
 <div className="relative flex items-center">
 <Input
 type="text"
 value={referenceNo}
 onChange={(e) => setReferenceNo(e.target.value)}
 placeholder="RCV-XXXX"
 className="h-10 text-xs font-mono pr-3 pl-8 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
 />
 {referenceNo && (
 <button
 type="button"
 onClick={() => setReferenceNo('')}
 className="p-1 text-slate-400 hover:text-slate-600 absolute left-2"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>
 </div>

 {/* 6. Notes (ملاحظات) */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 ملاحظات
 </Label>
 <Input
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="اكتب أي تفاصيل أو ملاحظات إضافية حول الدفعة..."
 className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
 />
 </div>

 {/* 7. Action Submit Button */}
 <div className="pt-2">
 <Button
 type="submit"
 disabled={isSaving}
 className="w-full h-11 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
 >
 {isSaving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin"/>
 <span>جاري تسجيل الدفعة...</span>
 </>
 ) : (
 <>
 <CheckCircle className="w-4 h-4"/>
 <span>تسجيل الدفعة</span>
 </>
 )}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}
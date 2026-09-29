'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DocumentNumberService } from '@/core/sync/document_number_service';
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
 Truck,
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

interface PosSupplierPaymentModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 contacts: Contact[];
 treasuries: Treasury[];
 onPaymentRecorded: () => void;
}

export function PosSupplierPaymentModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 contacts,
 treasuries,
 onPaymentRecorded,
}: PosSupplierPaymentModalProps) {
 const [supplierTypeFilter, setSupplierTypeFilter] = useState<'all'|'supplier'|'both'>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

 const [sourceType, setSourceType] = useState<'shift_drawer'| string>('shift_drawer');
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
 let isMounted = true;
 DocumentNumberService.nextVoucherNumber('org_default', 'branch_default')
 .then((num) => {
 if (isMounted) setReferenceNo(num);
 })
 .catch(() => {
 if (isMounted) setReferenceNo(`PAY-${Date.now().toString().slice(-6)}`);
 });
 setAmount('');
 setDiscount('');
 setNotes('');
 setSearchQuery('');
 setSelectedContact(null);
 setIsDropdownOpen(false);
 return () => {
 isMounted = false;
 };
 }
 }, [isOpen]);

 // Set default source treasury
 useEffect(() => {
 if (activeShift) {
 setSourceType('shift_drawer');
 } else if (treasuries.length > 0) {
 const def = treasuries.find((t) => t.is_default) || treasuries[0];
 setSourceType(def.id);
 }
 }, [activeShift, treasuries, isOpen]);

 // Filter contacts to suppliers or both
 const eligibleContacts = useMemo(() => {
 return contacts.filter((c) => {
 if (supplierTypeFilter ==='supplier') return c.type ==='supplier';
 if (supplierTypeFilter ==='both') return c.type ==='both';
 return c.type ==='supplier'|| c.type ==='both';
 });
 }, [contacts, supplierTypeFilter]);

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
 return`درج الكاشير الرئيسي (#${activeShift.shift_number})`;
 }
 return effectiveTreasury?.name ||'الخزينة المحددة';
 }, [sourceType, activeShift, effectiveTreasury]);

 // Submit Supplier Payment
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser?.org_id) return;

 if (!selectedContact) {
 toast.error('يرجى اختيار المورد أو العميل/مورد المراد السداد له');
 return;
 }

 const numAmount = parseFloat(amount);
 if (isNaN(numAmount) || numAmount <= 0) {
 toast.error('يرجى إدخال مبلغ سداد صحيح أكبر من الصفر');
 return;
 }

 const numDiscount = parseFloat(discount) || 0;
 const targetTreasuryId = effectiveTreasury?.id;
 if (!targetTreasuryId) {
 toast.error('يرجى اختيار الخزينة أو حساب الصرف');
 return;
 }

 if (numAmount > liveSourceBalance) {
 toast.warning(
`تنبيه: مبلغ السداد (${formatNumber(numAmount)} ج.م) أكبر من الرصيد المتوفر (${formatNumber(
 liveSourceBalance
 )} ج.م)`
 );
 }

 setIsSaving(true);
 try {
 await TreasuryRepository.recordSupplierPayment({
 orgId: currentUser.org_id,
 contactId: selectedContact.id,
 treasuryId: targetTreasuryId,
 shiftId: sourceType ==='shift_drawer'&& activeShift ? activeShift.id : null,
 amount: numAmount,
 discount: numDiscount,
 paymentMethod,
 referenceNo: referenceNo.trim() || undefined,
 notes: notes.trim() || undefined,
 userId: currentUser.id,
 });

 toast.success(
`تم تسجيل سداد مبلغ ${formatNumber(numAmount)} ج.م لصالح «${selectedContact.name}» بنجاح!`
 );
 onPaymentRecorded();
 onClose();
 } catch (err: any) {
 console.error('Error saving supplier payment:', err);
 toast.error(err.message ||'حدث خطأ أثناء تسجيل سداد المورد.');
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
 <div className="flex items-center justify-center gap-2">
 <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-900/60 shadow-xs">
 <Truck className="w-4 h-4"/>
 </div>
 <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
 تسجيل سداد لمورد
 </DialogTitle>
 </div>
 <DialogDescription className="text-xs text-slate-400 text-center">
 صرف مبالغ مالية وسداد مستحقات الموردين أو (عميل/مورد) من درج الكاشير أو الخزينة
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
 {/* Supplier Type Filter Pills */}
 <div className="flex items-center justify-between gap-2 pb-1">
 <span className="text-2xs font-bold text-slate-500">نوع جهة التعامل:</span>
 <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
 <button
 type="button"
 onClick={() => setSupplierTypeFilter('all')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 supplierTypeFilter ==='all'
 ?'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
 :'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 الكل ({contacts.filter((c) => c.type ==='supplier'|| c.type ==='both').length})
 </button>
 <button
 type="button"
 onClick={() => setSupplierTypeFilter('supplier')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 supplierTypeFilter ==='supplier'
 ?'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-2xs'
 :'text-slate-500 hover:text-purple-600'
 }`}
 >
 مورد فقط ({contacts.filter((c) => c.type ==='supplier').length})
 </button>
 <button
 type="button"
 onClick={() => setSupplierTypeFilter('both')}
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
 supplierTypeFilter ==='both'
 ?'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
 :'text-slate-500 hover:text-emerald-600'
 }`}
 >
 عميل / مورد ({contacts.filter((c) => c.type ==='both').length})
 </button>
 </div>
 </div>

 {/* Supplier Search Dropdown Field (الطرف *) */}
 <div className="space-y-1 relative"ref={dropdownRef}>
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <span>الطرف</span>
 <span className="text-rose-500">*</span>
 </Label>

 <div className="relative">
 <input
 type="text"
 value={selectedContact ?`${selectedContact.name} ${selectedContact.type ==='both'?'(عميل/مورد)':''}`: searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 if (selectedContact) setSelectedContact(null);
 setIsDropdownOpen(true);
 }}
 onFocus={() => setIsDropdownOpen(true)}
 placeholder="ابحث باسم المورد أو رقم الهاتف..."
 className="w-full h-11 pr-4 pl-16 rounded-2xl bg-white dark:bg-[#0d1322] border-2 border-fuchsia-500 dark:border-fuchsia-500 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30 shadow-xs"
 />

 <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
 <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-3xs font-mono font-bold text-slate-500 flex items-center gap-1">
 <Search className="w-3 h-3 text-slate-400"/>
 <span>{eligibleContacts.length}</span>
 </span>
 {selectedContact && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedContact(null);
 setSearchQuery('');
 }}
 className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 flex items-center justify-center pointer-events-auto cursor-pointer"
 >
 <X className="w-3 h-3"/>
 </button>
 )}
 </div>
 </div>

 {/* Dropdown Options Popup */}
 {isDropdownOpen && (
 <div className="absolute z-50 right-0 left-0 mt-1 max-h-60 overflow-y-auto bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-800/80">
 {searchResults.length === 0 ? (
 <div className="p-4 text-center text-xs font-bold text-slate-400">
 لا توجد نتائج مطابقة
 </div>
 ) : (
 searchResults.map((contact) => {
 const isBoth = contact.type ==='both';
 const isSelected = selectedContact?.id === contact.id;
 const balance = contact.current_balance;

 return (
 <div
 key={contact.id}
 onClick={() => {
 setSelectedContact(contact);
 setSearchQuery(contact.name);
 setIsDropdownOpen(false);
 }}
 className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
 isSelected
 ?'bg-fuchsia-50/70 dark:bg-fuchsia-950/30'
 :'hover:bg-slate-50 dark:hover:bg-slate-800/50'
 }`}
 >
 {/* Left: Badge & Balance */}
 <div className="text-left">
 <Badge
 variant="outline"
 className={`text-3xs font-bold px-2 py-0.5 rounded-lg border-none ${
 isBoth
 ?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
 :'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
 }`}
 >
 {isBoth ?'عميل/مورد':'مورد'}
 </Badge>
 <div className="text-3xs font-mono text-slate-500 font-bold mt-1">
 رصيد: {formatNumber(Math.abs(balance))} ج.م{''}
 {balance < 0 ? (
 <span className="text-rose-500">(له / دائن)</span>
 ) : balance > 0 ? (
 <span className="text-emerald-500">(عليه / مدين)</span>
 ) : (
 <span className="text-slate-400">(متزن)</span>
 )}
 </div>
 </div>

 {/* Right: Icon, Name & Phone */}
 <div className="flex items-center gap-2.5">
 <div className="text-right">
 <span className="text-xs font-black text-slate-900 dark:text-white block">
 {contact.name}
 </span>
 <span className="text-3xs text-slate-400 font-mono flex items-center gap-1">
 <Phone className="w-2.5 h-2.5"/>
 <span>{contact.phone || contact.code ||'—'}</span>
 </span>
 </div>
 <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
 <Truck className="w-4 h-4"/>
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>

 {/* Treasury / Account Field (الخزينة / الحساب *) */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
 <span>الخزينة / الحساب</span>
 <span className="text-3xs font-mono text-emerald-600 dark:text-emerald-400">
 الرصيد: {formatNumber(liveSourceBalance)} ج.م
 </span>
 </Label>
 <Select value={sourceType} onValueChange={setSourceType}>
 <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر الخزينة / الحساب..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 {activeShift && (
 <SelectItem value="shift_drawer"className="text-xs font-black text-emerald-600 dark:text-emerald-400 cursor-pointer py-2">
 درج الكاشير الرئيسي (وردية #{activeShift.shift_number})
 </SelectItem>
 )}
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id} className="text-xs font-bold cursor-pointer py-1.5">
 {t.name} {t.is_default ?'(الخزينة الرئيسية)':'(خزينة فرعية)'} ({formatNumber(t.current_balance)} ج.م)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Payment Method & Date */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Payment Method */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">طريقة الدفع:</Label>
 <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
 <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 <SelectItem value="cash"className="text-xs font-bold cursor-pointer">نقدي</SelectItem>
 <SelectItem value="bank_transfer"className="text-xs font-bold cursor-pointer">تحويل بنكي</SelectItem>
 <SelectItem value="cheque"className="text-xs font-bold cursor-pointer">شيك</SelectItem>
 <SelectItem value="card"className="text-xs font-bold cursor-pointer">شبكة / بطاقة</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Date */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">تاريخ العملية:</Label>
 <div className="relative">
 <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
 <Input
 type="date"
 value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
 />
 </div>
 </div>
 </div>

 {/* Amount (المبلغ *) */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <span>المبلغ</span>
 <span className="text-rose-500">*</span>
 </Label>
 <Input
 type="number"
 min="0.01"
 step="0.01"
 required
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="0.00"
 className="h-10 text-center font-black font-mono text-base rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
 />
 </div>

 {/* Discount (الخصم إن وجد) */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">الخصم (إن وجد):</Label>
 <div className="relative">
 <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
 <Input
 type="number"
 min="0"
 step="0.01"
 value={discount}
 onChange={(e) => setDiscount(e.target.value)}
 placeholder="0.00"
 className="h-10 pr-9 pl-3 text-center font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </div>
 </div>

 {/* Reference No (رقم مرجعي) */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">رقم مرجعي:</Label>
 <div className="relative">
 <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
 <Input
 value={referenceNo}
 onChange={(e) => setReferenceNo(e.target.value)}
 className="h-10 pr-9 pl-9 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 {referenceNo && (
 <button
 type="button"
 onClick={() => setReferenceNo('')}
 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer"
 >
 <X className="w-2.5 h-2.5"/>
 </button>
 )}
 </div>
 </div>

 {/* Notes (ملاحظات) */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-500">ملاحظات:</Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="اكتب أي ملاحظات أو تفاصيل إضافية عن السداد..."
 className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </div>

 {/* Submit Button (تسجيل السداد) */}
 <div className="pt-2">
 <Button
 type="submit"
 disabled={isSaving || !selectedContact || !amount || parseFloat(amount) <= 0}
 className="w-full h-11 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
 >
 {isSaving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin"/>
 <span>جارٍ تسجيل السداد...</span>
 </>
 ) : (
 <span>تسجيل السداد</span>
 )}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}
'use client';

import React, { useState } from'react';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { ContactsRepository } from'@/modules/contacts/contacts_repository';
import type { Contact, ContactType } from'@/types';
import { cn } from'@/lib/utils';
import { Card, CardContent } from'@/components/ui/card';
import {
 Building2,
 Phone,
 Mail,
 Hash,
 ArrowUpRight,
 ArrowDownLeft,
 MapPin,
 FileText,
 BadgeInfo,
 CheckCircle2,
 X,
 RefreshCw,
 User,
 Truck,
 Handshake
} from'lucide-react';
import { Switch } from'@/components/ui/switch';

const inputCls =
'h-12 w-full px-4 pr-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all';

const sectionHeaderCls ="text-2xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pr-1";

interface ContactFormProps {
 orgId: string;
 initial?: Contact | null;
 presetType?: ContactType | null;
 onSaved: (contact: Contact) => void;
}

export function ContactForm({ orgId, initial, presetType, onSaved }: ContactFormProps) {
 const isEdit = !!initial;

 const [name, setName] = useState(initial?.name ??'');
 const [type, setType] = useState<ContactType>(initial?.type ?? presetType ??'customer');
 const [phone, setPhone] = useState(initial?.phone ??'');
 const [mobile, setMobile] = useState(initial?.mobile ??'');
 const [email, setEmail] = useState(initial?.email ??'');
 const [taxNumber, setTaxNumber] = useState(initial?.tax_number ??'');
 const [address, setAddress] = useState(initial?.address ??'');
 const [creditLimit, setCreditLimit] = useState(String(initial?.credit_limit ?? 0));
 const [openingBalanceDebit, setOpeningBalanceDebit] = useState('0'); // لنا (مدين)
 const [openingBalanceCredit, setOpeningBalanceCredit] = useState('0'); // علينا (دائن)
 const [isActive, setIsActive] = useState(initial?.is_active ?? true);
 const [notes, setNotes] = useState(initial?.notes ??'');
 const [error, setError] = useState('');
 const [isSaving, setIsSaving] = useState(false);

 const save = async () => {
 setError('');
 if (!name.trim()) {
 setError('اسم الجهة مطلوب.');
 return;
 }

 setIsSaving(true);
 try {
 const finalOpening = (Number(openingBalanceDebit) || 0) - (Number(openingBalanceCredit) || 0);

 if (isEdit && initial) {
 const updated = await ContactsRepository.updateContact(initial.id, {
 name: name.trim(),
 type,
 phone: phone.trim() || undefined,
 mobile: mobile.trim() || undefined,
 email: email.trim() || undefined,
 tax_number: taxNumber.trim() || undefined,
 address: address.trim() || undefined,
 credit_limit: Number(creditLimit) || 0,
 is_active: isActive,
 notes: notes.trim() || undefined,
 });
 if (!updated) throw new Error('تعذر تحديث الجهة.');
 onSaved(updated);
 } else {
 const created = await ContactsRepository.createContact(
 {
 org_id: orgId,
 name: name.trim(),
 type,
 phone: phone.trim() || undefined,
 mobile: mobile.trim() || undefined,
 email: email.trim() || undefined,
 tax_number: taxNumber.trim() || undefined,
 address: address.trim() || undefined,
 credit_limit: Number(creditLimit) || 0,
 is_active: isActive,
 notes: notes.trim() || undefined,
 },
 finalOpening
 );
 onSaved(created);
 }
 } catch (err) {
 console.error(err);
 setError(err instanceof Error ? err.message :'حدث خطأ أثناء الحفظ.');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="space-y-6"dir="rtl">

 {/* 🟢 Main Data Section */}
 <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-surface">
 <CardContent className="p-8">
 <h4 className={sectionHeaderCls}>البيانات الأساسية</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
 <div className="space-y-2 md:col-span-2">
 <label className="text-2xs font-black text-slate-500 pr-1">نوع جهة التعامل <span className="text-red-500">*</span></label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <button
 type="button"
 onClick={() => setType('customer')}
 className={cn(
"flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer",
 type ==='customer'
 ?"bg-blue-50/90 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-xs ring-1 ring-blue-500/30"
 :"border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
 )}
 >
 <User className="w-4 h-4 text-blue-600"/>
 <span>عميل (مبيعات وفواتير)</span>
 </button>

 <button
 type="button"
 onClick={() => setType('supplier')}
 className={cn(
"flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer",
 type ==='supplier'
 ?"bg-emerald-50/90 border-emerald-500 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
 :"border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
 )}
 >
 <Truck className="w-4 h-4 text-emerald-600"/>
 <span>مورد (مشتريات وبضاعة)</span>
 </button>

 <button
 type="button"
 onClick={() => setType('both')}
 className={cn(
"flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer",
 type ==='both'
 ?"bg-purple-50/90 border-purple-500 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 shadow-xs ring-1 ring-purple-500/30"
 :"border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
 )}
 >
 <Handshake className="w-4 h-4 text-purple-600"/>
 <span>مورد وعميل معاً (مزدوج)</span>
 </button>
 </div>
 </div>

 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">اسم الجهة / المشروع <span className="text-red-500">*</span></label>
 <div className="relative">
 <Building2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="أدخل الاسم التجاري بدقة..."/>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-2xs font-black text-slate-500 pr-1">كود الحساب (تلقائي)</label>
 <div className="relative">
 <Hash className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300"/>
 <Input disabled value={initial?.code ||'CS-000001'} className={cn(inputCls,"bg-slate-50 text-slate-400 font-mono")} />
 </div>
 </div>

 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">رقم الهاتف الأساسي</label>
 <div className="relative">
 <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} placeholder="01XXXXXXXXX"dir="ltr"/>
 </div>
 </div>

 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">البريد الإلكتروني</label>
 <div className="relative">
 <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="example@mail.com"dir="ltr"/>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 🔴 Opening Balances Section */}
 <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-surface">
 <CardContent className="p-8">
 <h4 className={sectionHeaderCls}>الأرصدة الافتتاحية</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">رصيد مورد افتتاحي (له علينا)</label>
 <div className="relative">
 <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
 <span className="text-3xs font-bold text-slate-400 uppercase">ج.م</span>
 <ArrowUpRight className="w-4 h-4 text-red-500"/>
 </div>
 <Input
 type="number"
 value={openingBalanceCredit}
 onChange={(e) => setOpeningBalanceCredit(e.target.value)}
 className={cn(inputCls,"pl-16 text-left font-mono text-lg text-red-600")}
 placeholder="0.0"
 />
 </div>
 </div>

 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">رصيد عميل افتتاحي (عليه لنا)</label>
 <div className="relative">
 <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
 <span className="text-3xs font-bold text-slate-400 uppercase">ج.م</span>
 <ArrowDownLeft className="w-4 h-4 text-emerald-500"/>
 </div>
 <Input
 type="number"
 value={openingBalanceDebit}
 onChange={(e) => setOpeningBalanceDebit(e.target.value)}
 className={cn(inputCls,"pl-16 text-left font-mono text-lg text-emerald-600")}
 placeholder="0.0"
 />
 </div>
 </div>
 </div>
 <p className="mt-4 text-3xs font-bold text-slate-400 flex items-center gap-2">
 <BadgeInfo className="w-3.5 h-3.5"/> ملاحظة: الرصيد الافتتاحي هو الرصيد المستحق قبل البدء في استخدام النظام.
 </p>
 </CardContent>
 </Card>

 {/* 🔵 Additional Info Section */}
 <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-surface">
 <CardContent className="p-8">
 <h4 className={sectionHeaderCls}>بيانات إضافية</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">الرقم الضريبي</label>
 <div className="relative">
 <FileText className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className={inputCls} placeholder="أدخل الرقم الضريبي للجهة..."/>
 </div>
 </div>

 <div className="space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">العنوان بالتفصيل</label>
 <div className="relative">
 <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="المدينة، الحي، الشارع..."/>
 </div>
 </div>

 <div className="md:col-span-2 space-y-2 group">
 <label className="text-2xs font-black text-slate-500 pr-1">ملاحظات إضافية</label>
 <div className="relative">
 <FileText className="absolute right-3.5 top-4 w-4.5 h-4.5 text-slate-400"/>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className={cn(inputCls,"h-24 py-3 resize-none")}
 placeholder="أي معلومات إضافية تخص التعامل مع هذه الجهة..."
 />
 </div>
 </div>
 </div>

 <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-emerald-600"/>
 <div>
 <p className="text-xs font-black text-slate-700 dark:text-white">الحساب نشط ويسمح بالتعامل</p>
 <p className="text-3xs font-bold text-slate-400">يمكنك تعطيل التعامل مع هذه الجهة مؤقتاً دون حذفها.</p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <Button variant="ghost"onClick={() => window.history.back()} className="rounded-xl font-bold h-12 px-6">تراجع</Button>
 <Button
 onClick={save}
 disabled={isSaving}
 className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.25rem] font-black text-sm gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
 >
 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
 {isSaving ?'جاري الحفظ...':'حفظ البيانات وتفعيل الحساب'}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {error && (
 <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
 <X className="w-5 h-5"/>
 <span className="text-xs font-black">{error}</span>
 </div>
 )}
 </div>
 );
}
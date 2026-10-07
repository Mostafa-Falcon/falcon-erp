'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import {
    Handshake,
    Phone,
    Mail,
    Hash,
    MapPin,
    Building2,
    FileText,
    CreditCard,
    ArrowRight,
    Save,
    Coins,
    ShieldCheck,
    Plus,
    Loader2,
    ArrowUpRight,
    ArrowDownLeft,
    Scale
} from 'lucide-react';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import type { Contact } from '@/types';
import { toast } from 'sonner';

interface BothContactFormProps {
    orgId: string;
    initial?: Contact | null;
    onSaved?: (contact: Contact) => void;
}

export function BothContactForm({ orgId, initial, onSaved }: BothContactFormProps) {
    const router = useRouter();
    const isEdit = !!initial;

    const [name, setName] = useState(initial?.name ?? '');
    const [code, setCode] = useState(initial?.code ?? '');
    const [phone, setPhone] = useState(initial?.phone ?? '');
    const [mobile, setMobile] = useState(initial?.mobile ?? '');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [address, setAddress] = useState(initial?.address ?? '');
    const [taxNumber, setTaxNumber] = useState(initial?.tax_number ?? '');
    const [creditLimit, setCreditLimit] = useState(String(initial?.credit_limit ?? 0));

    // Dual Opening Balances: customer balance (owed to us) vs supplier balance (we owe them)
    const [customerOpening, setCustomerOpening] = useState(
        initial && initial.current_balance > 0 ? String(initial.current_balance) : '0'
    );
    const [supplierOpening, setSupplierOpening] = useState(
        initial && initial.current_balance < 0 ? String(Math.abs(initial.current_balance)) : '0'
    );

    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [isSaving, setIsSaving] = useState(false);

    const netOpening = (Number(customerOpening) || 0) - (Number(supplierOpening) || 0);

    const resetForm = () => {
        setName('');
        setCode('');
        setPhone('');
        setMobile('');
        setEmail('');
        setAddress('');
        setTaxNumber('');
        setCreditLimit('0');
        setCustomerOpening('0');
        setSupplierOpening('0');
        setNotes('');
        setIsActive(true);
    };

    const handleSave = async (e: React.FormEvent, createAnother: boolean = false) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('يرجى إدخال اسم الجهة بالكامل');
            return;
        }

        try {
            setIsSaving(true);

            if (isEdit && initial) {
                const updated = await ContactsRepository.updateContact(initial.id, {
                    name: name.trim(),
                    code: code.trim() || undefined,
                    phone: phone.trim() || undefined,
                    mobile: mobile.trim() || undefined,
                    email: email.trim() || undefined,
                    address: address.trim() || undefined,
                    tax_number: taxNumber.trim() || undefined,
                    credit_limit: Number(creditLimit) || 0,
                    is_active: isActive,
                    notes: notes.trim() || undefined,
                    type: 'both',
                });

                if (!updated) throw new Error('تعذر تحديث الحساب المزدوج');
                toast.success(`تم تحديث بيانات الحساب"${updated.name}"بنجاح`);
                if (onSaved) onSaved(updated);
                else router.push('/contacts/both');
            } else {
                const created = await ContactsRepository.createContact(
                    {
                        org_id: orgId,
                        name: name.trim(),
                        code: code.trim() || undefined,
                        type: 'both',
                        phone: phone.trim() || undefined,
                        mobile: mobile.trim() || undefined,
                        email: email.trim() || undefined,
                        address: address.trim() || undefined,
                        tax_number: taxNumber.trim() || undefined,
                        credit_limit: Number(creditLimit) || 0,
                        is_active: isActive,
                        notes: notes.trim() || undefined,
                    },
                    netOpening
                );

                toast.success(`تم تسجيل الحساب المزدوج"${created.name}"بنجاح`);
                if (onSaved) onSaved(created);

                if (createAnother) {
                    resetForm();
                } else {
                    router.push('/contacts/both');
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء حفظ بيانات الحساب المزدوج');
        } finally {
            setIsSaving(false);
        }
    };

    const parsedCreditLimit = Number(creditLimit) || 0;

    return (
        <form onSubmit={(e) => handleSave(e, false)} className="space-y-6 text-right select-none" dir="rtl">

            {/* Top Navigation Row */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push('/contacts/both')}
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl gap-2 font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowRight className="w-4 h-4" />
                    <span>العودة لدليل الحسابات المزدوجة</span>
                </Button>

                <div className="flex items-center gap-2">
                    {!isEdit && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => handleSave(e, true)}
                            disabled={isSaving}
                            className="h-10 px-4 text-xs font-bold rounded-xl gap-1.5 hidden sm:inline-flex"
                        >
                            <Plus className="w-4 h-4" />
                            <span>حفظ وإضافة حساب آخر</span>
                        </Button>
                    )}

                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs gap-2 cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>{isEdit ? 'حفظ التعديلات' : 'تسجيل الحساب المزدوج'}</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Main 2 Columns */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Card 1: البيانات الأساسية للجهة */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Handshake className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                        البيانات الأساسية ومعلومات الاتصال
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400">
                                        بيانات الجهة التي تتعامل معها كعميل ومورد في آن واحد
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* اسم الجهة */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="both-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        اسم الشركة / الجهة بالكامل <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="both-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="مثال: مؤسسة الأمل للتجارة والتوزيع"
                                        className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        icon={<Building2 className="w-4 h-4" />}
                                        required
                                    />
                                </div>

                                {/* كود الحساب */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="both-code" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        كود الحساب (اختياري)
                                    </Label>
                                    <Input
                                        id="both-code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="DUAL-001"
                                        className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Hash className="w-4 h-4" />}
                                    />
                                </div>

                                {/* رقم الهاتف */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="both-phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        رقم الهاتف الرئيسي
                                    </Label>
                                    <Input
                                        id="both-phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Phone className="w-4 h-4" />}
                                    />
                                </div>

                                {/* هاتف بديل */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="both-mobile" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        موبايل بديل / واتساب
                                    </Label>
                                    <Input
                                        id="both-mobile"
                                        type="tel"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Phone className="w-4 h-4" />}
                                    />
                                </div>

                                {/* البريد الإلكتروني */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="both-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        البريد الإلكتروني
                                    </Label>
                                    <Input
                                        id="both-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="contact@dualparty.com"
                                        className="h-11 rounded-xl text-xs font-bold text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Mail className="w-4 h-4" />}
                                    />
                                </div>

                                {/* العنوان */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="both-address" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        العنوان أو المقر
                                    </Label>
                                    <Input
                                        id="both-address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="المدينة، الشارع، علامة مميزة..."
                                        className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        icon={<MapPin className="w-4 h-4" />}
                                    />
                                </div>

                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: الأرصدة المزدوجة والمقاصة */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                        الأرصدة الافتتاحية والمقاصة المحاسبية
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400">
                                        تسجيل الرصيد كعميل (لنا عليه) والرصيد كمورد (له علينا) واحتساب الصافي
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            {!isEdit ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                        {/* رصيد كعميل */}
                                        <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
                                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                                <ArrowDownLeft className="w-4 h-4" />
                                                <span className="text-xs font-black">رصيد كعميل (لنا عليه مستحقات)</span>
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={customerOpening}
                                                onChange={(e) => setCustomerOpening(e.target.value)}
                                                placeholder="0.00"
                                                className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-surface border-slate-200 dark:border-slate-800"
                                                dir="ltr"
                                            />
                                            <span className="text-3xs text-slate-500 block">مديونية سابقة على الجهة من مبيعات سابقة</span>
                                        </div>

                                        {/* رصيد كمورد */}
                                        <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-2">
                                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                                                <ArrowUpRight className="w-4 h-4" />
                                                <span className="text-xs font-black">رصيد كمورد (علينا له مستحقات)</span>
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={supplierOpening}
                                                onChange={(e) => setSupplierOpening(e.target.value)}
                                                placeholder="0.00"
                                                className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-surface border-slate-200 dark:border-slate-800"
                                                dir="ltr"
                                            />
                                            <span className="text-3xs text-slate-500 block">مديونية سابقة للجهة علينا من مشتريات سابقة</span>
                                        </div>

                                    </div>

                                    {/* شريط صافي الرصيد */}
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Scale className="w-5 h-5 text-slate-500" />
                                            <span className="text-xs font-black text-slate-900 dark:text-white">صافي الرصيد الافتتاحي بعد المقاصة:</span>
                                        </div>
                                        <span className={`text-base font-mono font-black ${netOpening > 0
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : netOpening < 0
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-slate-500'
                                            }`}>
                                            {Math.abs(netOpening).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م{''}
                                            {netOpening > 0 ? '(مدين لنا)' : netOpening < 0 ? '(دائن علينا)' : '(متزن صفر)'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الرصيد الصافي الحالي:</span>
                                    <span className={`text-sm font-mono font-black ${(initial?.current_balance || 0) > 0
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : (initial?.current_balance || 0) < 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-slate-500'
                                        }`}>
                                        {Math.abs(initial?.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{''}
                                        {(initial?.current_balance || 0) > 0 ? 'مدين (لنا)' : (initial?.current_balance || 0) < 0 ? 'دائن (علينا)' : 'متزن (0.00)'}
                                    </span>
                                </div>
                            )}

                            {/* سقف الائتمان */}
                            <div className="space-y-1.5 pt-2">
                                <Label htmlFor="both-credit" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    سقف الائتمان المسموح به للمبيعات الآجلة (ج.م)
                                </Label>
                                <Input
                                    id="both-credit"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={creditLimit}
                                    onChange={(e) => setCreditLimit(e.target.value)}
                                    placeholder="0.00"
                                    className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                    dir="ltr"
                                    icon={<CreditCard className="w-4 h-4" />}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: البيانات الضريبية والملاحظات */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                        البيانات الضريبية والملاحظات
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400">
                                        الرقم الضريبي وشروط المقاصة والتعامل التجاري
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="both-tax" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    الرقم الضريبي أو السجل التجاري (اختياري)
                                </Label>
                                <Input
                                    id="both-tax"
                                    value={taxNumber}
                                    onChange={(e) => setTaxNumber(e.target.value)}
                                    placeholder="مثال: 500-600-700"
                                    className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                    dir="ltr"
                                    icon={<Building2 className="w-4 h-4" />}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="both-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    ملاحظات أو شروط المقاصة
                                </Label>
                                <Textarea
                                    id="both-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="اتفاقيات تسوية الحسابات، دورة المقاصة الشهرية، تعليمات خاصة..."
                                    rows={3}
                                    className="rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                />
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar 1 Column */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Card: حالة تفعيل الحساب */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-4 pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-black text-slate-900 dark:text-white">
                                    حالة الحساب المزدوج
                                </CardTitle>
                                <Badge variant={isActive ? 'success' : 'secondary'} className="text-3xs font-bold">
                                    {isActive ? 'نشط ومعتمد' : 'معطل'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                                        تفعيل الحساب
                                    </span>
                                    <span className="text-3xs font-bold text-slate-400 block mt-0.5">
                                        إتاحة الجهة في شاشات المبيعات والمشتريات
                                    </span>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card: بطاقة المعاينة المباشرة */}
                    <Card className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-surface shadow-xs">
                        <CardHeader className="p-4 pb-3">
                            <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2">
                                <Handshake className="w-3.5 h-3.5 text-purple-600" />
                                <span>معاينة الحساب المزدوج (مباشر)</span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-black text-lg flex items-center justify-center shrink-0 border border-purple-500/20">
                                    {name.trim() ? name.trim().charAt(0) : <Handshake className="w-6 h-6 text-slate-400" />}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                        {name.trim() || 'اسم الجهة / المؤسسة'}
                                    </p>
                                    <p className="text-xs font-mono font-bold text-slate-400 truncate">
                                        {code.trim() || 'DUAL-AUTOGEN'}
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100 dark:bg-slate-800" />

                            <div className="space-y-2 text-xs font-bold">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>الهاتف:</span>
                                    <span className="font-mono text-slate-900 dark:text-white dir-ltr">
                                        {mobile.trim() || phone.trim() || '—'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>العنوان:</span>
                                    <span className="text-slate-900 dark:text-white truncate max-w-[140px]">
                                        {address.trim() || '—'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>صافي الرصيد:</span>
                                    <span className={`font-mono font-black ${netOpening > 0
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : netOpening < 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-slate-900 dark:text-white'
                                        }`}>
                                        {Math.abs(netOpening).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                                        {netOpening > 0 && '(لنا)'}
                                        {netOpening < 0 && '(علينا)'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>حد الائتمان:</span>
                                    <span className="font-mono text-slate-900 dark:text-white">
                                        {parsedCreditLimit > 0 ? `${parsedCreditLimit.toLocaleString('en-US')} ج.م` : 'غير محدد'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card: أزرار الحفظ والإجراءات */}
                    <Card className="rounded-2xl border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 shadow-xs">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                                <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 space-y-1">
                                    <p className="font-black text-slate-900 dark:text-white">مقاصة مالية ذكية</p>
                                    <p className="text-2xs">
                                        إمكانية إجراء تسويات بين فواتير المبيعات وفواتير المشتريات تلقائياً لنفس الجهة.
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-purple-500/10" />

                            <div className="space-y-2 pt-1">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>{isEdit ? 'حفظ التعديلات' : 'تسجيل الحساب المزدوج'}</span>
                                </Button>

                                {!isEdit && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={(e) => handleSave(e, true)}
                                        disabled={isSaving}
                                        className="w-full h-11 text-xs font-bold rounded-xl gap-1.5"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>حفظ وإضافة حساب آخر</span>
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/contacts/both')}
                                    className="w-full h-11 text-xs font-bold rounded-xl"
                                >
                                    إلغاء وعودة
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </form>
    );
}
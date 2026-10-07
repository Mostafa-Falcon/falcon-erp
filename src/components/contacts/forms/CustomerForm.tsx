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
    User,
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
    CheckCircle2,
    UserCheck
} from 'lucide-react';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import type { Contact } from '@/types';
import { toast } from 'sonner';

interface CustomerFormProps {
    orgId: string;
    initial?: Contact | null;
    onSaved?: (contact: Contact) => void;
}

export function CustomerForm({ orgId, initial, onSaved }: CustomerFormProps) {
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

    // Opening Balance: zero, debit (owed by customer), credit (owed to customer)
    const [balanceMode, setBalanceMode] = useState<'zero' | 'debit' | 'credit'>(
        initial
            ? initial.current_balance > 0
                ? 'debit'
                : initial.current_balance < 0
                    ? 'credit'
                    : 'zero'
            : 'zero'
    );
    const [openingBalance, setOpeningBalance] = useState(
        initial ? String(Math.abs(initial.current_balance || 0)) : ''
    );

    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setName('');
        setCode('');
        setPhone('');
        setMobile('');
        setEmail('');
        setAddress('');
        setTaxNumber('');
        setCreditLimit('0');
        setBalanceMode('zero');
        setOpeningBalance('');
        setNotes('');
        setIsActive(true);
    };

    const handleSave = async (e: React.FormEvent, createAnother: boolean = false) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('يرجى إدخال اسم العميل بالكامل');
            return;
        }

        try {
            setIsSaving(true);
            let finalBalance = 0;
            if (!isEdit) {
                const rawBalance = Math.abs(Number(openingBalance) || 0);
                if (balanceMode === 'debit') finalBalance = rawBalance;
                else if (balanceMode === 'credit') finalBalance = -rawBalance;
            }

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
                    type: 'customer',
                });

                if (!updated) throw new Error('تعذر تحديث بيانات العميل');
                toast.success(`تم تحديث بيانات العميل"${updated.name}"بنجاح`);
                if (onSaved) onSaved(updated);
                else router.push('/contacts/customers');
            } else {
                const created = await ContactsRepository.createContact(
                    {
                        org_id: orgId,
                        name: name.trim(),
                        code: code.trim() || undefined,
                        type: 'customer',
                        phone: phone.trim() || undefined,
                        mobile: mobile.trim() || undefined,
                        email: email.trim() || undefined,
                        address: address.trim() || undefined,
                        tax_number: taxNumber.trim() || undefined,
                        credit_limit: Number(creditLimit) || 0,
                        is_active: isActive,
                        notes: notes.trim() || undefined,
                    },
                    finalBalance
                );

                toast.success(`تم تسجيل العميل"${created.name}"بنجاح`);
                if (onSaved) onSaved(created);

                if (createAnother) {
                    resetForm();
                } else {
                    router.push('/contacts/customers');
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء حفظ بيانات العميل');
        } finally {
            setIsSaving(false);
        }
    };

    const parsedOpeningBalance = balanceMode === 'zero' ? 0 : Number(openingBalance) || 0;
    const parsedCreditLimit = Number(creditLimit) || 0;

    return (
        <form onSubmit={(e) => handleSave(e, false)} className="space-y-6 text-right select-none" dir="rtl">

            {/* Top Navigation Row */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push('/contacts/customers')}
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl gap-2 font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowRight className="w-4 h-4" />
                    <span>العودة لسجل العملاء</span>
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
                            <span>حفظ وإضافة عميل آخر</span>
                        </Button>
                    )}

                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs gap-2 cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>{isEdit ? 'حفظ التعديلات' : 'تسجيل العميل'}</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Main 2 Columns */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Card 1: البيانات الأساسية ومعلومات الاتصال */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                        البيانات الأساسية ومعلومات الاتصال
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400">
                                        البيانات الرسمية للعميل وأرقام الهواتف المعتمدة لإصدار الفواتير
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* اسم العميل */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="cust-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        اسم العميل بالكامل <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="cust-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="مثال: أحمد محمد علي"
                                        className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        icon={<User className="w-4 h-4" />}
                                        required
                                    />
                                </div>

                                {/* كود العميل */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="cust-code" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        كود العميل (اختياري)
                                    </Label>
                                    <Input
                                        id="cust-code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="CUS-001"
                                        className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Hash className="w-4 h-4" />}
                                    />
                                </div>

                                {/* الهاتف الأساسي */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="cust-phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        رقم الهاتف / الجوال الأساسي
                                    </Label>
                                    <Input
                                        id="cust-phone"
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
                                    <Label htmlFor="cust-mobile" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        رقم هاتف بديل / واتساب
                                    </Label>
                                    <Input
                                        id="cust-mobile"
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
                                    <Label htmlFor="cust-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        البريد الإلكتروني
                                    </Label>
                                    <Input
                                        id="cust-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="customer@example.com"
                                        className="h-11 rounded-xl text-xs font-bold text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        dir="ltr"
                                        icon={<Mail className="w-4 h-4" />}
                                    />
                                </div>

                                {/* العنوان */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="cust-address" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        العنوان أو المنطقة
                                    </Label>
                                    <Input
                                        id="cust-address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="المدينة، الحي، اسم الشارع، علامة مميزة..."
                                        className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                        icon={<MapPin className="w-4 h-4" />}
                                    />
                                </div>

                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: الرصيد الافتتاحي والائتمان */}
                    <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-surface shadow-xs">
                        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                        الرصيد الافتتاحي والسياسة الائتمانية
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400">
                                        ضبط المديونية السابقة وسقف البيع الآجل للعميل
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* الرصيد الافتتاحي */}
                                {!isEdit ? (
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            حالة الرصيد الافتتاحي عند بدء التعامل
                                        </Label>

                                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBalanceMode('zero');
                                                    setOpeningBalance('');
                                                }}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${balanceMode === 'zero'
                                                    ? 'bg-surface text-slate-900 dark:text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                بدون رصيد سابق (0)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBalanceMode('debit')}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${balanceMode === 'debit'
                                                    ? 'bg-rose-500 text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                مدين (عليه لنا مديونية)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBalanceMode('credit')}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${balanceMode === 'credit'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                دائن (له رصيد مقدم)
                                            </button>
                                        </div>

                                        {balanceMode !== 'zero' && (
                                            <div className="pt-2">
                                                <Label htmlFor="cust-bal-val" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    قيمة الرصيد الافتتاحي ({balanceMode === 'debit' ? 'مدين / عليه لنا' : 'دائن / له مقدم'}) (ج.م)
                                                </Label>
                                                <Input
                                                    id="cust-bal-val"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={openingBalance}
                                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                                    placeholder="0.00"
                                                    className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                                    dir="ltr"
                                                    icon={<Coins className="w-4 h-4" />}
                                                    autoFocus
                                                />
                                                <p className="text-2xs font-semibold text-slate-400 mt-1">
                                                    {balanceMode === 'debit'
                                                        ? '⚠️ يُثبت هذا المبلغ كمديونية سابقة مستحقة على العميل.'
                                                        : '✅ يُثبت هذا المبلغ كرصيد مدفوع مقدماً للعميل ومتاح للاستخدام في فواتير البيع.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">رصيد العميل الحالي:</span>
                                        <span className={`text-sm font-mono font-black ${(initial?.current_balance || 0) > 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : (initial?.current_balance || 0) < 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-slate-500'
                                            }`}>
                                            {Math.abs(initial?.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{''}
                                            {(initial?.current_balance || 0) > 0 ? 'مدين (عليه)' : (initial?.current_balance || 0) < 0 ? 'دائن (له)' : 'متزن (0.00)'}
                                        </span>
                                    </div>
                                )}

                                {/* سقف الائتمان */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="cust-credit" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        سقف الائتمان المسموح به (الحد الائتماني) (ج.م)
                                    </Label>
                                    <Input
                                        id="cust-credit"
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
                                    <p className="text-2xs font-semibold text-slate-400">
                                        أقصى مديونية يمكن للعميل الوصول إليها عند البيع الآجل (0 = غير محدد).
                                    </p>
                                </div>

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
                                        الرقم الضريبي وأي اشتراطات أو تفضيلات خاصة بالعميل
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                            {/* الرقم الضريبي */}
                            <div className="space-y-1.5">
                                <Label htmlFor="cust-tax" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    الرقم الضريبي للعميل (اختياري)
                                </Label>
                                <Input
                                    id="cust-tax"
                                    value={taxNumber}
                                    onChange={(e) => setTaxNumber(e.target.value)}
                                    placeholder="مثال: 300123456789"
                                    className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
                                    dir="ltr"
                                    icon={<Building2 className="w-4 h-4" />}
                                />
                            </div>

                            {/* ملاحظات */}
                            <div className="space-y-1.5">
                                <Label htmlFor="cust-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    ملاحظات أو تعليمات خاصة بالعميل
                                </Label>
                                <Textarea
                                    id="cust-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="أي تعليمات تظهر عند البيع، مواعيد التوصيل، تفضيلات الاستلام..."
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
                                    حالة حساب العميل
                                </CardTitle>
                                <Badge variant={isActive ? 'success' : 'secondary'} className="text-3xs font-bold">
                                    {isActive ? 'نشط ومفعل' : 'معطل'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                                        تفعيل الحساب للبيع
                                    </span>
                                    <span className="text-3xs font-bold text-slate-400 block mt-0.5">
                                        إتاحة العميل في نقاط البيع والفواتير
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
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>معاينة بطاقة العميل (مباشر)</span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-black text-lg flex items-center justify-center shrink-0 border border-blue-500/20">
                                    {name.trim() ? name.trim().charAt(0) : <User className="w-6 h-6 text-slate-400" />}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                        {name.trim() || 'اسم العميل الجديد'}
                                    </p>
                                    <p className="text-xs font-mono font-bold text-slate-400 truncate">
                                        {code.trim() || 'CUS-AUTOGEN'}
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100 dark:bg-slate-800" />

                            <div className="space-y-2 text-xs font-bold">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>الهاتف:</span>
                                    <span className="font-mono text-slate-900 dark:text-white dir-ltr">
                                        {phone.trim() || '—'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>العنوان:</span>
                                    <span className="text-slate-900 dark:text-white truncate max-w-[140px]">
                                        {address.trim() || '—'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>الرصيد الافتتاحي:</span>
                                    <span className={`font-mono font-black ${balanceMode === 'debit' && parsedOpeningBalance > 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : balanceMode === 'credit' && parsedOpeningBalance > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-900 dark:text-white'
                                        }`}>
                                        {parsedOpeningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                                        {balanceMode === 'debit' && parsedOpeningBalance > 0 && '(مدين)'}
                                        {balanceMode === 'credit' && parsedOpeningBalance > 0 && '(دائن)'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-500">
                                    <span>سقف الائتمان:</span>
                                    <span className="font-mono text-slate-900 dark:text-white">
                                        {parsedCreditLimit > 0 ? `${parsedCreditLimit.toLocaleString('en-US')} ج.م` : 'غير محدد'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card: أزرار الحفظ والإجراءات */}
                    <Card className="rounded-2xl border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 space-y-1">
                                    <p className="font-black text-slate-900 dark:text-white">إدارة ائتمان ومبيعات آمنة</p>
                                    <p className="text-2xs">
                                        ضبط سقف الائتمان يحمي المنشأة من تجاوز العملاء للحدود المالية المسموح بها.
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-blue-500/10" />

                            <div className="space-y-2 pt-1">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>{isEdit ? 'حفظ التعديلات' : 'تسجيل العميل'}</span>
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
                                        <span>حفظ وإضافة عميل آخر</span>
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/contacts/customers')}
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
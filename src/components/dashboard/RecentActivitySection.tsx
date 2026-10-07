'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSessionStore } from '@/core/state/useSessionStore';
import {
    Clock,
    ArrowUpRight,
    Plus,
    Zap,
    CheckCircle2,
    HardDrive,
    Keyboard,
    FileText,
} from 'lucide-react';

interface RecentInvoice {
    id: string;
    invoice_number: string;
    type: 'sale' | 'purchase';
    partyName: string;
    total: number;
    date: string;
    paymentMethod: string;
}

export const RecentActivitySection: React.FC = () => {
    const { currentUser } = useSessionStore();
    const [invoices, setInvoices] = useState<RecentInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const orgId = currentUser?.org_id;
        if (!orgId) return;

        let active = true;

        const loadRecentActivity = async () => {
            try {
                const { db } = await import('@/core/db/app_database');

                const [sales, purchases] = await Promise.all([
                    db.sales_invoices
                        .where('org_id')
                        .equals(orgId)
                        .reverse()
                        .limit(5)
                        .toArray(),
                    db.purchase_invoices
                        .where('org_id')
                        .equals(orgId)
                        .reverse()
                        .limit(5)
                        .toArray(),
                ]);

                const contactIds = Array.from(
                    new Set([
                        ...sales.map((s) => s.customer_id).filter(Boolean),
                        ...purchases.map((p) => p.supplier_id).filter(Boolean),
                    ])
                ) as string[];

                const contacts =
                    contactIds.length > 0
                        ? await db.contacts.where('id').anyOf(contactIds).toArray()
                        : [];
                const contactMap = new Map<string, string>(contacts.map((c) => [c.id, c.name]));

                const formatPayment = (type?: string) => {
                    switch (type) {
                        case 'cash':
                            return 'نقدي';
                        case 'card':
                            return 'شبكة / بطاقة';
                        case 'credit':
                            return 'آجل';
                        case 'split':
                            return 'سداد مشترك';
                        default:
                            return 'نقدي';
                    }
                };

                const combined: RecentInvoice[] = [
                    ...sales.map((s) => ({
                        id: s.id,
                        invoice_number: s.invoice_number,
                        type: 'sale' as const,
                        partyName: (s.customer_id ? contactMap.get(s.customer_id) : undefined) || 'عميل نقدي',
                        total: Number(s.total) || 0,
                        date: s.created_at,
                        paymentMethod: formatPayment(s.payment_type),
                    })),
                    ...purchases.map((p) => ({
                        id: p.id,
                        invoice_number: p.invoice_number || p.system_invoice_number,
                        type: 'purchase' as const,
                        partyName: (p.supplier_id ? contactMap.get(p.supplier_id) : undefined) || 'مورد عام',
                        total: Number(p.total) || 0,
                        date: p.created_at,
                        paymentMethod: formatPayment(p.payment_type),
                    })),
                ];

                // Sort descending by date
                combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (active) {
                    setInvoices(combined.slice(0, 5));
                    setLoading(false);
                }
            } catch (err) {
                console.warn('Recent activity load err:', err);
                if (active) setLoading(false);
            }
        };

        loadRecentActivity();

        return () => {
            active = false;
        };
    }, [currentUser]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full select-none">
            {/* 1. Recent Invoices Table (2/3 Width) */}
            <Card className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface shadow-sm flex flex-col justify-between overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                                آخر الفواتير والعمليات
                            </CardTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                سجل العمليات الصادرة والواردة لحظياً
                            </p>
                        </div>
                    </div>

                    <Link href="/sales/invoices">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
                        >
                            <span>عرض كل الفواتير</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                    </Link>
                </CardHeader>

                <CardContent className="p-0 flex-1 flex flex-col justify-center">
                    {loading ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-medium">
                            جاري تحميل العمليات الأخيرة...
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                لا توجد فواتير منشأة حتى الآن
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                ابدأ بفتح نقطة البيع أو تسجيل فاتورة شراء لتظهر عملياتك اليومية هنا فوراً.
                            </p>
                            <div className="flex items-center gap-2.5">
                                <Link href="/sales/pos">
                                    <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-xl gap-1.5 text-xs">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>فاتورة بيع جديدة</span>
                                    </Button>
                                </Link>
                                <Link href="/purchases/invoices/new">
                                    <Button size="sm" variant="outline" className="font-bold rounded-xl text-xs">
                                        <span>فاتورة شراء</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                                    <TableHead className="text-right">النوع</TableHead>
                                    <TableHead className="text-right">الطرف / العميل</TableHead>
                                    <TableHead className="text-right">الإجمالي</TableHead>
                                    <TableHead className="text-right">الدفع</TableHead>
                                    <TableHead className="text-right">التاريخ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <TableCell className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                            {inv.invoice_number}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={inv.type === 'sale' ? 'default' : 'secondary'}
                                                className={`text-3xs font-bold py-0.5 px-2 ${inv.type === 'sale'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200'
                                                    }`}
                                            >
                                                {inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                            {inv.partyName}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                            {inv.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 font-medium">
                                            {inv.paymentMethod}
                                        </TableCell>
                                        <TableCell className="text-2xs text-slate-500 dark:text-slate-400 font-mono">
                                            {new Date(inv.date).toLocaleDateString('ar-EG', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* 2. Operational Shortcuts & System Status (1/3 Width) */}
            <div className="flex flex-col gap-4">
                {/* Keyboard Shortcuts Card */}
                <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                            <Keyboard className="w-4 h-4 text-slate-500" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                اختصارات لوحة المفاتيح الموحدة
                            </h3>
                        </div>
                        <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-3xs font-bold">
                            مفعلة على النظام
                        </Badge>
                    </div>

                    <div className="space-y-2 mt-3 text-xs">
                        {/* Quick Navigation */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">فتح نقطة البيع (POS)</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                F1
                            </kbd>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">فاتورة شراء وتوريد جديدة</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                F2
                            </kbd>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">إضافة صنف جديد للمخزون</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                F3
                            </kbd>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">البحث الشامل الفوري</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                Ctrl + K / F4
                            </kbd>
                        </div>

                        {/* Unified Action Shortcuts */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300">حفظ العملية أو النموذج</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs">
                                Ctrl + S
                            </kbd>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">إلغاء / تراجع / إغلاق</span>
                            <kbd className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-0.5 font-mono text-2xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                Esc
                            </kbd>
                        </div>
                    </div>
                </Card>

                {/* System & Storage Pulse Card */}
                <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                حالة المحرك المحلي
                            </h3>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-3xs font-bold">
                            جاهز 100%
                        </Badge>
                    </div>

                    <div className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>تخزين IndexedDB محلي فوري (Zero Lag)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>طابور المزامنة التلقائي (Sync Queue Active)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>دعم العمل بدون إنترنت Offline-Ready</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
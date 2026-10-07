'use client';

import React from 'react';
import { RefreshCw, Users, MoreVertical, Eye, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types';
import type { CustomerColumnConfig } from './ColumnsCustomizerModal';

interface CustomersTableProps {
    customers: Contact[];
    salesTotals: Record<string, number>;
    isLoading: boolean;
    columns: CustomerColumnConfig;
    onViewDetails: (customer: Contact) => void;
    onEdit: (customer: Contact) => void;
    onToggleActive: (customer: Contact) => void;
}

export function CustomersTable({
    customers,
    salesTotals,
    isLoading,
    columns,
    onViewDetails,
    onEdit,
    onToggleActive,
}: CustomersTableProps) {
    if (isLoading) {
        return (
            <div className="py-20 text-center text-muted-foreground">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-primary" />
                <span className="text-xs font-bold">جاري تحميل سجل العملاء...</span>
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="py-20 text-center text-muted-foreground">
                <Users className="w-14 h-14 mx-auto mb-3 opacity-25" />
                <p className="font-black text-foreground text-sm">لا يوجد عملاء مطابقين لخيارات البحث</p>
                <p className="text-xs text-muted-foreground mt-1">جرب مسح الفلتر أو إضافة عميل جديد للبدء.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table className="w-full text-right">
                <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                    <TableRow>
                        {columns.code && <TableHead className="py-3.5 px-4 text-xs font-black">معرف الاتصال</TableHead>}
                        {columns.name && <TableHead className="py-3.5 px-4 text-xs font-black">اسم العميل / المنشأة</TableHead>}
                        {columns.phone && <TableHead className="py-3.5 px-4 text-xs font-black">رقم الهاتف</TableHead>}
                        {columns.purchases && <TableHead className="py-3.5 px-4 text-left text-xs font-black">المسحوبات</TableHead>}
                        {columns.balance && <TableHead className="py-3.5 px-4 text-left text-xs font-black">الرصيد الحالي</TableHead>}
                        {columns.lastActivity && <TableHead className="py-3.5 px-4 text-center text-xs font-black">تاريخ الإضافة</TableHead>}
                        <TableHead className="py-3.5 px-4 text-center w-16 text-xs font-black">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.map((c) => {
                        const totalPurchased = salesTotals[c.id] || 0;
                        const isDebit = c.current_balance > 0;
                        const isCredit = c.current_balance < 0;

                        return (
                            <TableRow
                                key={c.id}
                                className={cn(
                                    'hover:bg-muted/40 transition-colors group',
                                    !c.is_active && 'opacity-50 bg-muted/20'
                                )}
                            >
                                {/* معرف الاتصال */}
                                {columns.code && (
                                    <TableCell className="py-3.5 px-4 font-mono text-muted-foreground text-xs font-bold">
                                        {c.code || '—'}
                                    </TableCell>
                                )}

                                {/* اسم العميل */}
                                {columns.name && (
                                    <TableCell className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                                                {c.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewDetails(c)}
                                                    className="font-black text-foreground hover:text-primary transition-colors text-right cursor-pointer text-xs"
                                                >
                                                    {c.name}
                                                </button>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-3xs text-muted-foreground">تصنيف عام</span>
                                                    {c.type === 'both' && (
                                                        <Badge variant="outline" className="text-4xs px-1.5 py-0 font-black text-indigo-600 dark:text-indigo-400">
                                                            عميل ومورد
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                )}

                                {/* رقم الهاتف */}
                                {columns.phone && (
                                    <TableCell className="py-3.5 px-4 font-mono text-muted-foreground text-xs" dir="ltr">
                                        {c.phone || c.mobile ? (
                                            <a href={`tel:${c.phone || c.mobile}`} className="hover:text-primary transition-colors font-bold">
                                                {c.phone || c.mobile}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground/50">—</span>
                                        )}
                                    </TableCell>
                                )}

                                {/* المسحوبات */}
                                {columns.purchases && (
                                    <TableCell className="py-3.5 px-4 text-left font-black font-mono text-xs text-foreground">
                                        {formatNumber(totalPurchased)} <span className="text-3xs font-sans font-normal text-muted-foreground">ج.م</span>
                                    </TableCell>
                                )}

                                {/* الرصيد الحالي */}
                                {columns.balance && (
                                    <TableCell className="py-3.5 px-4 text-left font-black font-mono text-xs">
                                        <span
                                            className={cn(
                                                isDebit && 'text-destructive',
                                                isCredit && 'text-emerald-600 dark:text-emerald-400',
                                                c.current_balance === 0 && 'text-muted-foreground'
                                            )}
                                        >
                                            {formatNumber(c.current_balance)}{''}
                                            <span className="text-3xs font-sans font-normal opacity-70">ج.م</span>
                                        </span>
                                    </TableCell>
                                )}

                                {/* تاريخ الإضافة */}
                                {columns.lastActivity && (
                                    <TableCell className="py-3.5 px-4 text-center font-mono text-muted-foreground text-xs">
                                        {new Date(c.created_at).toLocaleDateString('en-CA')}
                                    </TableCell>
                                )}

                                {/* إجراءات */}
                                <TableCell className="py-3.5 px-4 text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground mx-auto"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-lg">
                                            <DropdownMenuItem
                                                onClick={() => onViewDetails(c)}
                                                className="flex items-center gap-2.5 py-2 px-3 text-xs font-bold rounded-lg cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4 text-primary" />
                                                <span>التفاصيل</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => onEdit(c)}
                                                className="flex items-center gap-2.5 py-2 px-3 text-xs font-bold rounded-lg cursor-pointer"
                                            >
                                                <Edit className="w-4 h-4 text-muted-foreground" />
                                                <span>تعديل</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => onToggleActive(c)}
                                                className={cn(
                                                    'flex items-center gap-2.5 py-2 px-3 text-xs font-bold rounded-lg cursor-pointer',
                                                    c.is_active ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                                                )}
                                            >
                                                {c.is_active ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                <span>{c.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
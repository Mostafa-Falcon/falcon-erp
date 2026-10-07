import React from 'react';
import { StockTransfer, Branch, Warehouse } from '@/types';
import { Icons } from '@/components/ui/Icons';
import { TRANSFER_STATUS_LABELS } from '@/lib/format';

interface TransferTableProps {
    transfers: StockTransfer[];
    branchMap: Record<string, string>;
    warehouseMap: Record<string, string>;
    onView: (transfer: StockTransfer) => void;
    onShip: (transferId: string) => void;
    onReceive: (transferId: string) => void;
    onCancel: (transferId: string) => void;
}

export const TransferTable: React.FC<TransferTableProps> = ({
    transfers,
    branchMap,
    warehouseMap,
    onView,
    onShip,
    onReceive,
    onCancel,
}) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {TRANSFER_STATUS_LABELS.pending || 'قيد الشحن'}
                    </span>
                );
            case 'in_transit':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        {TRANSFER_STATUS_LABELS.in_transit || 'تم الشحن'}
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {TRANSFER_STATUS_LABELS.completed || 'تم الاستلام'}
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {TRANSFER_STATUS_LABELS.cancelled || 'ملغي'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    const getBranchName = (t: StockTransfer, type: 'from' | 'to') => {
        if (type === 'from') {
            if (t.from_branch_id && branchMap[t.from_branch_id]) return branchMap[t.from_branch_id];
            if (t.from_warehouse_id && warehouseMap[t.from_warehouse_id]) return warehouseMap[t.from_warehouse_id];
            return 'الفرع الرئيسي';
        } else {
            if (t.to_branch_id && branchMap[t.to_branch_id]) return branchMap[t.to_branch_id];
            if (t.to_warehouse_id && warehouseMap[t.to_warehouse_id]) return warehouseMap[t.to_warehouse_id];
            return 'فرع غير محدد';
        }
    };

    return (
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 text-xs font-bold">
                            <th className="py-3.5 px-4">رقم التحويل</th>
                            <th className="py-3.5 px-4">التاريخ</th>
                            <th className="py-3.5 px-4">من فرع</th>
                            <th className="py-3.5 px-4">إلى فرع</th>
                            <th className="py-3.5 px-4">الأصناف</th>
                            <th className="py-3.5 px-4">الحالة</th>
                            <th className="py-3.5 px-4">بواسطة</th>
                            <th className="py-3.5 px-4 text-center">الخيارات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-200">
                        {transfers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-16 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <Icons.Warehouse />
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            لا توجد بيانات
                                        </span>
                                        <span className="text-xs text-slate-400 max-w-sm">
                                            لم يتم العثور على سجلات مطابقة للبحث أو الفلترة. قم بإنشاء تحويل جديد بالضغط على زر &quot;تحويل جديد&quot;.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            transfers.map((t) => (
                                <tr
                                    key={t.id}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                                >
                                    <td className="py-3.5 px-4">
                                        <button
                                            type="button"
                                            onClick={() => onView(t)}
                                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            {t.transfer_no}
                                        </button>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                        {new Date(t.created_at).toLocaleDateString('ar-EG')}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                                            {getBranchName(t, 'from')}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                                            {getBranchName(t, 'to')}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-2xs">
                                            {t.items_count || t.items?.length || 0} صنف
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                        المدير
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {/* View Details */}
                                            <button
                                                type="button"
                                                onClick={() => onView(t)}
                                                title="عرض التفاصيل"
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                            >
                                                <Icons.Eye />
                                            </button>

                                            {/* Pending -> Ship */}
                                            {t.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onShip(t.id)}
                                                    title="تأكيد الشحن والارسال"
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Icons.Truck />
                                                    شحن
                                                </button>
                                            )}

                                            {/* In Transit -> Receive */}
                                            {t.status === 'in_transit' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onReceive(t.id)}
                                                    title="استلام وإيداع المخزون"
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Icons.Check />
                                                    استلام
                                                </button>
                                            )}

                                            {/* Cancel if not completed */}
                                            {t.status !== 'completed' && t.status !== 'cancelled' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onCancel(t.id)}
                                                    title="إلغاء التحويل"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                >
                                                    <Icons.X />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>عرض {transfers.length} سجل</span>
                <span>الصفحة 1 من 1</span>
            </div>
        </div>
    );
};
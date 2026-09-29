import React from'react';
import {
 Coins,
 Building2,
 Copy,
 CheckCircle2,
 AlertTriangle,
 Loader2,
 Lock,
 CreditCard,
 FileText,
} from'lucide-react';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Label } from'@/components/ui/label';
import { Textarea } from'@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { formatNumber } from'@/lib/format';
import type { Treasury } from'@/types';
import type { ShiftFinancialMetrics } from'./types';

interface ShiftPhysicalAuditTabProps {
 metrics: ShiftFinancialMetrics;
 actualCash: string;
 setActualCash: (val: string) => void;
 actualCard: string;
 setActualCard: (val: string) => void;
 destinationTreasuryId: string;
 setDestinationTreasuryId: (id: string) => void;
 treasuries: Treasury[];
 closeNotes: string;
 setCloseNotes: (val: string) => void;
 isBusy: boolean;
 onConfirmClose: () => void;
}

export function ShiftPhysicalAuditTab({
 metrics,
 actualCash,
 setActualCash,
 actualCard,
 setActualCard,
 destinationTreasuryId,
 setDestinationTreasuryId,
 treasuries,
 closeNotes,
 setCloseNotes,
 isBusy,
 onConfirmClose,
}: ShiftPhysicalAuditTabProps) {
 const actualCashVal = parseFloat(String(actualCash).replace(/,/g,'')) || 0;
 const cashDiff = actualCashVal - metrics.expectedDrawerCash;

 const actualCardVal = parseFloat(String(actualCard).replace(/,/g,'')) || 0;
 const cardDiff = actualCardVal - metrics.totalCardSales;

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Right: إدخال الجرد الفعلي */}
 <div className="space-y-4">
 {/* الجرد الفعلي للنقدية */}
 <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
 <Coins className="w-3.5 h-3.5"/>
 </div>
 <span>الجرد الفعلي للنقدية (كاش الدرج)</span>
 <span className="text-rose-500 font-bold">*</span>
 </Label>
 <span className="text-2xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
 المتوقع: {formatNumber(metrics.expectedDrawerCash)} ج.م
 </span>
 </div>

 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <Input
 type="number"
 step="any"
 value={actualCash}
 onChange={(e) => setActualCash(e.target.value)}
 className="h-12 rounded-xl text-base font-black font-mono pr-4 text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500"
 placeholder="0.00"
 />
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={() => setActualCash(String(metrics.expectedDrawerCash))}
 title="نسخ الرصيد المتوقع بالكامل للمطابقة السريعة"
 className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
 >
 <Copy className="w-3.5 h-3.5"/>
 <span>مطابقة</span>
 </Button>
 </div>

 {/* Live Difference Badge for Cash */}
 <div className="flex items-center justify-between pt-1 text-xs font-bold">
 <span className="text-slate-500">فارق العجز أو الزيادة:</span>
 {Math.abs(cashDiff) < 0.01 ? (
 <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
 <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
 <span>مطابق تماماً (لا يوجد فارق)</span>
 </span>
 ) : cashDiff > 0 ? (
 <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-xl border border-blue-200/60 dark:border-blue-800/60 font-mono">
 <Coins className="w-4 h-4 text-blue-600"/>
 <span>زيادة بالدرج: +{formatNumber(cashDiff)} ج.م</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-xl border border-rose-200/60 dark:border-rose-800/60 font-mono">
 <AlertTriangle className="w-4 h-4 text-rose-600"/>
 <span>عجز بالدرج: {formatNumber(cashDiff)} ج.م</span>
 </span>
 )}
 </div>
 </div>

 {/* جرد ماكينة الفيزا */}
 <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
 <CreditCard className="w-3.5 h-3.5"/>
 </div>
 <span>جرد ماكينة الفيزا (البطاقة)</span>
 </Label>
 <span className="text-2xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
 المتوقع: {formatNumber(metrics.totalCardSales)} ج.م
 </span>
 </div>

 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <Input
 type="number"
 step="any"
 value={actualCard}
 onChange={(e) => setActualCard(e.target.value)}
 className="h-12 rounded-xl text-base font-black font-mono pr-4 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
 placeholder="0.00"
 />
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={() => setActualCard(String(metrics.totalCardSales))}
 title="مطابقة رصيد بطاقات الفيزا"
 className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
 >
 <Copy className="w-3.5 h-3.5"/>
 <span>مطابقة</span>
 </Button>
 </div>

 {/* Live Difference Badge for Card */}
 <div className="flex items-center justify-between pt-1 text-xs font-bold">
 <span className="text-slate-500">فارق ماكينة الفيزا:</span>
 {Math.abs(cardDiff) < 0.01 ? (
 <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
 <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
 <span>إيصالات الماكينة مطابقة</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200/60 dark:border-amber-800/60 font-mono">
 <AlertTriangle className="w-4 h-4 text-amber-600"/>
 <span>فارق ماكينة: {formatNumber(cardDiff)} ج.م</span>
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Left: ترحيل النقدية والملاحظات */}
 <div className="space-y-4">
 {/* خزينة الترحيل */}
 <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
 <Label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
 <Building2 className="w-3.5 h-3.5"/>
 </div>
 <span>ترحيل وإيداع النقدية الصافية في:</span>
 </Label>
 <Select value={destinationTreasuryId} onValueChange={setDestinationTreasuryId}>
 <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold">
 <SelectValue placeholder="اختر الخزينة أو الخزنة المستقبلة"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-surface">
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id} className="text-xs sm:text-sm font-semibold cursor-pointer">
 {t.name} (رصيدها الحالي: {formatNumber(t.current_balance)} ج.م)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <p className="text-2xs text-slate-400 font-semibold">
 سيتم تسجيل إيداع تلقائي في الخزينة المختارة وتصفير عهدة درج الكاشير للوردية.
 </p>
 </div>

 {/* ملاحظات التدقيق */}
 <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
 <Label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
 <FileText className="w-3.5 h-3.5"/>
 </div>
 <span>ملاحظات التدقيق والتسوية (اختياري):</span>
 </Label>
 <Textarea
 value={closeNotes}
 onChange={(e) => setCloseNotes(e.target.value)}
 placeholder="اكتب أي ملاحظات حول العجز أو الزيادة أو سبب الإغلاق الإداري..."
 className="rounded-xl resize-none h-24 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
 />
 </div>
 </div>
 </div>

 {/* Confirmation Button */}
 <div className="pt-2">
 <button
 type="button"
 onClick={onConfirmClose}
 disabled={isBusy}
 className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
 >
 {isBusy ? (
 <Loader2 className="w-5 h-5 animate-spin"/>
 ) : (
 <>
 <Lock className="w-5 h-5"/>
 <span>تأكيد التدقيق وإغلاق الوردية نهائياً</span>
 </>
 )}
 </button>
 </div>
 </div>
 );
}
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Settings,
    Receipt,
    Bell,
    AlertTriangle,
    CheckCircle2,
    Zap,
} from 'lucide-react';

interface AdvancedSettingsSectionProps {
    isTaxable: boolean;
    setIsTaxable: (val: boolean) => void;
    enableMinStockAlert: boolean;
    setEnableMinStockAlert: (val: boolean) => void;
    minStockAlert: string;
    setMinStockAlert: (val: string) => void;
    isActiveForSale: boolean;
    setIsActiveForSale: (val: boolean) => void;
    isQuickPos: boolean;
    setIsQuickPos: (val: boolean) => void;
    productNotes: string;
    setProductNotes: (val: string) => void;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
    isTaxable,
    setIsTaxable,
    enableMinStockAlert,
    setEnableMinStockAlert,
    minStockAlert,
    setMinStockAlert,
    isActiveForSale,
    setIsActiveForSale,
    isQuickPos,
    setIsQuickPos,
    productNotes,
    setProductNotes,
}) => {
    return (
        <Card className="border border-slate-200/90 dark:border-slate-800 bg-surface shadow-xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>إعدادات متقدمة</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* صنف ضريبي */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                            <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                            <Label
                                htmlFor="taxable-switch"
                                className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                                صنف ضريبي
                            </Label>
                            <p className="text-3xs text-slate-500">
                                خاضع لضريبة القيمة المضافة (14%)
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="taxable-switch"
                        checked={isTaxable}
                        onCheckedChange={setIsTaxable}
                    />
                </div>

                {/* تفعيل تنبيهات النواقص */}
                <div className="space-y-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <Label
                                    htmlFor="min-stock-switch"
                                    className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    تفعيل تنبيهات النواقص
                                </Label>
                                <p className="text-3xs text-slate-500">
                                    إظهار إشعار عند وصول الصنف للحد الأدنى أو نفاده
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="min-stock-switch"
                            checked={enableMinStockAlert}
                            onCheckedChange={setEnableMinStockAlert}
                        />
                    </div>

                    {enableMinStockAlert && (
                        <div className="pt-2">
                            <Label className="block text-2xs font-black text-slate-600 dark:text-slate-400 mb-1">
                                حد تنبيه النواقص (بالوحدة الأساسية)
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0}
                                    value={minStockAlert}
                                    onChange={(e) => setMinStockAlert(e.target.value)}
                                    className="h-10 text-xs font-mono font-bold pl-8"
                                />
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-3 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* صنف نشط في البيع */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                            <Label
                                htmlFor="active-sale-switch"
                                className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                                صنف نشط في البيع
                            </Label>
                            <p className="text-3xs text-slate-500">
                                إتاحة الصنف للبيع والبحث بالفواتير
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="active-sale-switch"
                        checked={isActiveForSale}
                        onCheckedChange={setIsActiveForSale}
                    />
                </div>

                {/* صنف سريع (POS Quick Access) */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <Label
                                htmlFor="quick-pos-switch"
                                className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                                صنف سريع (POS Quick Access)
                            </Label>
                            <p className="text-3xs text-slate-500">
                                إظهار الصنف في قائمة الوصول السريع بشاشة الكاشير
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="quick-pos-switch"
                        checked={isQuickPos}
                        onCheckedChange={setIsQuickPos}
                    />
                </div>

                {/* ملاحظات الصنف */}
                <div>
                    <Label className="block text-2xs font-black text-slate-600 dark:text-slate-400 mb-1">
                        ملاحظات الصنف
                    </Label>
                    <Textarea
                        rows={2}
                        value={productNotes}
                        onChange={(e) => setProductNotes(e.target.value)}
                        placeholder="أي تعليمات أو ملاحظات إضافية..."
                        className="text-xs resize-none"
                    />
                </div>
            </CardContent>
        </Card>
    );
};
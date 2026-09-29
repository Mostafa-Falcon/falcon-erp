'use client';

import React, { useState } from'react';
import { Settings2 } from'lucide-react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Switch } from'@/components/ui/switch';
import { Label } from'@/components/ui/label';
import type { BarcodeSettings } from'../types';

interface BarcodeSettingsModalProps {
 isOpen: boolean;
 onClose: () => void;
 settings: BarcodeSettings;
 onSave: (settings: BarcodeSettings) => void;
}

export function BarcodeSettingsModal({
 isOpen,
 onClose,
 settings: initialSettings,
 onSave,
}: BarcodeSettingsModalProps) {
 const [localSettings, setLocalSettings] = useState<BarcodeSettings>(initialSettings);

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-md"dir="rtl">
 <DialogHeader className="text-right">
 <div className="flex items-center gap-2 text-foreground font-black text-base">
 <Settings2 className="w-5 h-5 text-[#0f766e]"/>
 <DialogTitle>إدارة إعدادات الملصقات</DialogTitle>
 </div>
 <DialogDescription className="text-xs text-muted-foreground">
 تخصيص مقاس ورق الطباعة والبيانات المعروضة على ملصق الباركود
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-5 py-2">
 {/* Label Size Selection */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">
 مقاس ورق الطباعة
 </Label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id:'38x25', label:'حراري 38x25mm', desc:'صغير'},
 { id:'50x25', label:'حراري 50x25mm', desc:'قياسي'},
 { id:'a4_3x10', label:'A4 (3x10)', desc:'30 ملصق'},
 ].map((sz) => (
 <button
 key={sz.id}
 type="button"
 onClick={() =>
 setLocalSettings((prev) => ({
 ...prev,
 labelSize: sz.id as BarcodeSettings['labelSize'],
 }))
 }
 className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
 localSettings.labelSize === sz.id
 ?'border-[#0f766e] bg-teal-50/60 dark:bg-teal-950/40 text-[#0f766e] dark:text-teal-300 ring-1 ring-[#0f766e]'
 :'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
 }`}
 >
 <div className="text-xs font-bold">{sz.label}</div>
 <div className="text-3xs opacity-70 mt-0.5">{sz.desc}</div>
 </button>
 ))}
 </div>
 </div>

 {/* Visibility Toggles with shadcn Switch */}
 <div className="space-y-3 pt-3 border-t border-border">
 <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
 <Label htmlFor="toggle-org"className="text-xs font-bold text-foreground cursor-pointer flex-1">
 طباعة اسم المنشأة / الشركة في أعلى الملصق
 </Label>
 <Switch
 id="toggle-org"
 checked={localSettings.showOrgName}
 onCheckedChange={(checked) =>
 setLocalSettings((prev) => ({ ...prev, showOrgName: checked }))
 }
 />
 </div>

 <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
 <Label htmlFor="toggle-price"className="text-xs font-bold text-foreground cursor-pointer flex-1">
 طباعة سعر البيع على الملصق
 </Label>
 <Switch
 id="toggle-price"
 checked={localSettings.showPrice}
 onCheckedChange={(checked) =>
 setLocalSettings((prev) => ({ ...prev, showPrice: checked }))
 }
 />
 </div>

 <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
 <Label htmlFor="toggle-sku"className="text-xs font-bold text-foreground cursor-pointer flex-1">
 طباعة أرقام الباركود نصياً أسفل الخطوط
 </Label>
 <Switch
 id="toggle-sku"
 checked={localSettings.showSkuText}
 onCheckedChange={(checked) =>
 setLocalSettings((prev) => ({ ...prev, showSkuText: checked }))
 }
 />
 </div>
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
 <Button
 type="button"
 variant="ghost"
 onClick={onClose}
 className="text-xs font-bold cursor-pointer"
 >
 إلغاء
 </Button>
 <Button
 type="button"
 onClick={() => onSave(localSettings)}
 className="bg-[#0f766e] hover:bg-[#0f766e]/90 text-white text-xs font-bold cursor-pointer"
 >
 حفظ الإعدادات
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
import React, { useMemo, useState } from 'react';
import { safeLower } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    ImagePlus,
    Trash2,
    Wand2,
    Barcode,
    Plus,
    X,
    MapPin,
    Check,
} from 'lucide-react';

interface BasicInfoSectionProps {
    showSpecs: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    imageUrl: string;
    setImageUrl: (url: string) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    setName: (val: string) => void;
    existingNames: { id: string; name: string; sku: string }[];
    scientificName: string;
    setScientificName: (val: string) => void;
    nameEn: string;
    setNameEn: (val: string) => void;
    sku: string;
    setSku: (val: string) => void;
    handleGenerateRandomBarcode: () => void;
    alternateBarcodes: string[];
    handleAddAlternateBarcode: () => void;
    handleUpdateAlternateBarcode: (idx: number, val: string) => void;
    handleRemoveAlternateBarcode: (idx: number) => void;
    shelfLocation: string;
    setShelfLocation: (val: string) => void;
    isPharmacy?: boolean;
    canUploadProductImages?: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    showSpecs,
    fileInputRef,
    imageUrl,
    setImageUrl,
    handleImageUpload,
    name,
    setName,
    existingNames,
    scientificName,
    setScientificName,
    nameEn,
    setNameEn,
    sku,
    setSku,
    handleGenerateRandomBarcode,
    alternateBarcodes,
    handleAddAlternateBarcode,
    handleUpdateAlternateBarcode,
    handleRemoveAlternateBarcode,
    shelfLocation,
    setShelfLocation,
    isPharmacy = false,
    canUploadProductImages = false,
}) => {
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);

    const nameSuggestions = useMemo(() => {
        const q = safeLower(name).replace(/\s+/g, ' ').trim();
        const matches = existingNames.filter((p) => safeLower(p.name).includes(q));
        return matches.slice(0, 8);
    }, [existingNames, name]);

    const exactNameExists = nameSuggestions.some(
        (p) => safeLower(p.name).replace(/\s+/g, ' ').trim() === safeLower(name).replace(/\s+/g, ' ').trim()
    );

    return (
        <Card className="border border-slate-200/90 dark:border-slate-800 bg-surface shadow-xs rounded-2xl">
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* الحقول الأساسية: الاسم والباركود والرف والمواصفات / المادة الفعالة */}
                    <div className={canUploadProductImages ? "lg:col-span-9 space-y-4" : "lg:col-span-12 space-y-4"}>
                        {/* السطر الأول: الاسم الرئيسي مع المواصفات إن فُعّلت */}
                        <div
                            className={`grid grid-cols-1 ${showSpecs ? 'sm:grid-cols-3' : 'sm:grid-cols-1'
                                } gap-3`}
                        >
                            <div className="relative">
                                <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                                    {isPharmacy ? 'اسم الدواء / التجاري *' : 'اسم الصنف / الخامة *'}
                                </Label>
                                <Input
                                    type="text"
                                    required
                                    value={name}
                                    autoComplete="off"
                                    onFocus={() => setShowNameSuggestions(true)}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setShowNameSuggestions(true);
                                    }}
                                    onBlur={() => setShowNameSuggestions(false)}
                                    placeholder={
                                        isPharmacy
                                            ? 'مثال: بنادول إكسترا 500 مجم / Panadol Extra...'
                                            : 'مثال: اسم الصنف أو الخامة أو البند المطلوب...'
                                    }
                                    className="h-11 text-xs font-bold rounded-xl"
                                />
                                {showNameSuggestions && nameSuggestions.length > 0 && (
                                    <div className="absolute right-0 left-0 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded-xl border-2 border-blue-500/70 bg-surface shadow-2xl">
                                        <div className="px-3 py-1.5 text-3xs font-bold text-slate-500">
                                            أسماء مسجّلة مسبقًا — اضغط لاستخدام الاسم بالضبط
                                        </div>
                                        {nameSuggestions.map((p) => {
                                            const isExact =
                                                safeLower(p.name).replace(/\s+/g, ' ').trim() ===
                                                safeLower(name).replace(/\s+/g, ' ').trim();
                                            return (
                                                <button
                                                    type="button"
                                                    key={p.id}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setName(p.name);
                                                        setShowNameSuggestions(false);
                                                    }}
                                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-right text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 border-t border-slate-100 dark:border-slate-800 first:border-0"
                                                >
                                                    <span className="font-black text-slate-800 dark:text-slate-100">{p.name}</span>
                                                    <span className="flex items-center gap-2 shrink-0">
                                                        {p.sku && (
                                                            <span className="font-mono text-3xs text-slate-400">{p.sku}</span>
                                                        )}
                                                        {isExact && (
                                                            <span className="text-3xs font-black text-rose-600 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> موجود بالفعل
                                                            </span>
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {exactNameExists && !showNameSuggestions && (
                                    <p className="mt-1 text-3xs font-black text-rose-600">
                                        هذا الاسم مسجّل بالفعل — سيُمنع الحفظ لتجنب التكرار.
                                    </p>
                                )}
                            </div>

                            {showSpecs && (
                                <>
                                    <div>
                                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                                            <span>{isPharmacy ? 'المادة الفعالة / الاسم العلمي *' : 'الوصف الإضافي / المواصفات'}</span>
                                            {isPharmacy && (
                                                <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md">
                                                    للبدائل والمثائل
                                                </span>
                                            )}
                                        </Label>
                                        <Input
                                            type="text"
                                            value={scientificName}
                                            onChange={(e) => setScientificName(e.target.value)}
                                            placeholder={
                                                isPharmacy
                                                    ? 'مثال: Paracetamol 500mg + Caffeine 65mg (Active Ingredient)'
                                                    : 'وصف إضافي، ماركة، أو مواصفات فنية وموديل'
                                            }
                                            className="h-11 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                                            {isPharmacy ? 'الاسم بالإنجليزي (Trade Name EN)' : 'اسم الصنف (بالإنجليزي)'}
                                        </Label>
                                        <Input
                                            type="text"
                                            value={nameEn}
                                            onChange={(e) => setNameEn(e.target.value)}
                                            placeholder={isPharmacy ? 'e.g. Panadol Extra 500mg' : 'Product Name in English'}
                                            dir="ltr"
                                            className="h-11 text-xs text-left rounded-xl"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* السطر الثاني: الباركود والمكان / الرف */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                            <div className={showSpecs ? 'sm:col-span-7' : 'sm:col-span-12'}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <Label className="text-xs font-black text-slate-700 dark:text-slate-300">
                                        {isPharmacy ? 'الباركود الرئيسي للدواء (EAN / GS1)' : 'الباركود الرئيسي'}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleGenerateRandomBarcode}
                                        className="h-6 px-1.5 text-2xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-1 cursor-pointer rounded-lg"
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        <span>توليد باركود تلقائي</span>
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                        placeholder={
                                            isPharmacy
                                                ? 'امسح باركود العلبة بماسح الباركود أو ادخله يدوياً'
                                                : 'الباركود الدولي أو المحلي (اختياري)'
                                        }
                                        className="h-11 text-xs font-mono rounded-xl pl-9"
                                    />
                                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                                </div>

                                {/* زر إضافة باركود بديل */}
                                <div className="mt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddAlternateBarcode}
                                        className="h-7 px-2 text-2xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 cursor-pointer rounded-lg"
                                    >
                                        <Plus className="w-3 h-3 text-emerald-600" />
                                        <span>إضافة باركود بديل</span>
                                    </Button>

                                    {alternateBarcodes.length > 0 && (
                                        <div className="space-y-1.5 mt-2">
                                            {alternateBarcodes.map((b, bIdx) => (
                                                <div key={bIdx} className="flex items-center gap-2">
                                                    <Input
                                                        type="text"
                                                        value={b}
                                                        onChange={(e) =>
                                                            handleUpdateAlternateBarcode(bIdx, e.target.value)
                                                        }
                                                        placeholder={`باركود بديل ${bIdx + 1}`}
                                                        className="h-9 text-xs font-mono rounded-lg flex-1"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveAlternateBarcode(bIdx)}
                                                        className="w-8 h-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showSpecs && (
                                <div className="sm:col-span-5">
                                    <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                                        {isPharmacy ? 'مكان الدواء / الرف / الثلاجة' : 'مكان التخزين / الرف / القسم'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={shelfLocation}
                                            onChange={(e) => setShelfLocation(e.target.value)}
                                            placeholder={
                                                isPharmacy
                                                    ? 'مثال: رف A-12 / ثلاجة أدوية / درج 3'
                                                    : 'مثال: رف A-12 / قسم 3'
                                            }
                                            className="h-11 text-xs rounded-xl pl-9"
                                        />
                                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* صندوق صورة الصنف / الدواء (متاح حصرياً لباقة VIP جولد) */}
                    {canUploadProductImages && (
                        <div className="lg:col-span-3 flex flex-col items-center justify-center">
                            <Input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-4/3 sm:aspect-square max-w-[190px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all relative overflow-hidden group shadow-2xs"
                            >
                                {imageUrl ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrl}
                                            alt={name || (isPharmacy ? 'صورة الدواء' : 'صورة الصنف')}
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImageUrl('');
                                                }}
                                                className="w-8 h-8 rounded-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-2xs">
                                            <ImagePlus className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                            {isPharmacy ? 'صورة علبة الدواء' : 'صورة الصنف'}
                                        </span>
                                        <span className="text-3xs text-slate-400 mt-0.5">
                                            انقر للرفع (PNG, JPG)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
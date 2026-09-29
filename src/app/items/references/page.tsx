'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { formatNumber } from'@/lib/format';
import type { Product, ProductBrand, ProductCategory, Unit } from'@/types';

type TabKey ='categories'|'brands'|'units';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
 { key:'categories', label:'الفئات', icon: <Icons.Filter /> },
 { key:'brands', label:'الماركات', icon: <Icons.Boxes /> },
 { key:'units', label:'وحدات القياس', icon: <Icons.Items /> },
];

function ReferencesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [tab, setTab] = useState<TabKey>('categories');
 const [categories, setCategories] = useState<ProductCategory[]>([]);
 const [brands, setBrands] = useState<ProductBrand[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Add forms
 const [newCatName, setNewCatName] = useState('');
 const [newCatCode, setNewCatCode] = useState('');
 const [newBrandName, setNewBrandName] = useState('');
 const [newUnitName, setNewUnitName] = useState('');
 const [newUnitSymbol, setNewUnitSymbol] = useState('');
 const [formError, setFormError] = useState('');
 const [isSaving, setIsSaving] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const [cats, brs, unts, prods] = await Promise.all([
 ProductRepository.getCategories(orgId),
 ProductRepository.getBrands(orgId),
 ProductRepository.getAllUnits(orgId),
 ProductRepository.getAll(orgId),
 ]);
 setCategories(cats.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setBrands(brs.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setUnits(unts.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setProducts(prods);
 } catch (err) {
 console.error('Load references error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (!orgId) return;
 Promise.resolve().then(loadData);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const countFor = (field:'category_id'|'brand_id'|'base_unit_id', id: string) =>
 products.filter((p) => p[field] === id).length;

 const addCategory = async () => {
 setFormError('');
 if (!newCatName.trim()) {
 setFormError('اكتب اسم الفئة.');
 return;
 }
 setIsSaving(true);
 try {
 await ProductRepository.createCategory(newCatName, orgId, newCatCode.trim() || undefined);
 setNewCatName('');
 setNewCatCode('');
 await loadData();
 } catch (err) {
 console.error(err);
 setFormError(err instanceof Error ? err.message :'حدث خطأ.');
 } finally {
 setIsSaving(false);
 }
 };

 const toggleCategory = async (cat: ProductCategory) => {
 await ProductRepository.updateCategory(cat.id, { is_active: !cat.is_active });
 await loadData();
 };

 const addBrand = async () => {
 setFormError('');
 if (!newBrandName.trim()) {
 setFormError('اكتب اسم الماركة.');
 return;
 }
 setIsSaving(true);
 try {
 await ProductRepository.createBrand(newBrandName, orgId);
 setNewBrandName('');
 await loadData();
 } catch (err) {
 console.error(err);
 setFormError(err instanceof Error ? err.message :'حدث خطأ.');
 } finally {
 setIsSaving(false);
 }
 };

 const addUnit = async () => {
 setFormError('');
 if (!newUnitName.trim()) {
 setFormError('اكتب اسم الوحدة.');
 return;
 }
 setIsSaving(true);
 try {
 await ProductRepository.createUnit(newUnitName, newUnitSymbol, orgId);
 setNewUnitName('');
 setNewUnitSymbol('');
 await loadData();
 } catch (err) {
 console.error(err);
 setFormError(err instanceof Error ? err.message :'حدث خطأ.');
 } finally {
 setIsSaving(false);
 }
 };

 const toggleUnit = async (u: Unit) => {
 await ProductRepository.updateUnit(u.id, { is_active: !u.is_active });
 await loadData();
 };

 return (
 <AppShell
 title="مراجع الأصناف"
 subtitle="إدارة الفئات والماركات ووحدات القياس — كل منشأة بقوائم مراجع مستقلة"
 >
 {/* Tabs */}
 <div className="flex items-center gap-2 bg-surface p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit">
 {TABS.map((t) => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={`px-4 h-9 rounded-xl flex items-center gap-2 text-xs font-black transition-colors cursor-pointer ${
 tab === t.key
 ?'bg-[#558b2f] text-white shadow-xs'
 :'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
 }`}
 >
 <span className={tab === t.key ?'text-white':'text-slate-400'}>{t.icon}</span>
 {t.label}
 </button>
 ))}
 </div>

 {formError && (
 <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300">
 {formError}
 </div>
 )}

 {isLoading ? (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 py-16 text-center text-slate-400 text-xs font-semibold">
 جاري التحميل...
 </div>
 ) : tab ==='categories'? (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
 <span className="text-sm font-black text-slate-900 dark:text-white">الفئات</span>
 <div className="flex gap-2 mr-auto">
 <Input
 type="text"
 value={newCatName}
 onChange={(e) => setNewCatName(e.target.value)}
 onKeyDown={(e) => e.key ==='Enter'&& addCategory()}
 placeholder="اسم الفئة"
 className="h-9 w-44 bg-slate-50 dark:bg-slate-900 text-xs"
 />
 <Input
 type="text"
 value={newCatCode}
 onChange={(e) => setNewCatCode(e.target.value)}
 onKeyDown={(e) => e.key ==='Enter'&& addCategory()}
 placeholder="كود (اختياري)"
 className="h-9 w-28 bg-slate-50 dark:bg-slate-900 text-xs"
 />
 <Button onClick={addCategory} disabled={isSaving} className="h-9 px-4 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
 <Icons.Plus /> إضافة
 </Button>
 </div>
 </div>
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
 <th className="py-3 px-4">الاسم</th>
 <th className="py-3 px-4">الكود</th>
 <th className="py-3 px-4">عدد الأصناف</th>
 <th className="py-3 px-4">الحالة</th>
 <th className="py-3 px-4 text-center">تعطيل/تفعيل</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
 {categories.length === 0 ? (
 <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-semibold">لا توجد فئات بعد.</td></tr>
 ) : (
 categories.map((c) => (
 <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
 <td className="py-3 px-4 font-mono text-slate-500">{c.code ||'—'}</td>
 <td className="py-3 px-4 font-black">{formatNumber(countFor('category_id', c.id))}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${c.is_active ?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300':'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
 {c.is_active ?'نشطة':'معطّلة'}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <button
 onClick={() => toggleCategory(c)}
 className="px-2 py-1 rounded-lg text-3xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#558b2f] hover:border-[#558b2f] transition-colors cursor-pointer"
 >
 {c.is_active ?'تعطيل':'تفعيل'}
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 ) : tab ==='brands'? (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
 <span className="text-sm font-black text-slate-900 dark:text-white">الماركات</span>
 <div className="flex gap-2 mr-auto">
 <Input
 type="text"
 value={newBrandName}
 onChange={(e) => setNewBrandName(e.target.value)}
 onKeyDown={(e) => e.key ==='Enter'&& addBrand()}
 placeholder="اسم الماركة"
 className="h-9 w-44 bg-slate-50 dark:bg-slate-900 text-xs"
 />
 <Button onClick={addBrand} disabled={isSaving} className="h-9 px-4 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
 <Icons.Plus /> إضافة
 </Button>
 </div>
 </div>
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
 <th className="py-3 px-4">الاسم</th>
 <th className="py-3 px-4">عدد الأصناف</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
 {brands.length === 0 ? (
 <tr><td colSpan={2} className="py-10 text-center text-slate-400 font-semibold">لا توجد ماركات بعد.</td></tr>
 ) : (
 brands.map((b) => (
 <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.name}</td>
 <td className="py-3 px-4 font-black">{formatNumber(countFor('brand_id', b.id))}</td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
 <span className="text-sm font-black text-slate-900 dark:text-white">وحدات القياس</span>
 <div className="flex gap-2 mr-auto">
 <Input
 type="text"
 value={newUnitName}
 onChange={(e) => setNewUnitName(e.target.value)}
 onKeyDown={(e) => e.key ==='Enter'&& addUnit()}
 placeholder="الاسم (قطعة، علبة، كجم)"
 className="h-9 w-44 bg-slate-50 dark:bg-slate-900 text-xs"
 />
 <Input
 type="text"
 value={newUnitSymbol}
 onChange={(e) => setNewUnitSymbol(e.target.value)}
 onKeyDown={(e) => e.key ==='Enter'&& addUnit()}
 placeholder="الرمز (pcs, kg)"
 className="h-9 w-28 bg-slate-50 dark:bg-slate-900 text-xs"
 />
 <Button onClick={addUnit} disabled={isSaving} className="h-9 px-4 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
 <Icons.Plus /> إضافة
 </Button>
 </div>
 </div>
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
 <th className="py-3 px-4">الاسم</th>
 <th className="py-3 px-4">الرمز</th>
 <th className="py-3 px-4">عدد الأصناف</th>
 <th className="py-3 px-4">الحالة</th>
 <th className="py-3 px-4 text-center">تعطيل/تفعيل</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
 {units.length === 0 ? (
 <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-semibold">لا توجد وحدات بعد.</td></tr>
 ) : (
 units.map((u) => (
 <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{u.name}</td>
 <td className="py-3 px-4 font-mono text-slate-500">{u.symbol}</td>
 <td className="py-3 px-4 font-black">{formatNumber(countFor('base_unit_id', u.id))}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${u.is_active ?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300':'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
 {u.is_active ?'نشطة':'معطّلة'}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <button
 onClick={() => toggleUnit(u)}
 className="px-2 py-1 rounded-lg text-3xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#558b2f] hover:border-[#558b2f] transition-colors cursor-pointer"
 >
 {u.is_active ?'تعطيل':'تفعيل'}
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}
 </AppShell>
 );
}

export default function ReferencesPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <ReferencesContent />
 </Suspense>
 );
}
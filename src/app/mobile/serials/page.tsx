'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/core/db/app_database';
import { ProductSerialRepository } from '@/modules/mobile/product_serial_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QrCode,
  Plus,
  Search,
  CheckCircle2,
  PackageCheck,
  Smartphone,
  ShieldCheck,
  Loader2,
  Building2,
  Tag,
} from 'lucide-react';
import type {
  ProductSerial,
  Product,
  Warehouse,
  DeviceCondition,
  SerialStatus,
} from '@/types';
import { toast } from 'sonner';

const STATUS_LABELS: Record<SerialStatus, { label: string; color: string }> = {
  in_stock: { label: 'متوفر بالمخزن', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' },
  sold: { label: 'مُباع', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300' },
  under_maintenance: { label: 'في الصيانة', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300' },
  returned: { label: 'مرتجع', color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300' },
  transferred: { label: 'محول لفرع آخر', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300' },
  damaged: { label: 'تالف', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300' },
};

const CONDITION_LABELS: Record<DeviceCondition, { label: string; color: string }> = {
  new: { label: 'جديد (زيرو)', color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300' },
  used: { label: 'مستعمل (كسر زيرو)', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300' },
  refurbished: { label: 'مجعد / صيانة مصنع', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300' },
};

export default function SerialsPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [serials, setSerials] = useState<ProductSerial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  // Modal State
  const [isNewSerialOpen, setIsNewSerialOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [imei2, setImei2] = useState('');
  const [condition, setCondition] = useState<DeviceCondition>('new');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [sList, pList, wList] = await Promise.all([
        db.product_serials.where('org_id').equals(orgId).reverse().toArray(),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active).toArray(),
        db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
      ]);

      setSerials(sList);
      setProducts(pList);
      setWarehouses(wList);
      if (wList.length > 0) setTargetWarehouseId(wList[0].id);
    } catch (err) {
      console.error('Error loading serials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filteredSerials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return serials.filter((s) => {
      const matchesSearch =
        !q ||
        s.serial_number.toLowerCase().includes(q) ||
        (s.imei2 || '').toLowerCase().includes(q) ||
        (s.product_name || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || s.condition === conditionFilter;

      return matchesSearch && matchesStatus && matchesCondition;
    });
  }, [serials, searchQuery, statusFilter, conditionFilter]);

  const handleRegisterSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedProductId || !serialNumber.trim()) {
      toast.error('يرجى اختيار الجهاز وإدخال رقم الـ IMEI / السيريال');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    try {
      setIsSaving(true);
      await ProductSerialRepository.registerSerial({
        orgId,
        branchId: currentUser.branch_id || '',
        warehouseId: targetWarehouseId,
        productId: prod.id,
        productName: prod.name,
        serialNumber: serialNumber.trim(),
        imei2: imei2.trim(),
        condition,
        costPrice: parseFloat(costPrice) || prod.cost_price || prod.purchase_price,
        sellingPrice: parseFloat(sellingPrice) || prod.sale_price,
        warrantyMonths: parseInt(warrantyMonths, 10) || 12,
        notes: notes.trim(),
      });

      toast.success(`تم تسجيل جهاز بـ IMEI «${serialNumber.trim()}» بنجاح في المخزن`);
      setIsNewSerialOpen(false);
      setSelectedProductId('');
      setSerialNumber('');
      setImei2('');
      setCostPrice('');
      setSellingPrice('');
      setNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل السيريال');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="تتبع السيريال والـ IMEI للأجهزة"
      subtitle="إدارة أرقام الـ IMEI للأجهزة الجديدة والمستعملة وتتبع فترات الضمان والبيع"
      actions={
        <Button
          onClick={() => setIsNewSerialOpen(true)}
          className="h-11 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل جهاز / IMEI جديد</span>
        </Button>
      }
    >
      <div className="space-y-6 text-right" dir="rtl">

      {/* Toolbar Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الـ IMEI 1، IMEI 2، أو اسم موديل الجهاز..."
            className="pr-10 h-11 rounded-2xl bg-surface text-xs font-semibold border-slate-200 dark:border-slate-800"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 rounded-2xl bg-surface text-xs font-bold border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="تصفية بالحالة..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كافة الحالات</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, st]) => (
              <SelectItem key={key} value={key}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="h-11 rounded-2xl bg-surface text-xs font-bold border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="تصفية بحالة الجهاز..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كافة حالات الأجهزة</SelectItem>
            {Object.entries(CONDITION_LABELS).map(([key, cd]) => (
              <SelectItem key={key} value={key}>
                {cd.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
          <span>جاري تحميل سجل السيريالات والـ IMEI...</span>
        </div>
      ) : filteredSerials.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 bg-surface rounded-3xl border border-slate-200 dark:border-slate-800">
          لا توجد أرقام IMEI مطابقة لبيانات البحث
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">اسم الجهاز / الموديل</th>
                  <th className="py-3 px-3">رقم IMEI 1 / Serial</th>
                  <th className="py-3 px-3">رقم IMEI 2</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 text-center">حالة الجهاز</th>
                  <th className="py-3 px-3 text-center">الضمان</th>
                  <th className="py-3 px-4 text-left">التكلفة / سعر البيع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredSerials.map((s) => {
                  const st = STATUS_LABELS[s.status];
                  const cd = CONDITION_LABELS[s.condition];

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>{s.product_name || 'جهاز ذكي'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {s.serial_number}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {s.imei2 || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-3xs font-bold border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-3xs font-bold border ${cd.color}`}>
                          {cd.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        {s.warranty_months} شهر
                      </td>
                      <td className="py-3 px-4 text-left font-mono">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatNumber(s.selling_price || 0)} ج.م
                        </span>
                        <span className="block text-3xs text-slate-400">
                          تكلفتها: {formatNumber(s.cost_price || 0)} ج.م
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Register Serial */}
      <Dialog open={isNewSerialOpen} onOpenChange={setIsNewSerialOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-surface text-right" dir="rtl">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <QrCode className="w-5 h-5 text-sky-500" />
              <span>تسجيل جهاز / IMEI جديد في المخزن</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterSerial} className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <Label className="font-bold">اختر موديل الجهاز *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="اختر الموديل..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — سعر البيع: {formatNumber(p.sale_price)} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">رقم IMEI 1 / Serial *</Label>
                <Input
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="35xxxxxxxxxxxxx..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">رقم IMEI 2 (اختياري)</Label>
                <Input
                  value={imei2}
                  onChange={(e) => setImei2(e.target.value)}
                  placeholder="35xxxxxxxxxxxxx..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">حالة الجهاز</Label>
                <Select value={condition} onValueChange={(val) => setCondition(val as DeviceCondition)}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">جديد (زيرو)</SelectItem>
                    <SelectItem value="used">مستعمل (كسر زيرو)</SelectItem>
                    <SelectItem value="refurbished">مجدد / صيانة مصنع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">مدة الضمان (شهور)</Label>
                <Input
                  type="number"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">تكلفة الشراء (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="افتراضي"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">سعر البيع المقترح (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="افتراضي"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-center font-bold text-emerald-600"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewSerialOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                تأكيد حفظ الجهاز
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </AppShell>
  );
}

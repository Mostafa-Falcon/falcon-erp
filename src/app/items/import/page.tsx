'use client';

import React, { useState } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { formatNumber } from '@/lib/format';
import type { Product } from '@/types';
import { FileUp, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ImportRow {
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  barcode?: string;
  category_name?: string;
  stock?: number;
}

const SAMPLE_DATA: ImportRow[] = [
  { name: 'زيت طهي 1 لتر', sku: 'GRO-OIL-01', cost_price: 55.0, sale_price: 68.0, barcode: '6221234567891', category_name: 'بقالة', stock: 100 },
  { name: 'شاي أسود 250 جم', sku: 'GRO-TEA-02', cost_price: 18.0, sale_price: 24.0, barcode: '6221234567892', category_name: 'مشروبات', stock: 50 },
  { name: 'أرز مصري 1 كجم', sku: 'GRO-RIC-03', cost_price: 30.0, sale_price: 38.0, barcode: '6221234567893', category_name: 'بقالة', stock: 30 },
  { name: 'شامبو 400 مل', sku: 'COS-SHM-04', cost_price: 60.0, sale_price: 85.0, barcode: '6221234567894', category_name: 'عناية شخصية', stock: 20 },
];

function ImportContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setErrorMessage('الملف المرفق فارغ أو لا يحتوي على صفوف بيانات.');
        return;
      }

      // Skip header line
      const parsedRows: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 2) continue;

        parsedRows.push({
          name: cols[0] || `صنف ${i}`,
          sku: cols[1] || `SKU-${Date.now()}-${i}`,
          cost_price: parseFloat(cols[2]) || 0,
          sale_price: parseFloat(cols[3]) || 0,
          barcode: cols[4] || '',
          category_name: cols[5] || 'عام',
          stock: parseInt(cols[6] || '0', 10) || 0,
        });
      }

      if (parsedRows.length > 0) {
        setRows(parsedRows);
        setErrorMessage(null);
        setResultMessage(`تم قراءة ${parsedRows.length} صنف من الملف المرفق بنجاح.`);
      } else {
        setErrorMessage('تعذر قراءة بيانات من الملف المرفق.');
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['الاسم,الكود,سعر_التكلفة,سعر_البيع,الباركود,المجموعة,الرصيد_الافتتاحي']
        .concat(
          SAMPLE_DATA.map(
            (r) => `${r.name},${r.sku},${r.cost_price},${r.sale_price},${r.barcode},${r.category_name},${r.stock}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'falcon_items_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    if (!orgId || rows.length === 0) return;
    try {
      setIsImporting(true);
      setResultMessage(null);
      setErrorMessage(null);
      const now = new Date().toISOString();

      await db.transaction('rw', [db.products, db.stock_levels, db.product_units, db.sync_queue], async () => {
        for (const row of rows) {
          const prodId = uuidv4();
          const newProduct: Product = {
            id: prodId,
            org_id: orgId,
            name: row.name,
            sku: row.sku || `SKU-${Date.now().toString().slice(-6)}`,
            cost_price: row.cost_price,
            purchase_price: row.cost_price || 0,
            sale_price: row.sale_price,
            is_active: true,
            item_type: 'storable',
            tracks_expiry: true,
            tracks_batch: true,
            base_unit_id: 'default_unit',
            tax_rate: 0,
            is_tax_inclusive: true,
            min_stock_alert: 5,
            created_at: now,
            updated_at: now,
            sync_status: 'pending',
          };

          await db.products.add(newProduct);
          await SyncQueueManager.enqueue('products', prodId, 'insert', newProduct);

          // If barcode exists
          if (row.barcode) {
            const newUnit = {
              id: uuidv4(),
              product_id: prodId,
              unit_id: 'default_unit',
              barcode: row.barcode,
              is_default_sale: true,
              is_default_purchase: true,
              conversion_factor: 1,
              sale_price: row.sale_price,
              purchase_price: row.cost_price,
              sync_status: 'pending' as const,
              created_at: now,
              updated_at: now,
            };
            await db.product_units.add(newUnit);
            await SyncQueueManager.enqueue('product_units', newUnit.id, 'insert', newUnit);
          }

          // If initial stock exists
          if (row.stock && row.stock > 0) {
            const defaultWh = await db.warehouses.where('org_id').equals(orgId).first();
            if (defaultWh) {
              const stockId = `${defaultWh.id}_${prodId}`;
              const stockLevel = {
                id: stockId,
                org_id: orgId,
                product_id: prodId,
                warehouse_id: defaultWh.id,
                quantity: row.stock,
                reserved_quantity: 0,
                available_quantity: row.stock,
                updated_at: now,
                sync_status: 'pending' as const,
              };
              await db.stock_levels.put(stockLevel);
              await SyncQueueManager.enqueue('stock_levels', stockId, 'upsert', stockLevel);
            }
          }
        }
      });

      setResultMessage(`تم استيراد ${rows.length} صنف بنجاح إلى قاعدة البيانات المحلية وجاهزة للمزامنة السحابية!`);
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage('حدث خطأ أثناء تنفيذ عملية الاستيراد');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563eb]">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">استيراد بيانات الأصناف</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              رفع ملفات Excel و CSV لإدخال آلاف المنتجات بأسعارها وأرصدتها في ثوانٍ
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleDownloadTemplate}
          className="h-10 text-xs font-bold rounded-xl border-slate-200 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          تحميل نموذج ملف Excel الاسترشادي
        </Button>
      </div>

      {resultMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {resultMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMessage}
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
        <FileSpreadsheet className="w-12 h-12 text-[#2563eb] mx-auto opacity-80" />
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
          اسحب وأفلت ملف البيانات هنا، أو اضغط للاختيار من جهازك
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto font-bold">
          يدعم النظام ملفات CSV و XLSX بمطابقة تلقائية للأعمدة (الاسم، الكود، التكلفة، سعر البيع، الباركود)
        </p>
        <div className="pt-2">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 text-[#2563eb] text-xs font-black hover:bg-blue-100 transition-colors">
              <FileUp className="w-4 h-4" />
              اختيار ملف من الجهاز
            </span>
            <input type="file" accept=".csv, .xlsx" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Preview Table of Rows to be imported */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              معاينة الأصناف الجاهزة للإدراج ({rows.length} صنف)
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              تأكد من صحة الأسعار والأكواد قبل بدء الإدراج في قاعدة البيانات
            </span>
          </div>

          <Button
            disabled={isImporting || rows.length === 0}
            onClick={handleExecuteImport}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs h-10 px-6 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isImporting ? 'جاري الاستيراد...' : 'بدء الاستيراد والحفظ'}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-center text-slate-400 font-bold space-y-2">
            <FileSpreadsheet className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
            <p className="text-xs text-slate-600 dark:text-slate-300">لم يتم إرفاق أو قراءة أي ملف أصناف بعد.</p>
            <p className="text-[11px] text-slate-400">
              قم باختيار ملف CSV أو Excel من المربع أعلاه لمعاينة الأصناف ديناميكياً قبل البدء بالحفظ.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-black text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">اسم الصنف</th>
                  <th className="py-3 px-4">الكود (SKU)</th>
                  <th className="py-3 px-4">الباركود</th>
                  <th className="py-3 px-4">المجموعة</th>
                  <th className="py-3 px-4">سعر التكلفة</th>
                  <th className="py-3 px-4">سعر البيع</th>
                  <th className="py-3 px-4">الرصيد الأولي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{r.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.sku}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.barcode || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{r.category_name || '-'}</td>
                    <td className="py-3 px-4">{formatNumber(r.cost_price)} ج.م</td>
                    <td className="py-3 px-4 font-black text-[#2563eb]">{formatNumber(r.sale_price)} ج.م</td>
                    <td className="py-3 px-4 text-emerald-600 font-black">{r.stock || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل استيراد البيانات...</div>}>
        <ImportContent />
      </Suspense>
    </AppShell>
  );
}

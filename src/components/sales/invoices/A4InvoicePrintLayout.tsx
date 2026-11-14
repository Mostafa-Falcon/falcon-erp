'use client';

import React, { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { renderCode128Svg } from '@/lib/code128';
import type { SalesInvoice, SalesInvoiceItem, Contact, Organization } from '@/types';

interface A4InvoicePrintLayoutProps {
  invoice: SalesInvoice | null;
  items?: SalesInvoiceItem[];
  customer?: Contact | null;
  org?: Organization | null;
}

export function A4InvoicePrintLayout({
  invoice,
  items = [],
  customer,
  org,
}: A4InvoicePrintLayoutProps) {
  const [productsMap, setProductsMap] = useState<Map<string, string>>(new Map());
  const [orgRec, setOrgRec] = useState<Organization | null>(org || null);

  useEffect(() => {
    if (!items.length) return;
    import('@/core/db/app_database').then(({ db }) => {
      const productIds = Array.from(new Set(items.map((it) => it.product_id)));
      db.products.where('id').anyOf(productIds).toArray().then((prods) => {
        setProductsMap(new Map(prods.map((p) => [p.id, p.name])));
      }).catch(() => {});
    });
  }, [items]);

  useEffect(() => {
    if (org) {
      setOrgRec(org);
      return;
    }
    if (!invoice?.org_id) return;
    import('@/core/db/app_database').then(({ db }) => {
      db.organizations.get(invoice.org_id).then((o) => o && setOrgRec(o)).catch(() => {});
    });
  }, [org, invoice?.org_id]);

  if (!invoice) return null;

  const orgName = orgRec?.name || 'شركة الكميلي للتوريدات العمومية';
  const logoUrl = orgRec?.logo_url;
  const phone = orgRec?.phone || '01100957180';
  const address = orgRec?.address || 'أبيس 3 / 11';
  const taxNumber = orgRec?.tax_number || '123-456-789';
  const footerNote =
    orgRec?.invoice_footer ||
    'نرجو من عملائنا الكرام مراجعة البضاعة والفاتورة خلال اسبوع من تاريخ الاستلام وتطبقا بالنواقص ولسنا مسئولين عن اى شئ بعد ذلك - لا يوجد لدينا مرتجع للبطارية وأدوات الكهرباء\n📲 01100957180 خط طحيمر | 📍 أبيس 3 / 11';

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white print:p-0 print:m-0" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          [data-sonner-toaster], [data-sonner-toast], div[role="status"], div[aria-live="polite"] {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto p-8 text-black text-right font-sans text-sm leading-relaxed border border-slate-300 rounded-xl my-4">
        {/* Company Header & Logo */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">{orgName}</h1>
              <p className="text-xs font-bold text-slate-600 mt-1">تجارة عامة وتجزئة وجملة — قطع غيار ومستلزمات</p>
              <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-500 mt-1">
                <span>📲 هاتف: {phone}</span>
                <span>📍 العنوان: {address}</span>
              </div>
            </div>
          </div>

          <div className="text-left space-y-1">
            <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
              فاتورة مبيعات ضريبية
            </div>
            <div className="text-sm font-black font-mono text-slate-900 pt-1">#{invoice.invoice_number}</div>
            <div className="text-xs font-mono text-slate-500" dir="ltr">
              {new Date(invoice.created_at || invoice.invoice_date).toLocaleString('ar-EG')}
            </div>
          </div>
        </div>

        {/* Customer & Payment Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <span className="font-bold text-slate-500 w-24">اسم العميل:</span>
              <span className="font-black text-slate-900">{customer?.name || 'زبون نقدي'}</span>
            </div>
            {customer?.phone && (
              <div className="flex gap-2 font-mono">
                <span className="font-bold text-slate-500 w-24">رقم الهاتف:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {customer?.address && (
              <div className="flex gap-2">
                <span className="font-bold text-slate-500 w-24">العنوان:</span>
                <span>{customer.address}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex gap-2">
              <span className="font-bold text-slate-500 w-28">طريقة السداد:</span>
              <span className="font-black text-slate-900">
                {invoice.payment_type === 'cash'
                  ? 'نقدي (كاش)'
                  : invoice.payment_type === 'card'
                  ? 'بطاقة / شبكة'
                  : invoice.payment_type === 'split'
                  ? 'سداد جزئي'
                  : 'آجل'}
              </span>
            </div>
            {taxNumber && (
              <div className="flex gap-2">
                <span className="font-bold text-slate-500 w-28">الرقم الضريبي:</span>
                <span>{taxNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-right text-xs border border-slate-300 rounded-lg overflow-hidden mb-6">
          <thead className="bg-slate-900 text-white font-black">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">بيان الصنف والمنتج</th>
              <th className="py-2.5 px-3 text-center w-20">الكمية</th>
              <th className="py-2.5 px-3 text-left w-24">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-left w-20">الخصم</th>
              <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-bold">
            {items.map((it, idx) => (
              <tr key={it.id || idx} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                <td className="py-2.5 px-3 font-black text-slate-900">{productsMap.get(it.product_id) || it.notes || 'صنف مباع'}</td>
                <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                <td className="py-2.5 px-3 text-left font-mono" dir="ltr">{formatNumber(it.unit_price)}</td>
                <td className="py-2.5 px-3 text-left font-mono text-rose-600" dir="ltr">{formatNumber(it.discount_amount || 0)}</td>
                <td className="py-2.5 px-3 text-left font-mono font-black" dir="ltr">{formatNumber(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Totals Box */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1 text-center">
            {/* Linear Barcode */}
            <div
              className="w-full flex justify-center overflow-hidden scale-x-90 opacity-90 my-2"
              dangerouslySetInnerHTML={{
                __html: renderCode128Svg(invoice.invoice_number, {
                  moduleWidth: 0.3,
                  height: 35,
                }),
              }}
            />
            <span className="text-3xs font-mono font-bold tracking-widest text-slate-400">*{invoice.invoice_number}*</span>
          </div>

          <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-bold font-mono">
            <div className="flex justify-between text-slate-600" dir="ltr">
              <span>Subtotal:</span>
              <span>{formatNumber(invoice.subtotal || invoice.total)} ج.م</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-rose-600" dir="ltr">
                <span>Discount:</span>
                <span>-{formatNumber(invoice.discount_amount)} ج.م</span>
              </div>
            )}
            {invoice.shipping_fee && invoice.shipping_fee > 0 ? (
              <div className="flex justify-between text-blue-600" dir="ltr">
                <span>Shipping:</span>
                <span>+{formatNumber(invoice.shipping_fee)} ج.م</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2 mt-2" dir="ltr">
              <span>TOTAL NET:</span>
              <span className="text-emerald-600">{formatNumber(invoice.total)} ج.م</span>
            </div>
            <div className="flex justify-between text-2xs text-slate-500 pt-1" dir="ltr">
              <span>Paid Cash/Card:</span>
              <span>{formatNumber(invoice.paid_amount)} ج.م</span>
            </div>
            {invoice.remaining_amount > 0 && (
              <div className="flex justify-between text-2xs text-indigo-600 font-black pt-0.5" dir="ltr">
                <span>Remaining Debt:</span>
                <span>{formatNumber(invoice.remaining_amount)} ج.م</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Footer Note (Image 3 Text) */}
        {footerNote && (
          <div className="text-center text-xs font-bold text-slate-700 leading-relaxed pt-4 border-t-2 border-slate-900 whitespace-pre-line">
            {footerNote}
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-center text-xs font-bold text-slate-500">
          <div>توقيع واستلام المشتري / العميل: ..........................</div>
          <div>توقيع وأختام الشركة / المحاسب: ..........................</div>
        </div>
      </div>
    </div>
  );
}

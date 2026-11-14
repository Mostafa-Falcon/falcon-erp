'use client';

import React from 'react';
import { formatNumber } from '@/lib/format';
import { renderCode128Svg } from '@/lib/code128';
import type { SalesInvoice, SalesInvoiceItem } from '@/types';

interface ThermalReceiptPrintLayoutProps {
  invoice: SalesInvoice | null;
  items?: SalesInvoiceItem[];
  orgName?: string;
  logoUrl?: string;
  taxNumber?: string;
  phone?: string;
  address?: string;
  headerNote?: string;
  footerNote?: string;
  currencySymbol?: string;
  showLogo?: boolean;
  showBarcode?: boolean;
  showCustomer?: boolean;
  paperSize?: string;
}

export function ThermalReceiptPrintLayout({
  invoice,
  items = [],
  orgName = 'شركة الكميلي للتوريدات العمومية',
  logoUrl,
  taxNumber,
  phone = '01100957180',
  address = 'أبيس 3 / 11',
  headerNote,
  footerNote = 'نرجو من عملائنا الكرام مراجعة البضاعة والفاتورة خلال اسبوع من تاريخ الاستلام وتطبقا بالنواقص ولسنا مسئولين عن اى شئ بعد ذلك - لا يوجد لدينا مرتجع للبطارية وأدوات الكهرباء\n📲 01100957180 خط طحيمر | 📍 أبيس 3 / 11',
  currencySymbol = 'ج.م',
  showLogo = true,
  showBarcode = true,
  showCustomer = true,
  paperSize = '80mm',
}: ThermalReceiptPrintLayoutProps) {
  if (!invoice) return null;

  const is58mm = paperSize.includes('58mm');
  const widthClass = is58mm ? 'w-[58mm]' : 'w-[80mm]';

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white print:p-0 print:m-0" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: ${is58mm ? '58mm' : '80mm'} auto;
            margin: 0;
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

      <div className={`mx-auto ${widthClass} p-3 text-black text-right font-sans text-xs leading-snug`}>
        {/* Header / Logo / Company Info */}
        <div className="text-center border-b border-dashed border-black pb-3 mb-2 space-y-1">
          {showLogo && logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-1" />
          )}
          <h2 className="text-sm font-black tracking-tight">{orgName}</h2>
          {phone && <p className="text-4xs font-mono font-bold">📲 {phone}</p>}
          {address && <p className="text-4xs font-bold">📍 {address}</p>}
          {taxNumber && <p className="text-4xs font-mono">الرقم الضريبي: {taxNumber}</p>}
          {headerNote && <p className="text-4xs font-bold pt-1 border-t border-slate-200 mt-1">{headerNote}</p>}
        </div>

        {/* Invoice Metadata */}
        <div className="border-b border-dashed border-black pb-2 mb-2 text-2xs space-y-0.5">
          <div className="flex justify-between font-bold font-mono">
            <span>رقم الفاتورة:</span>
            <span>#{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between text-4xs text-slate-700">
            <span>التاريخ والوقت:</span>
            <span dir="ltr">{new Date(invoice.created_at || invoice.invoice_date).toLocaleString('ar-EG')}</span>
          </div>
          {showCustomer && (
            <div className="flex justify-between text-4xs font-bold">
              <span>العميل:</span>
              <span>{invoice.customer_id ? 'عميل محدد' : 'زبون نقدي'}</span>
            </div>
          )}
          <div className="flex justify-between text-4xs font-bold">
            <span>طريقة الدفع:</span>
            <span>
              {invoice.payment_type === 'cash'
                ? 'نقدي (كاش)'
                : invoice.payment_type === 'card'
                ? 'بطاقة / شبكة'
                : invoice.payment_type === 'split'
                ? 'سداد جزئي'
                : 'آجل'}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-right text-3xs border-b border-dashed border-black mb-2">
          <thead>
            <tr className="border-b border-black text-4xs font-black">
              <th className="py-1">الصنف</th>
              <th className="py-1 text-center">الكمية</th>
              <th className="py-1 text-left">السعر</th>
              <th className="py-1 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id || idx} className="border-b border-slate-200">
                <td className="py-1 font-bold">{it.product_id?.slice(0, 10) || 'صنف مباع'}</td>
                <td className="py-1 text-center font-mono">{it.quantity}</td>
                <td className="py-1 text-left font-mono" dir="ltr">{formatNumber(it.unit_price)}</td>
                <td className="py-1 text-left font-mono font-bold" dir="ltr">{formatNumber(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="space-y-1 text-3xs font-bold border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between" dir="ltr">
            <span>Subtotal</span>
            <span className="font-mono">{formatNumber(invoice.subtotal || invoice.total)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-red-600" dir="ltr">
              <span>Discount</span>
              <span className="font-mono">{formatNumber(invoice.discount_amount)} -</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between" dir="ltr">
              <span>Tax (VAT)</span>
              <span className="font-mono">{formatNumber(invoice.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black pt-1 border-t border-black mt-1" dir="ltr">
            <span>TOTAL</span>
            <span className="font-mono">{formatNumber(invoice.total)} {currencySymbol}</span>
          </div>
          {invoice.cash_amount > 0 && (
            <div className="flex justify-between text-4xs font-bold text-slate-700" dir="ltr">
              <span>Cash Paid</span>
              <span className="font-mono">{formatNumber(invoice.cash_amount)}</span>
            </div>
          )}
          {invoice.card_amount > 0 && (
            <div className="flex justify-between text-4xs font-bold text-slate-700" dir="ltr">
              <span>Card Paid</span>
              <span className="font-mono">{formatNumber(invoice.card_amount)}</span>
            </div>
          )}
        </div>

        {/* Linear Barcode */}
        {showBarcode && (
          <div className="text-center my-3">
            <div
              className="w-full flex justify-center overflow-hidden scale-x-90"
              dangerouslySetInnerHTML={{
                __html: renderCode128Svg(invoice.invoice_number, {
                  moduleWidth: 0.25,
                  height: 25,
                }),
              }}
            />
            <span className="text-5xs font-mono font-bold uppercase tracking-wider block mt-0.5">
              *{invoice.invoice_number}*
            </span>
          </div>
        )}

        {/* Custom Footer Note (Image 3 Text!) */}
        {footerNote && (
          <div className="text-center text-4xs font-bold leading-relaxed pt-2 border-t border-dashed border-black whitespace-pre-line">
            {footerNote}
          </div>
        )}
      </div>
    </div>
  );
}

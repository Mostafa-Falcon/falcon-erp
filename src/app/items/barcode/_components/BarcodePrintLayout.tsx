'use client';

import React, { useMemo } from'react';
import { renderCode128Svg } from'@/lib/code128';
import { formatNumber } from'@/lib/format';
import type { PrintItem, BarcodeSettings } from'../types';
import'../barcode-print.css';

interface BarcodePrintLayoutProps {
 flatPrintLabels: PrintItem[];
 settings: BarcodeSettings;
 orgName: string;
 currency?: string;
}

export function BarcodePrintLayout({
 flatPrintLabels,
 settings,
 orgName,
 currency ='ر.س',
}: BarcodePrintLayoutProps) {
 // Dynamic @page size definition for printer drivers (thermal rolls vs A4 sheet)
 const pageStyle = useMemo(() => {
 if (settings.labelSize ==='38x25') {
 return'@page { size: 38mm 25mm; margin: 0mm; }';
 }
 if (settings.labelSize ==='50x25') {
 return'@page { size: 50mm 25mm; margin: 0mm; }';
 }
 return'@page { size: A4 portrait; margin: 6mm 4mm; }';
 }, [settings.labelSize]);

 // Group into pages of 30 for A4 3x10 sheets
 const a4Pages = useMemo(() => {
 if (settings.labelSize !=='a4_3x10') return [];
 const pages: PrintItem[][] = [];
 for (let i = 0; i < flatPrintLabels.length; i += 30) {
 pages.push(flatPrintLabels.slice(i, i + 30));
 }
 return pages;
 }, [flatPrintLabels, settings.labelSize]);

 return (
 <>
 {/* Inject precise @page dimensions for thermal roll printers */}
 <style>{pageStyle}</style>

 <div className="print-container">
 {/* Thermal 38x25mm Labels */}
 {settings.labelSize ==='38x25'&& (
 <div>
 {flatPrintLabels.map((item, idx) => (
 <div
 key={`p-38-${idx}`}
 className="label-page"
 style={{
 width:'38mm',
 height:'25mm',
 padding:'1mm 1.5mm',
 }}
 >
 {settings.showOrgName && (
 <div className="text-5xs font-black text-black truncate w-full text-center leading-tight">
 {orgName}
 </div>
 )}
 <div className="text-5xs font-black text-black leading-tight line-clamp-1 w-full text-center">
 {item.product.name}
 </div>
 <div
 className="w-full flex justify-center overflow-hidden my-0.5"
 dangerouslySetInnerHTML={{
 __html: renderCode128Svg(item.barcode, {
 moduleWidth: 0.22,
 height: 18,
 }),
 }}
 />
 <div className="flex items-center justify-between w-full text-[7.5px] font-bold text-black px-1 leading-none">
 {settings.showSkuText && <span className="font-mono">{item.barcode}</span>}
 {settings.showPrice && (
 <span>
 {formatNumber(item.price)} {currency}
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Thermal 50x25mm Labels */}
 {settings.labelSize ==='50x25'&& (
 <div>
 {flatPrintLabels.map((item, idx) => (
 <div
 key={`p-50-${idx}`}
 className="label-page"
 style={{
 width:'50mm',
 height:'25mm',
 padding:'1.5mm 2mm',
 }}
 >
 {settings.showOrgName && (
 <div className="text-5xs font-black text-black truncate w-full text-center leading-tight">
 {orgName}
 </div>
 )}
 <div className="text-4xs font-black text-black leading-tight line-clamp-1 w-full text-center">
 {item.product.name}
 </div>
 <div
 className="w-full flex justify-center overflow-hidden my-0.5"
 dangerouslySetInnerHTML={{
 __html: renderCode128Svg(item.barcode, {
 moduleWidth: 0.28,
 height: 22,
 }),
 }}
 />
 <div className="flex items-center justify-between w-full text-5xs font-bold text-black px-1 leading-none">
 {settings.showSkuText && <span className="font-mono">{item.barcode}</span>}
 {settings.showPrice && (
 <span>
 {formatNumber(item.price)} {currency}
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* A4 Sheet (3 columns x 10 rows = 30 labels per page) */}
 {settings.labelSize ==='a4_3x10'&& (
 <div>
 {a4Pages.map((pageLabels, pageIdx) => (
 <div
 key={`a4-page-${pageIdx}`}
 className="a4-page-grid grid grid-cols-3 gap-2"
 style={{ width:'200mm', margin:'0 auto', minHeight:'280mm'}}
 >
 {pageLabels.map((item, idx) => (
 <div
 key={`p-a4-${pageIdx}-${idx}`}
 className="border border-dashed border-gray-300 rounded p-1.5 flex flex-col items-center justify-between text-center h-[27mm] overflow-hidden box-border"
 style={{ breakInside:'avoid'}}
 >
 {settings.showOrgName && (
 <div className="text-5xs font-black text-black truncate w-full">
 {orgName}
 </div>
 )}
 <div className="text-[8.5px] font-black text-black line-clamp-1 w-full">
 {item.product.name}
 </div>
 <div
 className="w-full flex justify-center overflow-hidden my-0.5"
 dangerouslySetInnerHTML={{
 __html: renderCode128Svg(item.barcode, {
 moduleWidth: 0.24,
 height: 18,
 }),
 }}
 />
 <div className="flex items-center justify-between w-full text-5xs font-bold text-black px-1">
 {settings.showSkuText && <span className="font-mono">{item.barcode}</span>}
 {settings.showPrice && (
 <span>
 {formatNumber(item.price)} {currency}
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 )}
 </div>
 </>
 );
}
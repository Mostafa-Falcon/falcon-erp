import React from'react';
import type { DailySalesPoint, MonthlySalesPoint } from'../types';

interface SalesChartsSectionProps {
 dailySvgPath: string;
 dailySalesPoints: DailySalesPoint[];
 maxDailySales: number;
 monthlySvgPath: string;
 monthlySalesPoints: MonthlySalesPoint[];
 maxMonthlySales: number;
}

export const SalesChartsSection: React.FC<SalesChartsSectionProps> = ({
 dailySvgPath,
 dailySalesPoints,
 maxDailySales,
 monthlySvgPath,
 monthlySalesPoints,
 maxMonthlySales,
}) => {
 return (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
 {/* Right Chart: مبيعات النطاق الزمني يومياً */}
 <div className="bg-surface rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
 <div className="flex items-center justify-between mb-4">
 <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-2xs font-bold border border-blue-200 dark:border-blue-900">
 تحديث تلقائي
 </span>
 <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
 المبيعات في النطاق المحدد (يومياً)
 </h3>
 </div>

 {/* Daily Spline Chart SVG */}
 <div className="w-full h-48 sm:h-56 relative flex items-end justify-center pt-2">
 <svg className="w-full h-full overflow-visible"viewBox="0 0 500 160"preserveAspectRatio="none">
 <defs>
 <linearGradient id="blueSplineGradient"x1="0"y1="0"x2="0"y2="1">
 <stop offset="0%"stopColor="#2563eb"stopOpacity="0.25"/>
 <stop offset="100%"stopColor="#2563eb"stopOpacity="0.0"/>
 </linearGradient>
 </defs>
 {/* Curve Fill */}
 <path
 d={`${dailySvgPath} L 490 150 L 10 150 Z`}
 fill="url(#blueSplineGradient)"
 />
 {/* Stroke */}
 <path
 d={dailySvgPath}
 fill="none"
 stroke="#2563eb"
 strokeWidth="3"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 {/* Data points */}
 {dailySalesPoints.map((p, idx) => {
 const step = 480 / (dailySalesPoints.length - 1 || 1);
 const x = 10 + idx * step;
 const y = 140 - (p.amount / maxDailySales) * 110;
 return (
 <circle
 key={idx}
 cx={x}
 cy={y}
 r={p.amount > 0 ? 4.5 : 2.5}
 fill="#ffffff"
 stroke="#2563eb"
 strokeWidth={p.amount > 0 ? 2.5 : 1.5}
 />
 );
 })}
 </svg>
 </div>

 {/* X Axis Dates Sample */}
 <div className="flex items-center justify-between text-2xs font-semibold text-slate-400 mt-2 px-2"dir="ltr">
 {dailySalesPoints.length > 0 ? (
 <>
 <span>{dailySalesPoints[0]?.label}</span>
 <span>{dailySalesPoints[Math.floor(dailySalesPoints.length / 4)]?.label}</span>
 <span>{dailySalesPoints[Math.floor(dailySalesPoints.length / 2)]?.label}</span>
 <span>{dailySalesPoints[Math.floor((dailySalesPoints.length * 3) / 4)]?.label}</span>
 <span>{dailySalesPoints[dailySalesPoints.length - 1]?.label}</span>
 </>
 ) : (
 <span>لا توجد بيانات حركة</span>
 )}
 </div>
 </div>

 {/* Left Chart: مبيعات السنة المالية الحالية شهرياً */}
 <div className="bg-surface rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
 <div className="flex items-center justify-between mb-4">
 <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-2xs font-bold border border-emerald-200 dark:border-emerald-900">
 تحديث تلقائي
 </span>
 <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
 مبيعات السنة المالية الحالية (شهرياً)
 </h3>
 </div>

 {/* Monthly Emerald Curve SVG */}
 <div className="w-full h-48 sm:h-56 relative flex items-end justify-center pt-2">
 <svg className="w-full h-full overflow-visible"viewBox="0 0 500 160"preserveAspectRatio="none">
 <defs>
 <linearGradient id="emeraldSplineGradient"x1="0"y1="0"x2="0"y2="1">
 <stop offset="0%"stopColor="#10b981"stopOpacity="0.3"/>
 <stop offset="100%"stopColor="#10b981"stopOpacity="0.0"/>
 </linearGradient>
 </defs>
 <path
 d={`${monthlySvgPath} L 490 150 L 10 150 Z`}
 fill="url(#emeraldSplineGradient)"
 />
 <path
 d={monthlySvgPath}
 fill="none"
 stroke="#10b981"
 strokeWidth="3"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 {monthlySalesPoints.map((m, idx) => {
 const step = 480 / (monthlySalesPoints.length - 1 || 1);
 const x = 10 + idx * step;
 const y = 140 - (m.amount / maxMonthlySales) * 110;
 return (
 <circle
 key={idx}
 cx={x}
 cy={y}
 r={m.amount > 0 ? 4.5 : 2.5}
 fill="#ffffff"
 stroke="#10b981"
 strokeWidth={m.amount > 0 ? 2.5 : 1.5}
 />
 );
 })}
 </svg>
 </div>

 {/* X Axis Months */}
 <div className="flex items-center justify-between text-2xs font-semibold text-slate-400 mt-2 px-2">
 <span>يناير</span>
 <span>مارس</span>
 <span>مايو</span>
 <span>يوليو</span>
 <span>سبتمبر</span>
 <span>نوفمبر</span>
 </div>
 </div>
 </div>
 );
};
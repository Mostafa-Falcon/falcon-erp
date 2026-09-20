'use client';

import React from 'react';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { CatalogStats } from './types';

interface ItemKpiCardsProps {
  stats: CatalogStats;
  isPharmacy?: boolean;
}

export function ItemKpiCards({ stats, isPharmacy }: ItemKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* 1. إجمالي الأصناف (Blue Soft Card) */}
      <div className="bg-[#f0f7ff] dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">
            {isPharmacy ? 'إجمالي الأدوية' : 'إجمالي الأصناف'}
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {formatNumber(stats.total)}
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-100/80 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shadow-2xs">
          <Package className="w-6 h-6" />
        </div>
      </div>

      {/* 2. نواقص المخزون (Red Soft Card) */}
      <div className="bg-[#fef2f2] dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-xs flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">نواقص المخزون</span>
          <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
            {formatNumber(stats.lowStockCount)}
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-red-100/80 dark:bg-red-900/50 flex items-center justify-center text-red-600 shadow-2xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* 3. أصناف قاربت على الانتهاء (Amber Soft Card) */}
      <div className="bg-[#fffbeb] dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">أصناف قاربت على الانتهاء</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {formatNumber(stats.nearExpiryCount)}
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-100/80 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 shadow-2xs">
          <Clock className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { KpiCard } from '@/components/ui/kpi-card';
import type { CatalogStats } from './types';

interface ItemKpiCardsProps {
  stats: CatalogStats;
  isPharmacy?: boolean;
}

export function ItemKpiCards({ stats, isPharmacy }: ItemKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. إجمالي الأصناف */}
      <KpiCard
        label={isPharmacy ? 'إجمالي الأدوية والمستحضرات' : 'إجمالي الأصناف'}
        value={formatNumber(stats.total)}
        unit={isPharmacy ? 'دواء' : 'صنف'}
        variant="blue"
        icon={<Package className="w-5 h-5" />}
      />

      {/* 2. نواقص المخزون */}
      <KpiCard
        label="نواقص المخزون (تحت حد الطلب)"
        value={formatNumber(stats.lowStockCount)}
        unit="صنف"
        variant="rose"
        icon={<AlertTriangle className="w-5 h-5" />}
      />

      {/* 3. أصناف قاربت على الانتهاء */}
      <KpiCard
        label="أصناف قاربت على الصلاحية"
        value={formatNumber(stats.nearExpiryCount)}
        unit="صنف"
        variant="amber"
        icon={<Clock className="w-5 h-5" />}
      />
    </div>
  );
}
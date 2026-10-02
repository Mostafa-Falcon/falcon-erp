'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'sky';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<
  NonNullable<KpiCardProps['variant']>,
  {
    iconBg: string;
    iconColor: string;
    accentGlow: string;
    valueColor: string;
  }
> = {
  blue: {
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accentGlow: 'hover:border-blue-300 dark:hover:border-blue-700',
    valueColor: 'text-slate-900 dark:text-white',
  },
  emerald: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accentGlow: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accentGlow: 'hover:border-amber-300 dark:hover:border-amber-700',
    valueColor: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
    accentGlow: 'hover:border-rose-300 dark:hover:border-rose-700',
    valueColor: 'text-rose-600 dark:text-rose-400',
  },
  indigo: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    accentGlow: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
  },
  sky: {
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-800/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
    accentGlow: 'hover:border-sky-300 dark:hover:border-sky-700',
    valueColor: 'text-sky-600 dark:text-sky-400',
  },
  slate: {
    iconBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-300',
    accentGlow: 'hover:border-slate-300 dark:hover:border-slate-600',
    valueColor: 'text-slate-900 dark:text-white',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  icon,
  variant = 'blue',
  trend,
  subtitle,
  className,
  onClick,
}) => {
  const styles = variantStyles[variant] || variantStyles.blue;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface',
        'p-5 transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5',
        styles.accentGlow,
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Metric Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-tight truncate">
            {label}
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn('text-2xl lg:text-3xl font-black tracking-tight tabular-nums', styles.valueColor)}>
              {value}
            </span>
            {unit && (
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-2xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-2xs pt-1 font-semibold">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-3xs font-black',
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                )}
              >
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-slate-400 text-3xs">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon Pill */}
        {icon && (
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform duration-200 group-hover:scale-105',
              styles.iconBg,
              styles.iconColor
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Subtle bottom active gradient line */}
      <div
        className={cn(
          'absolute bottom-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          variant === 'blue' && 'bg-gradient-to-r from-transparent via-blue-500 to-transparent',
          variant === 'emerald' && 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent',
          variant === 'amber' && 'bg-gradient-to-r from-transparent via-amber-500 to-transparent',
          variant === 'rose' && 'bg-gradient-to-r from-transparent via-rose-500 to-transparent',
          variant === 'indigo' && 'bg-gradient-to-r from-transparent via-indigo-500 to-transparent',
          variant === 'sky' && 'bg-gradient-to-r from-transparent via-sky-500 to-transparent',
          variant === 'slate' && 'bg-gradient-to-r from-transparent via-slate-500 to-transparent'
        )}
      />
    </Card>
  );
};

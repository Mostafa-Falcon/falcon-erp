'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center select-none',
        'rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 transition-transform hover:scale-105">
          {icon}
        </div>
      )}
      <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button
            onClick={action.onClick}
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Layout primitives that own the app's spacing rhythm.
 * Modern SaaS Linear / Stripe styling.
 */

/** Gutter values: 16px on mobile, 24px from sm up. Shared by header and content. */
const GUTTER = 'px-4 sm:px-6';
const GUTTER_STACK = 'py-4 sm:py-6';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * The scroll-content wrapper for a page body.
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        GUTTER,
        GUTTER_STACK,
        'mx-auto w-full max-w-(--container-page) space-y-5 min-h-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PageContainer.displayName = 'PageContainer';

export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * The page title section.
 * Modern, seamless SaaS hero section without bulky nested card boxes.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  badge,
  className,
}) => {
  if (!title && !actions) return null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 pt-1 transition-all',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {title && (
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          )}
          {badge}
        </div>
        {subtitle && (
          <p className="line-clamp-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-2.5 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Vertical stack of page sections. */
export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-5', className)} {...props} />
  )
);
Section.displayName = 'Section';
'use client';

import * as React from'react';
import { cn } from'@/lib/utils';

/**
 * Layout primitives that own the app's spacing rhythm.
 *
 * The codebase previously had three competing horizontal rhythms (sidebar 16px,
 * header 16-24px, content 12-16-24px), which meant the sidebar edge, the
 * header title and the page content never lined up on the same axis. These
 * components make the rhythm impossible to drift: every page renders through
 *`PageContainer`and every page title through`PageHeader`.
 */

/** Gutter values: 16px on mobile, 24px from`sm`up. Shared by header and content. */
const GUTTER ='px-4 sm:px-6';
const GUTTER_STACK ='py-4 sm:py-6';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
 children: React.ReactNode;
}

/**
 * The scroll-content wrapper for a page body.
 *
 * Applies the shared gutter, the single vertical rhythm (`space-y-4`),
 * a full-height min so short pages still paint the app background, and caps
 * the content width so data tables stop stretching edge-to-edge on ultrawide
 * and 4K displays.
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
 ({ className, children, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
 GUTTER,
 GUTTER_STACK,
'mx-auto w-full max-w-(--container-page) space-y-4 min-h-full',
 className
 )}
 {...props}
 >
 {children}
 </div>
 )
);
PageContainer.displayName ='PageContainer';

export interface PageHeaderProps {
 title?: string;
 subtitle?: string;
 actions?: React.ReactNode;
 className?: string;
}

/**
 * The page title card. Rendered by`AppShell`unless the page opts out via
 *`hideHeaderBanner`and supplies its own hero.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
 title,
 subtitle,
 actions,
 className,
}) => {
 if (!title && !actions) return null;

 return (
 <div
 className={cn(
'flex flex-col justify-between gap-3 sm:flex-row sm:items-center',
'rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-sm sm:px-5 sm:py-4',
 className
 )}
 >
 <div className="min-w-0">
 {title && (
 <h2 className="truncate text-lg font-black text-foreground sm:text-xl lg:text-2xl">
 {title}
 </h2>
 )}
 {subtitle && (
 <p className="mt-0.5 line-clamp-2 text-2xs font-semibold leading-relaxed text-muted-foreground sm:text-xs">
 {subtitle}
 </p>
 )}
 </div>
 {actions && <div className="shrink-0 self-start sm:self-center">{actions}</div>}
 </div>
 );
};

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Vertical stack of page sections. Shares the`space-y-4`page rhythm. */
export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
 ({ className, ...props }, ref) => (
 <div ref={ref} className={cn('space-y-4', className)} {...props} />
 )
);
Section.displayName ='Section';
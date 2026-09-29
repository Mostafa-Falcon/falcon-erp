'use client';

import * as React from'react';
import { Label } from'@/components/ui/label';
import { cn } from'@/lib/utils';

export interface FormFieldProps {
 /** Accessible label text. Rendered as a real <label> bound to the control. */
 label?: React.ReactNode;
 /** Validation or helper text rendered under the control. */
 hint?: React.ReactNode;
 error?: string;
 required?: boolean;
 htmlFor?: string;
 className?: string;
 children: React.ReactNode;
}

/**
 * Owns the label-to-control spacing for every form in the app.
 *
 * The`Label`primitive deliberately carries no margin, so this is the single
 * place where the`gap`between a field label, its control and its hint is
 * defined. Use it instead of hand-rolling the label + margin pair, which was
 * duplicated across roughly 40 form call sites.
 */
export function FormField({
 label,
 hint,
 error,
 required,
 htmlFor,
 className,
 children,
}: FormFieldProps) {
 return (
 <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
 {label && (
 <Label htmlFor={htmlFor}>
 {label}
 {required && (
 <span className="ms-0.5 text-destructive"aria-hidden>
 *
 </span>
 )}
 </Label>
 )}
 {children}
 {error ? (
 <p className="text-3xs font-semibold text-destructive">{error}</p>
 ) : hint ? (
 <p className="text-3xs text-muted-foreground">{hint}</p>
 ) : null}
 </div>
 );
}
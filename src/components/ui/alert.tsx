import * as React from'react';
import { cva, type VariantProps } from'class-variance-authority';
import { cn } from'@/lib/utils';

const alertVariants = cva(
'relative w-full rounded-xl border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:right-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pr-7',
 {
 variants: {
 variant: {
 default:'bg-background text-foreground border-border',
 destructive:
'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 [&>svg]:text-red-600',
 success:
'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 [&>svg]:text-emerald-600',
 warning:
'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300 [&>svg]:text-amber-600',
 },
 },
 defaultVariants: {
 variant:'default',
 },
 }
);

const Alert = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
 <div
 ref={ref}
 role="alert"
 className={cn(alertVariants({ variant }), className)}
 {...props}
 />
));
Alert.displayName ='Alert';

const AlertTitle = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
 <h5
 ref={ref}
 className={cn('mb-1 font-bold leading-none tracking-tight text-right', className)}
 {...props}
 />
));
AlertTitle.displayName ='AlertTitle';

const AlertDescription = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn('text-xs leading-relaxed text-right', className)}
 {...props}
 />
));
AlertDescription.displayName ='AlertDescription';

export { Alert, AlertTitle, AlertDescription };
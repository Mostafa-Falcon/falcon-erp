import * as React from'react';
import { cva, type VariantProps } from'class-variance-authority';
import { cn } from'@/lib/utils';

const badgeVariants = cva(
'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-3xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
 {
 variants: {
 variant: {
 default:'border-transparent bg-primary text-primary-foreground',
 secondary:'border-transparent bg-muted text-secondary-foreground',
 outline:'border-line text-foreground',
 success:'border-transparent bg-emerald-500 text-white',
 warning:'border-transparent bg-amber-500 text-white',
 destructive:'border-transparent bg-destructive text-destructive-foreground',
 info:'border-transparent bg-blue-500 text-white',
 },
 },
 defaultVariants: {
 variant:'default',
 },
 }
);

export interface BadgeProps
 extends React.HTMLAttributes<HTMLSpanElement>,
 VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
 // A <span>, not a <div>: a status chip must be legal inside inline text flow
 // such as a table cell or a paragraph.
 return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
import * as React from'react';
import { cva, type VariantProps } from'class-variance-authority';
import { cn } from'@/lib/utils';

const buttonVariants = cva(
'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
 {
 variants: {
 variant: {
 default:'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
 destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
 outline:'border border-input bg-background hover:bg-accent hover:text-accent-foreground text-slate-800 dark:text-slate-200',
 secondary:'bg-secondary text-secondary-foreground hover:bg-secondary/80',
 ghost:'hover:bg-accent hover:text-accent-foreground',
 link:'text-primary underline-offset-4 hover:underline',
 brand:'bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all',
 },
 size: {
 xs:'h-8 rounded-md px-2.5 text-2xs gap-1',
 sm:'h-9 rounded-md px-3 text-xs',
 default:'h-11 px-5 py-2',
 lg:'h-12 rounded-lg px-8 text-base',
 icon:'h-10 w-10',
'icon-xs':'h-8 w-8',
'icon-sm':'h-9 w-9',
'icon-lg':'h-12 w-12',
 },
 },
 defaultVariants: {
 variant:'default',
 size:'default',
 },
 }
);

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, ...props }, ref) => {
 return (
 <button
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 );
 }
);
Button.displayName ='Button';

export { Button, buttonVariants };
import * as React from'react';
import { cn } from'@/lib/utils';

export interface InputProps
 extends React.InputHTMLAttributes<HTMLInputElement> {
 icon?: React.ReactNode;
 trailingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, type, icon, trailingIcon, ...props }, ref) => {
 return (
 <div className="relative flex items-center w-full">
 {icon && (
 <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
 {icon}
 </div>
 )}
 <input
 type={type}
 className={cn(
'flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
 icon &&'pr-10',
 trailingIcon &&'pl-10',
 className
 )}
 ref={ref}
 {...props}
 />
 {trailingIcon && (
 <div className="absolute left-3.5 flex items-center text-muted-foreground">
 {trailingIcon}
 </div>
 )}
 </div>
 );
 }
);
Input.displayName ='Input';

export { Input };
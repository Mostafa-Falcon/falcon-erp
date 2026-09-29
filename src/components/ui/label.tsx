import * as React from'react';
import { cn } from'@/lib/utils';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/**
 * Form label. Intentionally carries **no** margin: the previous version baked
 *`block mb-1.5`into the primitive, and nearly every call site re-declared
 *`block ... mb-1.5`anyway. Spacing between a label and its control is owned
 * by the`FormField`composition, not by the label.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
 ({ className, ...props }, ref) => (
 <label
 ref={ref}
 className={cn(
'block text-2xs font-semibold leading-none text-muted-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
 className
 )}
 {...props}
 />
 )
);
Label.displayName ='Label';

export { Label };
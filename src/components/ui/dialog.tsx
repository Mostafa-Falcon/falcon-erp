'use client';

import * as React from'react';
import * as DialogPrimitive from'@radix-ui/react-dialog';
import { X } from'lucide-react';
import { cn } from'@/lib/utils';
const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Overlay>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Overlay
 ref={ref}
 className={cn(
'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
 className
 )}
 {...props}
 />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
 /** Set to`false`for destructive confirmations that need a deliberate choice. */
 showCloseButton?: boolean;
 }
>(({ className, children, showCloseButton = true, ...props }, ref) => (
 <DialogPortal>
 <DialogOverlay />
 <DialogPrimitive.Content
 ref={ref}
 className={cn(
 //`inset-0 m-auto`+`max-h`is the v3 centring pattern: unlike
 //`left-[50%] + translate-[-50%]`it also keeps a tall dialog inside
 // the viewport, which matters on short laptop screens.
'fixed inset-0 z-50 m-auto grid max-h-[calc(100dvh-2rem)] w-full max-w-lg gap-4 overflow-y-auto',
'rounded-2xl border border-line bg-surface p-5 text-foreground shadow-2xl sm:p-6',
'data-[state=open]:animate-in data-[state=closed]:animate-out',
'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
 className
 )}
 {...props}
 >
 {children}
 {showCloseButton && (
 <DialogPrimitive.Close
 className="absolute end-4 top-4 rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:bg-accent hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
 aria-label="إغلاق"
 >
 <X className="h-4 w-4"/>
 </DialogPrimitive.Close>
 )}
 </DialogPrimitive.Content>
 </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn('flex flex-col gap-1.5 text-start', className)}
 {...props}
 />
);
DialogHeader.displayName ='DialogHeader';

const DialogFooter = ({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-start', className)}
 {...props}
 />
);
DialogFooter.displayName ='DialogFooter';

const DialogTitle = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Title>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Title
 ref={ref}
 className={cn('text-base font-bold leading-snug text-foreground', className)}
 {...props}
 />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Description>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Description
 ref={ref}
 className={cn('text-2xs leading-relaxed text-muted-foreground', className)}
 {...props}
 />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
 Dialog,
 DialogPortal,
 DialogOverlay,
 DialogClose,
 DialogTrigger,
 DialogContent,
 DialogHeader,
 DialogFooter,
 DialogTitle,
 DialogDescription,
};
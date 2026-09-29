'use client';

import { Toaster as Sonner, ToasterProps } from'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
 return (
 <Sonner
 className="toaster group font-sans"
 position="top-center"
 richColors
 dir="rtl"
 closeButton
 duration={4000}
 toastOptions={{
 classNames: {
 toast:
'group toast border shadow-lg rounded-xl font-medium text-sm py-3 px-4 flex items-center gap-3 select-none',
 title:'font-bold text-sm',
 description:'text-xs opacity-90',
 actionButton:'bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-1.5',
 cancelButton:'bg-muted text-muted-foreground text-xs font-semibold rounded-lg px-3 py-1.5',
 closeButton:'!left-2 !right-auto border-none hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
 },
 }}
 {...props}
 />
 );
};

export { Toaster };
'use client';

import * as React from'react';
import { cn } from'@/lib/utils';

interface TabsContextValue {
 value: string;
 onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
 defaultValue?: string;
 value?: string;
 onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
 ({ defaultValue, value: controlledValue, onValueChange, className, children, ...props }, ref) => {
 const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ||'');
 const isControlled = controlledValue !== undefined;
 const activeValue = isControlled ? controlledValue : uncontrolledValue;

 const handleValueChange = React.useCallback(
 (newVal: string) => {
 if (!isControlled) {
 setUncontrolledValue(newVal);
 }
 onValueChange?.(newVal);
 },
 [isControlled, onValueChange]
 );

 return (
 <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
 <div ref={ref} className={cn('w-full', className)} {...props}>
 {children}
 </div>
 </TabsContext.Provider>
 );
 }
);
Tabs.displayName ='Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
 ({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
'inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 p-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400 w-full',
 className
 )}
 {...props}
 />
 )
);
TabsList.displayName ='TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
 ({ className, value, onClick, ...props }, ref) => {
 const context = React.useContext(TabsContext);
 const isSelected = context?.value === value;

 return (
 <button
 ref={ref}
 type="button"
 role="tab"
 aria-selected={isSelected}
 onClick={(e) => {
 context?.onValueChange(value);
 onClick?.(e);
 }}
 className={cn(
'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer flex-1',
 isSelected
 ?'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-slate-50 font-black'
 :'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
 className
 )}
 {...props}
 />
 );
 }
);
TabsTrigger.displayName ='TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
 value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
 ({ className, value, ...props }, ref) => {
 const context = React.useContext(TabsContext);
 if (context?.value !== value) return null;

 return (
 <div
 ref={ref}
 role="tabpanel"
 className={cn(
'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
 className
 )}
 {...props}
 />
 );
 }
);
TabsContent.displayName ='TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
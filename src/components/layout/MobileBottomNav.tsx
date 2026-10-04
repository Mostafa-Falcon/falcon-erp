'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Store,
  Package,
  Receipt,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onToggleSidebar,
  sidebarOpen,
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'الرئيسية',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'نقطة البيع',
      href: '/sales/pos',
      icon: Store,
      isActive: pathname === '/sales/pos',
      highlight: true,
    },
    {
      label: 'الأصناف',
      href: '/items',
      icon: Package,
      isActive: pathname.startsWith('/items'),
    },
    {
      label: 'الفواتير',
      href: '/sales/invoices',
      icon: Receipt,
      isActive: pathname.startsWith('/sales/invoices') || pathname.startsWith('/purchases/invoices'),
    },
  ];

  return (
    <nav
      aria-label="التنقل السريع للهاتف"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg select-none"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[56px]',
                item.isActive
                  ? 'text-primary font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              )}
            >
              {item.highlight && !item.isActive ? (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
              ) : (
                <div
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-lg transition-transform',
                    item.isActive && 'scale-110 bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <span className="text-4xs leading-tight text-center truncate max-w-[64px]">
                {item.label}
              </span>
              {item.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary absolute -bottom-0.5" />
              )}
            </Link>
          );
        })}

        {/* Menu Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[56px]',
            sidebarOpen
              ? 'text-primary font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          )}
        >
          <div
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-transform',
              sidebarOpen && 'scale-110 bg-primary/10 text-primary'
            )}
          >
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-4xs leading-tight text-center">القائمة</span>
          {sidebarOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary absolute -bottom-0.5" />
          )}
        </button>
      </div>
    </nav>
  );
};

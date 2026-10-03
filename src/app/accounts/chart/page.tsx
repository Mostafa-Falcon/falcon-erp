'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Printer,
  MoreVertical,
  Layers,
  Briefcase,
  X,
  FolderTree,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Account } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ChartOfAccountsPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      await AccountingRepository.ensureDefaultChartOfAccounts(orgId);
      const list = await db.accounts.where('org_id').equals(orgId).toArray();
      setAccounts(list);
    } catch (err) {
      console.error('Load accounts error:', err);
      toast.error('حدث خطأ أثناء تحميل شجرة الحسابات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const tree = useMemo(() => {
    const map: Record<string, Account & { children: any[] }> = {};
    const roots: any[] = [];

    accounts.forEach((a) => {
      map[a.id] = { ...a, children: [] };
    });

    accounts.forEach((a) => {
      if (a.parent_id && map[a.parent_id]) {
        map[a.parent_id].children.push(map[a.id]);
      } else {
        roots.push(map[a.id]);
      }
    });

    return roots.sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts]);

  const headerActions = (
    <div className="flex items-center gap-2.5">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="h-10 px-4 border-slate-200/80 dark:border-slate-800 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>طباعة الدليل</span>
      </Button>
      <Button
        onClick={() => toast.info('جاري فتح نموذج إضافة حساب جديد...')}
        className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>إضافة حساب جديد</span>
      </Button>
    </div>
  );

  return (
    <AppShell
      title="شجرة الحسابات (COA)"
      subtitle="هيكل الحسابات المالي المنظم للمؤسسة (الأصول، الخصوم، حقوق الملكية، الإيرادات، المصروفات)"
      actions={headerActions}
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Search & Statistics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الحساب أو الكود المالي..."
              className="h-10 pr-9 pl-9 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800"
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <FolderTree className="w-4 h-4 text-primary" />
              <span>إجمالي الحسابات:</span>
              <span className="font-black text-foreground font-mono">{accounts.length}</span>
            </div>
          </div>
        </div>

        {/* Tree Container Card */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden shadow-2xs">
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400">جاري تحميل الشجرة المحاسبية...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                لا توجد حسابات مسجلة في الشجرة.
              </div>
            ) : (
              <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                {tree.map((node) => (
                  <AccountTreeNode key={node.id} node={node} level={0} query={searchQuery} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function AccountTreeNode({
  node,
  level,
  query,
}: {
  node: Account & { children: any[] };
  level: number;
  query: string;
}) {
  const [isExpanded, setIsOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  const rootColors: Record<string, { text: string; bg: string }> = {
    '1000': { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/50' },
    '2000': { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/50' },
    '3000': { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/50' },
    '4000': { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/50' },
    '5000': { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/50' },
  };

  const isRoot = level === 0;
  const colorScheme = isRoot
    ? rootColors[node.code] || { text: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200' }
    : { text: 'text-slate-700 dark:text-slate-300', bg: 'bg-transparent border-transparent' };

  const matchesSelf =
    !query ||
    node.name.toLowerCase().includes(query.toLowerCase()) ||
    node.code.includes(query);

  return (
    <div className={cn('space-y-1 pt-1.5 first:pt-0', !matchesSelf && !hasChildren && 'hidden')}>
      <div
        className={cn(
          'group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border border-transparent',
          isRoot
            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40',
          !isRoot && 'mr-4 sm:mr-6'
        )}
        onClick={() => hasChildren && setIsOpen(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-5 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            )}
          </div>

          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
              colorScheme.bg
            )}
          >
            {isRoot ? (
              <Briefcase className={cn('w-4 h-4', colorScheme.text)} />
            ) : (
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className={cn('text-xs sm:text-sm font-bold truncate', colorScheme.text)}>
              {node.name}
            </span>
            <span className="text-3xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
              {node.code}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-left" dir="ltr">
            <span
              className={cn(
                'text-xs sm:text-sm font-black font-mono tabular-nums',
                node.current_balance > 0 ? 'text-primary' : 'text-slate-400'
              )}
            >
              {formatNumber(node.current_balance)}{' '}
              <span className="text-4xs font-sans text-slate-400 font-bold ml-0.5">ج.م</span>
            </span>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mr-6 sm:mr-8 pr-3 border-r border-slate-200/60 dark:border-slate-800 space-y-1 py-0.5">
          {node.children.map((child) => (
            <AccountTreeNode key={child.id} node={child} level={level + 1} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}
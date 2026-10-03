'use client';

import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Printer,
  X,
  FolderTree,
  Folder,
  FolderOpen,
  FileText,
  Building2,
  CreditCard,
  Scale,
  TrendingUp,
  Receipt,
  Maximize2,
  Minimize2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Account } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';

interface AccountTreeNodeType extends Account {
  children: AccountTreeNodeType[];
  rollupBalance: number;
}

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal State for adding account
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState<string>('none');
  const [formType, setFormType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  const [formAccountType, setFormAccountType] = useState<'parent' | 'leaf'>('leaf');
  const [formOpeningBalance, setFormOpeningBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      await AccountingRepository.ensureDefaultChartOfAccounts(orgId);
      const list = await db.accounts.where('org_id').equals(orgId).toArray();
      setAccounts(list);

      // Default expand root nodes
      const roots = list.filter((a) => !a.parent_id);
      setExpandedIds(new Set(roots.map((r) => r.id)));
    } catch (err) {
      console.error('Load accounts error:', err);
      toast.error('حدث خطأ أثناء تحميل شجرة الحسابات');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute roll-up tree and recursive balances
  const { tree, allParentIds } = useMemo(() => {
    const map: Record<string, AccountTreeNodeType> = {};
    const parents = new Set<string>();

    accounts.forEach((a) => {
      map[a.id] = { ...a, children: [], rollupBalance: a.current_balance || 0 };
    });

    const roots: AccountTreeNodeType[] = [];

    accounts.forEach((a) => {
      if (a.parent_id && map[a.parent_id]) {
        map[a.parent_id].children.push(map[a.id]);
        parents.add(a.parent_id);
      } else {
        roots.push(map[a.id]);
      }
    });

    // Sort children by code
    Object.values(map).forEach((node) => {
      node.children.sort((a, b) => a.code.localeCompare(b.code));
    });

    // Calculate recursive rollup balance
    function calculateRollup(node: AccountTreeNodeType): number {
      let sum = node.current_balance || 0;
      for (const child of node.children) {
        sum += calculateRollup(child);
      }
      node.rollupBalance = sum;
      return sum;
    }

    roots.sort((a, b) => a.code.localeCompare(b.code));
    roots.forEach(calculateRollup);

    return { tree: roots, allParentIds: parents };
  }, [accounts]);

  // KPI Calculations across standard account types
  const stats = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let revenue = 0;
    let expense = 0;

    accounts.forEach((a) => {
      // Sum only leaf accounts to avoid double-counting with parents
      const isLeaf = a.account_type === 'leaf' || !allParentIds.has(a.id);
      if (isLeaf) {
        const bal = a.current_balance || 0;
        if (a.type === 'asset' || a.code.startsWith('1')) assets += bal;
        else if (a.type === 'liability' || a.code.startsWith('2')) liabilities += bal;
        else if (a.type === 'equity' || a.code.startsWith('3')) equity += bal;
        else if (a.type === 'revenue' || a.code.startsWith('4')) revenue += bal;
        else if (a.type === 'expense' || a.code.startsWith('5')) expense += bal;
      }
    });

    return { assets, liabilities, equity, revenue, expense };
  }, [accounts, allParentIds]);

  // Toggle single node
  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand / Collapse all
  const expandAll = () => {
    setExpandedIds(new Set(accounts.map((a) => a.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Open modal with preselected parent
  const handleOpenAdd = (parentId?: string) => {
    if (parentId) {
      const parentAcc = accounts.find((a) => a.id === parentId);
      if (parentAcc) {
        setFormParentId(parentAcc.id);
        setFormType(parentAcc.type);
        // Suggest child code
        const children = accounts.filter((a) => a.parent_id === parentAcc.id);
        const nextNum = children.length + 1;
        setFormCode(`${parentAcc.code}${nextNum < 10 ? '0' + nextNum : nextNum}`);
      }
    } else {
      setFormParentId('none');
      setFormCode('');
    }
    setFormName('');
    setFormAccountType('leaf');
    setFormOpeningBalance('0');
    setIsModalOpen(true);
  };

  // Create Account submission
  const handleCreateAccount = async () => {
    if (!formName.trim() || !formCode.trim()) {
      toast.error('يرجى ملء اسم الحساب وكوده المالي');
      return;
    }

    // Check duplicate code
    if (accounts.some((a) => a.code === formCode.trim())) {
      toast.error('كود الحساب مسجل مسبقاً، يرجى اختيار كود فريد');
      return;
    }

    try {
      setIsSubmitting(true);
      const { db } = await import('@/core/db/app_database');
      const now = new Date().toISOString();
      const parentId = formParentId !== 'none' ? formParentId : null;

      const newAccount: Account = {
        id: uuidv4(),
        org_id: orgId,
        parent_id: parentId,
        code: formCode.trim(),
        name: formName.trim(),
        type: formType,
        account_type: formAccountType,
        current_balance: Number(formOpeningBalance) || 0,
        is_active: true,
        system_flag: false,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      await db.accounts.put(newAccount);
      await SyncQueueManager.enqueue('accounts', newAccount.id, 'insert', newAccount);

      toast.success('تمت إضافة الحساب بنجاح إلى شجرة الحسابات');
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error creating account:', err);
      toast.error('فشل حفظ الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter root trees by selected type
  const filteredTree = useMemo(() => {
    if (selectedTypeFilter === 'all') return tree;
    return tree.filter((root) => {
      if (selectedTypeFilter === 'asset') return root.type === 'asset' || root.code.startsWith('1');
      if (selectedTypeFilter === 'liability') return root.type === 'liability' || root.code.startsWith('2');
      if (selectedTypeFilter === 'equity') return root.type === 'equity' || root.code.startsWith('3');
      if (selectedTypeFilter === 'revenue') return root.type === 'revenue' || root.code.startsWith('4');
      if (selectedTypeFilter === 'expense') return root.type === 'expense' || root.code.startsWith('5');
      return true;
    });
  }, [tree, selectedTypeFilter]);

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
        onClick={() => handleOpenAdd()}
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
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <KpiCard
            label="الأصول (Assets)"
            value={formatNumber(stats.assets)}
            unit="ج.م"
            variant="blue"
            icon={<Building2 className="w-5 h-5" />}
          />
          <KpiCard
            label="الخصوم (Liabilities)"
            value={formatNumber(stats.liabilities)}
            unit="ج.م"
            variant="rose"
            icon={<CreditCard className="w-5 h-5" />}
          />
          <KpiCard
            label="حقوق الملكية (Equity)"
            value={formatNumber(stats.equity)}
            unit="ج.م"
            variant="indigo"
            icon={<Scale className="w-5 h-5" />}
          />
          <KpiCard
            label="الإيرادات (Revenues)"
            value={formatNumber(stats.revenue)}
            unit="ج.م"
            variant="emerald"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="المصروفات (Expenses)"
            value={formatNumber(stats.expense)}
            unit="ج.م"
            variant="amber"
            icon={<Receipt className="w-5 h-5" />}
          />
        </div>

        {/* Unified Search & Tree Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الحساب، الكود المالي، أو التصنيف..."
              className="pr-10 pl-9 h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800"
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

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs font-bold">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'all'
                  ? 'bg-surface text-foreground shadow-xs font-black'
                  : 'text-slate-500 hover:text-foreground'
              )}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedTypeFilter('asset')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'asset'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-blue-600'
              )}
            >
              الأصول
            </button>
            <button
              onClick={() => setSelectedTypeFilter('liability')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'liability'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-rose-600'
              )}
            >
              الخصوم
            </button>
            <button
              onClick={() => setSelectedTypeFilter('equity')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'equity'
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-indigo-600'
              )}
            >
              حقوق الملكية
            </button>
            <button
              onClick={() => setSelectedTypeFilter('revenue')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'revenue'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-emerald-600'
              )}
            >
              الإيرادات
            </button>
            <button
              onClick={() => setSelectedTypeFilter('expense')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedTypeFilter === 'expense'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-amber-600'
              )}
            >
              المصروفات
            </button>
          </div>

          {/* Expand/Collapse All & Counter */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="h-9 px-2.5 rounded-xl border-slate-200/80 dark:border-slate-800 text-xs font-bold gap-1.5"
              title="توسيع كافة المستويات"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">توسيع الكل</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="h-9 px-2.5 rounded-xl border-slate-200/80 dark:border-slate-800 text-xs font-bold gap-1.5"
              title="طي كافة المستويات"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طي الكل</span>
            </Button>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-bold">
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              <span>الحسابات:</span>
              <span className="font-mono font-black text-foreground">{accounts.length}</span>
            </div>
          </div>
        </div>

        {/* Tree Presentation Container */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري تحميل الشجرة المحاسبية وقوائم الأرصدة...</span>
          </div>
        ) : filteredTree.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="w-8 h-8 text-slate-400" />}
            title="لا توجد حسابات مطابقة للبحث"
            description="لم نتمكن من العثور على أي حساب يطابق مصطلحات البحث أو الفلتر المحدد."
            action={{
              label: 'إعادة ضبط الفلاتر',
              onClick: () => {
                setSearchQuery('');
                setSelectedTypeFilter('all');
              },
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredTree.map((rootNode) => (
              <AccountRootCard
                key={rootNode.id}
                node={rootNode}
                query={searchQuery}
                expandedIds={expandedIds}
                onToggle={toggleNode}
                onAddSubAccount={handleOpenAdd}
                onViewLedger={(id) => router.push(`/accounts/ledger?account=${id}`)}
              />
            ))}
          </div>
        )}

        {/* Modal: Add New Account */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>إضافة حساب مالي جديد</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                أدخل بيانات الحساب الجديد في الهيكل المحاسبي وموقعه من الشجرة.
              </p>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  اسم الحساب <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: البنك التجاري، مخزون الفروع..."
                  className="h-10 text-xs font-medium rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    كود الحساب <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="1125"
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    نوع الحساب
                  </label>
                  <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="asset">أصول (Asset)</SelectItem>
                      <SelectItem value="liability">خصوم (Liability)</SelectItem>
                      <SelectItem value="equity">حقوق ملكية (Equity)</SelectItem>
                      <SelectItem value="revenue">إيرادات (Revenue)</SelectItem>
                      <SelectItem value="expense">مصروفات (Expense)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  الحساب الرئيسي الأب (Parent Account)
                </label>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                    <SelectValue placeholder="اختر الحساب الأب (اختياري)..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 z-50">
                    <SelectItem value="none">بدون حساب أب (حساب رئيسي مستقل)</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs font-medium">
                        <span className="font-mono font-bold text-primary ml-1.5">[{a.code}]</span>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    تصنيف الحساب
                  </label>
                  <Select
                    value={formAccountType}
                    onValueChange={(v: any) => setFormAccountType(v)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="leaf">حساب فرعي (يقبل قيود)</SelectItem>
                      <SelectItem value="parent">حساب رئيسي (تجميعي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    الرصيد الافتتاحي (ج.م)
                  </label>
                  <Input
                    type="number"
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(e.target.value)}
                    className="h-10 text-xs font-bold font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 flex-row-reverse sm:justify-start">
              <Button
                onClick={handleCreateAccount}
                disabled={isSubmitting}
                className="flex-1 font-bold h-10 shadow-xs"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحساب'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-10 font-bold"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

/** Root Group Card (Level 0) */
function AccountRootCard({
  node,
  query,
  expandedIds,
  onToggle,
  onAddSubAccount,
  onViewLedger,
}: {
  node: AccountTreeNodeType;
  query: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddSubAccount: (parentId: string) => void;
  onViewLedger: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  const rootConfig: Record<
    string,
    {
      border: string;
      headerBg: string;
      iconBg: string;
      iconText: string;
      badge: string;
      label: string;
    }
  > = {
    '1000': {
      border: 'border-blue-200/80 dark:border-blue-900/60',
      headerBg: 'bg-gradient-to-l from-blue-50/60 to-surface dark:from-blue-950/20 dark:to-surface',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      iconText: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60',
      label: 'الأصول (Assets)',
    },
    '2000': {
      border: 'border-rose-200/80 dark:border-rose-900/60',
      headerBg: 'bg-gradient-to-l from-rose-50/60 to-surface dark:from-rose-950/20 dark:to-surface',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      iconText: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60',
      label: 'الخصوم (Liabilities)',
    },
    '3000': {
      border: 'border-indigo-200/80 dark:border-indigo-900/60',
      headerBg: 'bg-gradient-to-l from-indigo-50/60 to-surface dark:from-indigo-950/20 dark:to-surface',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      iconText: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60',
      label: 'حقوق الملكية (Equity)',
    },
    '4000': {
      border: 'border-emerald-200/80 dark:border-emerald-900/60',
      headerBg: 'bg-gradient-to-l from-emerald-50/60 to-surface dark:from-emerald-950/20 dark:to-surface',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60',
      label: 'الإيرادات (Revenues)',
    },
    '5000': {
      border: 'border-amber-200/80 dark:border-amber-900/60',
      headerBg: 'bg-gradient-to-l from-amber-50/60 to-surface dark:from-amber-950/20 dark:to-surface',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconText: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60',
      label: 'المصروفات (Expenses)',
    },
  };

  const config =
    rootConfig[node.code] || {
      border: 'border-slate-200/80 dark:border-slate-800',
      headerBg: 'bg-surface',
      iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      iconText: 'text-slate-600 dark:text-slate-300',
      badge: 'bg-slate-100 text-slate-700',
      label: node.name,
    };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface overflow-hidden shadow-2xs transition-all',
        config.border
      )}
    >
      {/* Root Header Row */}
      <div
        onClick={() => hasChildren && onToggle(node.id)}
        className={cn(
          'p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors',
          config.headerBg,
          'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 flex items-center justify-center shrink-0">
            {hasChildren && (
              <div className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
              config.iconBg
            )}
          >
            <FolderTree className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-foreground">
                {node.name}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                #{node.code}
              </span>
              <Badge variant="outline" className={cn('text-3xs font-bold', config.badge)}>
                {node.children.length} فروع رئيسية
              </Badge>
            </div>
            <p className="text-3xs text-muted-foreground mt-0.5">{config.label}</p>
          </div>
        </div>

        {/* Balance & Actions */}
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="text-left" dir="ltr">
            <span
              className={cn(
                'text-sm sm:text-base font-black font-mono tabular-nums',
                node.rollupBalance > 0
                  ? 'text-primary'
                  : node.rollupBalance < 0
                  ? 'text-rose-600'
                  : 'text-slate-400'
              )}
            >
              {formatNumber(node.rollupBalance)}{' '}
              <span className="text-3xs font-sans text-slate-400 font-bold ml-0.5">ج.م</span>
            </span>
          </div>

          <Button
            size="xs"
            variant="ghost"
            onClick={() => onAddSubAccount(node.id)}
            className="h-8 px-2 rounded-lg text-slate-600 hover:text-primary hover:bg-primary/10 gap-1 text-3xs font-bold"
            title="إضافة حساب فرعي تحت هذا القسم"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حساب فرعي</span>
          </Button>
        </div>
      </div>

      {/* Children Tree Container */}
      {isExpanded && hasChildren && (
        <div className="p-3 sm:p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 space-y-1">
          {node.children.map((child) => (
            <AccountBranchNode
              key={child.id}
              node={child}
              level={1}
              query={query}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddSubAccount={onAddSubAccount}
              onViewLedger={onViewLedger}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Branch / Leaf Node */
function AccountBranchNode({
  node,
  level,
  query,
  expandedIds,
  onToggle,
  onAddSubAccount,
  onViewLedger,
}: {
  node: AccountTreeNodeType;
  level: number;
  query: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddSubAccount: (parentId: string) => void;
  onViewLedger: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isLeaf = node.account_type === 'leaf' || !hasChildren;

  const matchesSelf =
    !query ||
    node.name.toLowerCase().includes(query.toLowerCase()) ||
    (node.name_en && node.name_en.toLowerCase().includes(query.toLowerCase())) ||
    node.code.includes(query);

  // Determine nature (Debit vs Credit)
  const isDebit =
    node.type === 'asset' ||
    node.type === 'expense' ||
    node.code.startsWith('1') ||
    node.code.startsWith('5');

  return (
    <div className={cn('space-y-1', !matchesSelf && !hasChildren && 'hidden')}>
      <div
        className={cn(
          'group flex items-center justify-between p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer border border-transparent',
          'hover:bg-slate-100/70 dark:hover:bg-slate-900/60 hover:border-slate-200/60 dark:hover:border-slate-800',
          level > 1 && 'mr-4 sm:mr-6'
        )}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Chevron or Dot */}
          <div className="w-5 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-foreground" />
              )
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            )}
          </div>

          {/* Node Icon */}
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform',
              hasChildren
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                : 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
            )}
          >
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5" />
              ) : (
                <Folder className="w-3.5 h-3.5" />
              )
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Account Titles & Badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              {node.name}
            </span>
            <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              #{node.code}
            </span>

            {/* Badges for nature and type */}
            <span
              className={cn(
                'text-4xs font-bold px-1.5 py-0.5 rounded-md border',
                isDebit
                  ? 'bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60'
                  : 'bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60'
              )}
            >
              {isDebit ? 'طبيعة مدينة' : 'طبيعة دائنة'}
            </span>

            {isLeaf ? (
              <span className="text-4xs font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                حساب فرعي
              </span>
            ) : (
              <span className="text-4xs font-bold px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200/60">
                رئيسي ({node.children.length})
              </span>
            )}
          </div>
        </div>

        {/* Balance & Hover Actions */}
        <div
          className="flex items-center gap-2.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Actions (visible on hover or always on touch) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onAddSubAccount(node.id)}
              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800"
              title="إضافة حساب فرعي"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onViewLedger(node.id)}
              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              title="فتح كشف الحساب في دفتر الأستاذ"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Balance */}
          <div className="text-left min-w-[90px]" dir="ltr">
            <span
              className={cn(
                'text-xs sm:text-sm font-black font-mono tabular-nums',
                (hasChildren ? node.rollupBalance : node.current_balance) > 0
                  ? 'text-primary'
                  : (hasChildren ? node.rollupBalance : node.current_balance) < 0
                  ? 'text-rose-600'
                  : 'text-slate-400'
              )}
            >
              {formatNumber(hasChildren ? node.rollupBalance : node.current_balance)}{' '}
              <span className="text-4xs font-sans text-slate-400 font-bold ml-0.5">ج.م</span>
            </span>
          </div>
        </div>
      </div>

      {/* Nested Branch Line and Children */}
      {isExpanded && hasChildren && (
        <div className="mr-5 sm:mr-7 pr-3 border-r-2 border-slate-200/80 dark:border-slate-800 space-y-1 py-1">
          {node.children.map((child) => (
            <AccountBranchNode
              key={child.id}
              node={child}
              level={level + 1}
              query={query}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddSubAccount={onAddSubAccount}
              onViewLedger={onViewLedger}
            />
          ))}
        </div>
      )}
    </div>
  );
}
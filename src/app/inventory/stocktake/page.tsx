'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { formatNumber, formatDateTime } from '@/lib/format';
import type { StocktakeSession, Warehouse } from '@/types';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  FolderOpen,
  X
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

function StocktakeContent() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [sessList, whList] = await Promise.all([
        db.stocktake_sessions.where('org_id').equals(orgId).reverse().sortBy('created_at'),
        db.warehouses.where('org_id').equals(orgId).toArray(),
      ]);
      setSessions(sessList);
      setWarehouses(whList);
    } catch (err) {
      console.error('Error loading stocktake data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, branchId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.session_number.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchWarehouse = warehouseFilter === 'all' || s.warehouse_id === warehouseFilter;
      return matchQuery && matchStatus && matchWarehouse;
    });
  }, [sessions, searchQuery, statusFilter, warehouseFilter]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const drafts = sessions.filter((s) => s.status === 'draft').length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const totalDiff = sessions.reduce((acc, s) => acc + (s.total_difference_value || 0), 0);
    return { total, drafts, completed, totalDiff };
  }, [sessions]);

  const getWarehouseName = (whId: string) => {
    return warehouses.find((w) => w.id === whId)?.name || 'المستودع الرئيسي';
  };

  return (
    <AppShell
      title="الجرد الفعلي للمخزون"
      subtitle="جلسات جرد الأصناف، مقارنة الأرصدة الدفترية بالفعلية، واعتماد الفروقات والتسويات المخزنية"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            className="h-10 px-3.5 bg-card border-border hover:bg-muted text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Link href="/inventory/adjustments/new">
            <Button className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all">
              <Plus className="w-4 h-4" />
              <span>بدء جلسة جرد جديدة</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي جلسات الجرد"
            value={stats.total.toString()}
            icon={<ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            variant="blue"
          />
          <KpiCard
            label="جلسات قيد المراجعة (مسودة)"
            value={stats.drafts.toString()}
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            variant="amber"
          />
          <KpiCard
            label="جلسات معتمدة ومكتملة"
            value={stats.completed.toString()}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            variant="emerald"
          />
          <KpiCard
            label="صافي قيمة الفروقات المعتمدة"
            value={`${formatNumber(stats.totalDiff)} ج.م`}
            icon={<ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            variant={stats.totalDiff >= 0 ? 'indigo' : 'rose'}
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم الجلسة أو الملاحظات..."
                className="pr-10 h-10 rounded-xl bg-background border-border text-xs"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="المستودع" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل المستودعات</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="draft">مسودة (جارية)</SelectItem>
                  <SelectItem value="completed">مكتملة ومعتمدة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || statusFilter !== 'all' || warehouseFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setWarehouseFilter('all');
                }}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            )}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[380px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm shadow-xs">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">رقم الجلسة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">المستودع</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">تاريخ البدء</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">فارق القيمة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground text-center">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={6} className="py-4 px-4">
                        <Skeleton className="h-6 w-full opacity-60" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredSessions.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16">
                      <EmptyState
                        icon={<FolderOpen className="w-10 h-10 text-muted-foreground/60" />}
                        title="لا توجد جلسات جرد سابقة"
                        description="ابدأ جلسة جرد جديدة لمقارنة الأرصدة الدفترية بالفعلية واعتماد الفروقات المخزنية."
                        action={{
                          label: 'بدء جلسة جرد الآن',
                          onClick: () => {
                            window.location.href = '/inventory/adjustments/new';
                          },
                          icon: <Plus className="w-4 h-4 ml-1.5" />,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((s) => (
                    <TableRow
                      key={s.id}
                      className="border-border hover:bg-muted/40 transition-colors group"
                    >
                      <TableCell className="font-bold font-mono text-primary py-3.5">
                        {s.session_number}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {getWarehouseName(s.warehouse_id)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-3xs">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                      <TableCell>
                        {s.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمدة</span>
                          </span>
                        )}
                        {s.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>مسودة جارية</span>
                          </span>
                        )}
                        {s.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>ملغاة</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`font-bold font-mono text-xs ${
                        (s.total_difference_value || 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatNumber(s.total_difference_value || 0)} ج.م
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/inventory/adjustments/${s.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 rounded-xl border-border text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 ml-1.5" />
                            <span>عرض واعتماد التفاصيل</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </AppShell>
  );
}

export default function StocktakePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StocktakeContent />
    </Suspense>
  );
}
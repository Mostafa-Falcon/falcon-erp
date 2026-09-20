'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RotateCcw,
  Search,
  Printer,
  FileText,
  FileSpreadsheet,
  Columns,
  Info,
  Eye,
  Lock,
  Plus,
  SlidersHorizontal,
  Crown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { db } from '@/core/db/app_database';
import { formatNumber } from '@/lib/format';
import type { CashierShift, Treasury, User as UserType } from '@/types';
import { toast } from 'sonner';
import { ShiftDetailModal } from './ShiftDetailModal';
import { AdminCloseShiftModal } from './AdminCloseShiftModal';
import { OpenShiftModal } from './OpenShiftModal';

export function ShiftsManager() {
  const router = useRouter();
  const { currentUser, activeBranchId, setActiveBranchId, setActiveShift } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';
  const [resolvedBranchId, setResolvedBranchId] = useState('');
  const [branchName, setBranchName] = useState('');

  const isOwnerOrAdmin =
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'manager';

  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [filterType, setFilterType] = useState<'all' | 'open' | 'closed' | 'today' | 'owner' | 'employee' | 'diff'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<CashierShift | null>(null);
  const [selectedShiftForClose, setSelectedShiftForClose] = useState<CashierShift | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);

      let effectiveBranchId = branchId || resolvedBranchId;
      if (!effectiveBranchId && orgId) {
        const b = await db.branches.where('org_id').equals(orgId).first();
        if (b) {
          effectiveBranchId = b.id;
          setResolvedBranchId(b.id);
          setActiveBranchId(b.id);
          setBranchName(b.name);
        }
      } else if (effectiveBranchId && !branchName) {
        const b = await db.branches.get(effectiveBranchId);
        if (b) setBranchName(b.name);
      }

      let [sft, tres, usrs] = await Promise.all([
        SalesRepository.getShifts(effectiveBranchId, orgId),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
        db.users.where('org_id').equals(orgId).toArray(),
      ]);

      if (tres.length === 0 && orgId) {
        const defaultTreasury = await TreasuryRepository.ensureDefaultTreasury({
          orgId,
          branchId: effectiveBranchId || undefined,
        });
        tres = [defaultTreasury];
      }

      setShifts(sft);
      setTreasuries(tres);
      setUsers(usrs);

      if (currentUser?.id) {
        const currentOpen = await SalesRepository.getCurrentOpenShift(
          currentUser.id,
          effectiveBranchId,
          orgId
        );
        setActiveShift(currentOpen || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل سجل الورديات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, branchId]);

  // Helpers
  const getUserName = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u?.full_name || u?.username || 'مستخدم غير معروف';
  };

  const isUserOwnerOrAdmin = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u?.role === 'owner' || u?.role === 'admin' || u?.role === 'super_admin' || u?.role === 'manager';
  };

  const formatShiftDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (filterType === 'open' && s.status !== 'open') return false;
      if (filterType === 'closed' && s.status !== 'closed') return false;
      if (filterType === 'today') {
        const isToday = new Date(s.opened_at).toDateString() === new Date().toDateString();
        if (!isToday) return false;
      }
      if (filterType === 'owner') {
        if (!isUserOwnerOrAdmin(s.user_id)) return false;
      }
      if (filterType === 'employee') {
        if (isUserOwnerOrAdmin(s.user_id)) return false;
      }
      if (filterType === 'diff') {
        if (!s.difference || s.difference === 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = String(s.shift_number).includes(q);
        const nameMatch = getUserName(s.user_id).toLowerCase().includes(q);
        return numMatch || nameMatch;
      }

      return true;
    });
  }, [shifts, filterType, searchQuery, users]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShifts.slice(start, start + pageSize);
  }, [filteredShifts, currentPage, pageSize]);

  return (
    <div className="space-y-4 select-none" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          سجل ورديات الكاشير
        </h1>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsOpenShiftModalOpen(true)}
            size="sm"
            className="h-9 px-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فتح وردية جديدة</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="w-full sm:w-56 shrink-0">
          <Select
            value={filterType}
            onValueChange={(val: any) => {
              setFilterType(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-white dark:bg-[#111726]">
              <SelectValue placeholder="تصفية الورديات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الورديات</SelectItem>
              <SelectItem value="open">الورديات المفتوحة</SelectItem>
              <SelectItem value="closed">الورديات المغلقة</SelectItem>
              <SelectItem value="today">ورديات اليوم</SelectItem>
              {isOwnerOrAdmin && (
                <>
                  <SelectItem value="owner">ورديات صاحب المنشأة</SelectItem>
                  <SelectItem value="employee">ورديات الموظفين</SelectItem>
                </>
              )}
              <SelectItem value="diff">ورديات بها عجز أو زيادة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="بحث باسم الكاشير أو رقم الوردية..."
            className="h-10 text-xs font-semibold rounded-xl pl-9"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111726] overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              title="طباعة"
              className="w-8 h-8 rounded-lg"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => toast.info('جاري تصدير PDF')}
              title="تصدير PDF"
              className="w-8 h-8 rounded-lg border-pink-200 dark:border-pink-900/50 text-pink-600 bg-pink-50/50 dark:bg-pink-950/40 hover:bg-pink-100"
            >
              <FileText className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => toast.info('جاري تصدير Excel')}
              title="تصدير Excel"
              className="w-8 h-8 rounded-lg border-emerald-200 dark:border-emerald-900/50 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              title="خيارات العرض"
              className="w-8 h-8 rounded-lg"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info('تخصيص الأعمدة متاح')}
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>تخصيص الأعمدة</span>
            </Button>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>عرض</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>إدخالات</span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 text-center text-xs font-bold text-slate-400">
            جاري تحميل سجل الورديات...
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="py-20 text-center text-xs font-bold text-slate-400">
            لا توجد ورديات مسجلة مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <Table className="text-right text-xs">
              <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">#</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">الكاشير</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">تاريخ الفتح</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">رصيد الفتح</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">تاريخ الإغلاق</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">رصيد الإغلاق</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-center">الحالة</TableHead>
                  <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
                {paginatedShifts.map((s) => {
                  const isOpen = s.status === 'open';
                  const isOwner = isUserOwnerOrAdmin(s.user_id);
                  const isCurrentUsersShift = s.user_id === currentUser?.id;

                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="py-3.5 px-3 font-mono font-black text-pink-600 dark:text-pink-400">
                        {s.shift_number}
                      </TableCell>

                      <TableCell className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 dark:text-slate-200">{getUserName(s.user_id)}</span>
                          {isOwner && (
                            <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200">
                              <Crown className="w-2.5 h-2.5 ml-0.5 inline" /> مسؤول
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {formatShiftDate(s.opened_at)}
                      </TableCell>

                      <TableCell className="py-3.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatNumber(s.opening_balance)} ج.م
                      </TableCell>

                      <TableCell className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {formatShiftDate(s.closed_at)}
                      </TableCell>

                      <TableCell className="py-3.5 px-3 font-mono">
                        {isOpen ? (
                          <span className="text-slate-400 font-semibold">—</span>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatNumber(s.actual_closing_balance ?? 0)} ج.م
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            isOpen
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isOpen ? 'نشطة ومفتوحة' : 'مغلقة ومقفلة'}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedShiftForDetail(s)}
                            title="عرض تفاصيل الوردية"
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-pink-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {isOpen && (isOwnerOrAdmin || isCurrentUsersShift) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedShiftForClose(s)}
                              title="إغلاق الوردية وتصفية النقدية"
                              className="w-7 h-7 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Table Footer: Pagination */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              عرض {filteredShifts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{' '}
              {Math.min(currentPage * pageSize, filteredShifts.length)} من إجمالي {filteredShifts.length} وردية
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="w-8 h-8 rounded-lg cursor-pointer"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg cursor-pointer"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Badge
              variant="secondary"
              className="px-3 h-8 flex items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 text-pink-600 font-bold font-mono"
            >
              {currentPage} / {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded-lg cursor-pointer"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="w-8 h-8 rounded-lg cursor-pointer"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ShiftDetailModal
        shift={selectedShiftForDetail}
        isOpen={Boolean(selectedShiftForDetail)}
        onClose={() => setSelectedShiftForDetail(null)}
        users={users}
        treasuries={treasuries}
      />

      <AdminCloseShiftModal
        shift={selectedShiftForClose}
        isOpen={Boolean(selectedShiftForClose)}
        onClose={() => setSelectedShiftForClose(null)}
        currentUser={currentUser}
        users={users}
        treasuries={treasuries}
        onShiftClosed={() => {
          setSelectedShiftForClose(null);
          loadData();
        }}
      />

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        currentUser={currentUser}
        orgId={orgId}
        branchId={branchId || resolvedBranchId}
        branchName={branchName}
        treasuries={treasuries}
        onShiftOpened={(shift) => {
          setIsOpenShiftModalOpen(false);
          setActiveShift(shift);
          loadData();
        }}
      />
    </div>
  );
}

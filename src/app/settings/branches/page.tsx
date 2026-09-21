'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SettingsRepository } from '@/modules/settings/settings_repository';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import type { Branch } from '@/types';
import { toast } from 'sonner';
import {
  Store,
  Plus,
  MapPin,
  Phone,
  RotateCw,
  Printer,
  FileText,
  FileSpreadsheet,
  SlidersHorizontal,
  MoreVertical,
  CheckCircle2,
  Building2,
  Check,
  Edit,
  Power
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useRouter } from 'next/navigation';

export default function BranchesSettingsPage() {
  const router = useRouter();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  // Core state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState('25');
  const [subTier, setSubTier] = useState('standard');
  const [isExpired, setIsExpired] = useState(false);

  const perms = getSubscriptionPermissions(subTier, isExpired);

  // Dialog / Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form inputs state
  const [bName, setBName] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active row action dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Column Customization state (True = Visible)
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    address: true,
    phone: true,
    status: true,
  });

  const loadBranches = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [list, orgRec] = await Promise.all([
        SettingsRepository.getBranches(orgId),
        db.organizations.get(orgId),
      ]);
      setBranches(list);
      if (orgRec) {
        setSubTier(orgRec.subscription_tier || 'standard');
        setIsExpired(orgRec.subscription_expires_at ? new Date(orgRec.subscription_expires_at) < new Date() : false);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      toast.error('حدث خطأ أثناء تحميل الفروع');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const checkBranchAccess = async () => {
      const { db } = await import('@/core/db/app_database');
      const org = await db.organizations.get(orgId);
      const permsCheck = getSubscriptionPermissions(
        org?.subscription_tier,
        org?.subscription_expires_at ? new Date(org.subscription_expires_at) < new Date() : false
      );
      if (!permsCheck.canManageBranches) {
        toast.error('إدارة الفروع المتعددة غير متاحة في الحساب القياسي (الفرع الرئيسي فقط). يرجى الترقية لباقة VIP لتفعيل الفروع.');
        router.replace('/settings');
      }
    };
    checkBranchAccess();
  }, [orgId]);

  // Open modal for a new branch
  const handleOpenAddModal = () => {
    if (!perms.canManageBranches) {
      toast.error('الحساب القياسي يقتصر على الفرع الرئيسي فقط. لإنشاء فروع ومستودعات متعددة يرجى الترخيص لباقة VIP عبر لوحة التحكم.');
      return;
    }
    setEditingBranch(null);
    setBName('');
    setBPhone('');
    setBAddress('');
    setIsDialogOpen(true);
  };

  // Open modal for editing an existing branch
  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBName(branch.name);
    setBPhone(branch.phone || '');
    setBAddress(branch.address || '');
    setActiveMenuId(null);
    setIsDialogOpen(true);
  };

  // Create or Update branch handler
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) {
      toast.error('يرجى إدخال اسم الفرع');
      return;
    }

    try {
      setIsSaving(true);
      if (editingBranch) {
        await SettingsRepository.updateBranch(editingBranch.id, {
          name: bName.trim(),
          phone: bPhone.trim() || undefined,
          address: bAddress.trim() || undefined,
        });
        toast.success('تم تحديث بيانات الفرع بنجاح');
      } else {
        await SettingsRepository.createBranch({
          orgId,
          name: bName.trim(),
          phone: bPhone.trim() || undefined,
          address: bAddress.trim() || undefined,
          isMain: branches.length === 0,
        });
        toast.success('تمت إضافة الفرع الجديد بنجاح');
      }

      setIsDialogOpen(false);
      setBName('');
      setBPhone('');
      setBAddress('');
      setEditingBranch(null);
      await loadBranches();
    } catch (err) {
      console.error('Error saving branch:', err);
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle activation status
  const handleToggleActive = async (branch: Branch) => {
    try {
      await SettingsRepository.toggleBranchActive(branch.id);
      toast.success(branch.is_active ? 'تم إيقاف الفرع بنجاح' : 'تم تفعيل الفرع بنجاح');
      setActiveMenuId(null);
      await loadBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير حالة الفرع');
    }
  };

  // Set as main branch
  const handleSetMain = async (branchId: string) => {
    try {
      await SettingsRepository.setMainBranch(branchId, orgId);
      toast.success('تم تعيين الفرع كفرع رئيسي للمنظومة');
      setActiveMenuId(null);
      await loadBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء التعيين كفرع رئيسي');
    }
  };

  // Toggle visibility of a column
  const toggleColumnVisibility = (col: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  // Filter branches based on search query
  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });

  const totalCount = branches.length;
  const activeCount = branches.filter((b) => b.is_active).length;

  const headerActions = perms.canManageBranches ? (
    <Button
      onClick={handleOpenAddModal}
      className="bg-[#6366f1] hover:bg-indigo-600 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-500/10 cursor-pointer print:hidden"
    >
      <Plus className="w-4 h-4" />
      إضافة فرع جديد
    </Button>
  ) : (
    <div className="px-3.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
      الفرع الرئيسي فقط
    </div>
  );

  return (
    <AppShell
      title="إدارة الفروع"
      subtitle="تنظيم فروع المؤسسة وتوزيع صلاحيات العمل والإدارة حسب النطاق الجغرافي."
      actions={headerActions}
    >
      {/* 🖨️ Surgical CSS Print Media Injector */}
      <style jsx global>{`
        @media print {
          /* Hide EVERYTHING on the website except the targeted print-grid card container */
          body * {
            visibility: hidden !important;
          }

          /* Show only the target table container and its internal child elements */
          .printable-grid-container,
          .printable-grid-container * {
            visibility: visible !important;
          }

          /* Position the table container at the absolute top-left of the print sheet */
          .printable-grid-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Hide utility action buttons, popovers, and search bars during print */
          .print\\:hidden,
          .printable-grid-container .p-4.border-b,
          .printable-grid-container td:last-child,
          .printable-grid-container th:last-child,
          .printable-grid-container td:first-child,
          .printable-grid-container th:first-child {
            display: none !important;
            visibility: hidden !important;
          }

          /* Clean and style table border for official document appearance */
          .printable-grid-container table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .printable-grid-container th,
          .printable-grid-container td {
            border: 1px solid #cbd5e1 !important;
            padding: 10px !important;
            text-align: right !important;
            color: #000000 !important;
          }
          .printable-grid-container th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="space-y-5 text-right" dir="rtl">

        {/* ==================== TOP STATS CARDS (Hidden on print via body selector) ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-0.5">إجمالي الفروع</span>
                <span className="text-xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                  {totalCount} <span className="text-xs font-bold text-slate-400">فرع</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-0.5">الفروع النشطة</span>
                <span className="text-xl font-black text-[#10b981] flex items-baseline gap-1">
                  {activeCount} <span className="text-xs font-bold text-slate-400">فرع نشط</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== DATA GRID & TOOLBAR ==================== */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs printable-grid-container">

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">

            {/* Left toolbar utilities */}
            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={loadBranches}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                title="تحديث البيانات"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.print()}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                title="طباعة الجدول الحالي"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                title="تصدير PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                title="تصدير Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

              {/* Dynamic Column Customization Popover Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                  className={`h-9 px-3 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-all ${
                    isColumnMenuOpen ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500' : ''
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  تخصيص الأعمدة
                </Button>

                {/* Column Customization Popover Box */}
                {isColumnMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsColumnMenuOpen(false)} />
                    <div className="absolute right-0 top-10 bg-[#f1f2f6] dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-700 shadow-xl rounded-2xl p-4 z-40 min-w-[210px] text-right space-y-3 animate-in fade-in zoom-in-95 duration-100 select-none">
                      <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 border-b border-slate-200/60 dark:border-slate-600/50 pb-1.5 text-center">
                        تخصيص الأعمدة
                      </div>

                      <div className="space-y-2.5 pt-0.5">
                        <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.name}
                            onChange={() => toggleColumnVisibility('name')}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                          />
                          <span>الفرع</span>
                        </label>

                        <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.address}
                            onChange={() => toggleColumnVisibility('address')}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                          />
                          <span>العنوان</span>
                        </label>

                        <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.phone}
                            onChange={() => toggleColumnVisibility('phone')}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                          />
                          <span>الاتصال</span>
                        </label>

                        <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.status}
                            onChange={() => toggleColumnVisibility('status')}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                          />
                          <span>الحالة</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Inline Search */}
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث السريع في الفروع..."
                className="h-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold w-48 rounded-xl focus:bg-white"
              />
            </div>

            {/* Right page size layout picker */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>عرض</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-16 h-9 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="25" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>إدخالات</span>
            </div>

          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/20">
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 w-3.5 h-3.5 accent-indigo-600" readOnly />
                  </th>
                  {visibleColumns.name && <th className="py-3 px-4">الفرع</th>}
                  {visibleColumns.address && <th className="py-3 px-4">العنوان</th>}
                  {visibleColumns.phone && <th className="py-3 px-4">الاتصال</th>}
                  {visibleColumns.status && <th className="py-3 px-4 text-center">الحالة</th>}
                  <th className="py-3 px-4 w-12 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 w-3.5 h-3.5 accent-indigo-600" readOnly />
                    </td>

                    {visibleColumns.name && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 shadow-inner">
                            <Store className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <span className="text-slate-900 dark:text-white font-black block">
                              {branch.name}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 font-mono block mt-0.5 uppercase">
                              {branch.is_main ? 'MAIN' : branch.code}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleColumns.address && (
                      <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">
                        {branch.address || 'غير محدد'}
                      </td>
                    )}

                    {visibleColumns.phone && (
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {branch.phone || '—'}
                      </td>
                    )}

                    {visibleColumns.status && (
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                            branch.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-500'
                          }`}
                        >
                          {branch.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                    )}

                    <td className="py-3 px-4 text-left relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === branch.id ? null : branch.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === branch.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute left-4 top-10 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1 z-20 min-w-[160px] text-right space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                            {!branch.is_main && (
                              <button
                                onClick={() => handleSetMain(branch.id)}
                                className="w-full px-3 py-2 text-[11px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between transition-colors text-right cursor-pointer"
                              >
                                <span>جعلها رئيسية</span>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(branch)}
                              className="w-full px-3 py-2 text-[11px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between transition-colors text-right cursor-pointer"
                            >
                              <span>تعديل البيانات</span>
                              <Edit className="w-3.5 h-3.5 text-blue-500" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(branch)}
                              className={`w-full px-3 py-2 text-[11px] font-black rounded-lg flex items-center justify-between transition-colors text-right cursor-pointer ${
                                branch.is_active
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                              }`}
                            >
                              <span>{branch.is_active ? 'تعطيل الفرع' : 'تفعيل الفرع'}</span>
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredBranches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                      {isLoading ? 'جاري تحميل بيانات الفروع...' : 'لا توجد فروع مسجلة تطابق البحث.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination status bar */}
          <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400">
            <div>
              عرض 1 إلى {filteredBranches.length} من إجمالي {totalCount} فرع
            </div>
            <div className="flex items-center gap-1">
              <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs font-mono">
                1 / 1
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ==================== ADD / EDIT BRANCH DIALOG ==================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] text-right" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <Building2 className="w-5 h-5" />
              <DialogTitle>{editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع / موقع عمل جديد'}</DialogTitle>
            </div>
            <DialogDescription>
              {editingBranch
                ? 'تعديل وتحديث البيانات القانونية ومعلومات الاتصال والعنوان للفرع المختار'
                : 'تسجيل فرع أو مستودع أو معمل تخزين جديد تابع للمؤسسة وتوليد الكود التسلسلي له تلقائياً'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBranch} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                اسم الفرع / موقع العمل <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Input
                  type="text"
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="مثال: فرع المنطقة الغربية، المستودع المركزي"
                  className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 text-xs font-bold focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                رقم هاتف الفرع (إن وجد)
              </label>
              <div className="relative group">
                <Input
                  type="text"
                  value={bPhone}
                  onChange={(e) => setBPhone(e.target.value)}
                  placeholder="مثال: 05XXXXXXXX أو رقم أرضي"
                  className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 text-xs font-bold focus:bg-white transition-colors"
                />
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                العنوان التفصيلي وموقع النطاق الجغرافي
              </label>
              <div className="relative group">
                <Input
                  type="text"
                  value={bAddress}
                  onChange={(e) => setBAddress(e.target.value)}
                  placeholder="المحافظة، المدينة، اسم الحي، الشارع الرئيسي"
                  className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 text-xs font-bold focus:bg-white transition-colors"
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 px-4 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm shadow-indigo-500/10"
              >
                {isSaving ? 'جاري الحفظ...' : editingBranch ? 'تحديث البيانات' : 'حفظ وإضافة الفرع'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}

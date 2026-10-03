'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase,
  Plus,
  Search,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  User,
  Filter,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { CrmRepository } from '@/modules/contacts/crm_repository';
import { formatNumber } from '@/lib/format';
import type { CrmLead, LeadStatus, SalesRep } from '@/types';
import { toast } from 'sonner';

function CrmContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('مباشر');
  const [estimatedValue, setEstimatedValue] = useState<number>(10000);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [ldList, repList] = await Promise.all([
        CrmRepository.getLeads(orgId),
        CrmRepository.getSalesReps(orgId),
      ]);
      setLeads(ldList);
      setSalesReps(repList);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل بيانات الـ CRM');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.company_name.toLowerCase().includes(search.toLowerCase()) ||
        l.contact_person.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const stats = useMemo(() => {
    const totalCount = leads.length;
    const newCount = leads.filter((l) => l.status === 'new').length;
    const negotiatingCount = leads.filter(
      (l) => l.status === 'negotiating' || l.status === 'contacted'
    ).length;
    const wonCount = leads.filter((l) => l.status === 'won').length;
    const pipelineValue = leads.reduce((acc, l) => acc + l.estimated_value, 0);
    return { totalCount, newCount, negotiatingCount, wonCount, pipelineValue };
  }, [leads]);

  const handleCreate = async () => {
    if (!companyName.trim() || !phone.trim()) {
      toast.error('يرجى كتابة اسم المنشأة / العميل ورقم الهاتف');
      return;
    }

    try {
      const rep = salesReps.find((r) => r.id === selectedRepId);

      await CrmRepository.createLead({
        orgId,
        companyName,
        contactPerson,
        phone,
        email,
        source,
        estimatedValue,
        salesRepId: selectedRepId || undefined,
        salesRepName: rep?.name,
        notes,
      });

      toast.success('تمت إضافة الفرصة البيعية بنجاح');
      setIsOpen(false);
      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setNotes('');
      setEstimatedValue(10000);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل إضافة العميل المحتمل');
    }
  };

  const handleUpdateStatus = async (id: string, status: LeadStatus) => {
    try {
      await CrmRepository.updateLeadStatus(id, status);
      toast.success('تم تحديث حالة الفرصة بنجاح');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث الحالة');
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'won':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
            صفقة ناجحة (Won)
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
            صفقة ملغاة (Lost)
          </Badge>
        );
      case 'negotiating':
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
            مفاوضات جارية
          </Badge>
        );
      case 'contacted':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
            تم التواصل
          </Badge>
        );
      case 'new':
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
            عميل محتمل جديد
          </Badge>
        );
    }
  };

  return (
    <AppShell
      title="إدارة علاقات العملاء (CRM)"
      subtitle="متابعة الفرص البيعية، مراحل التفاوض، وتوزيع العملاء المحتملين على المندوبين"
      actions={
        <Button
          onClick={() => setIsOpen(true)}
          className="gap-2 shadow-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          إضافة عميل محتمل
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي الفرص والعملاء"
            value={stats.totalCount}
            icon={<Briefcase className="w-5 h-5" />}
            variant="blue"
          />
          <KpiCard
            label="مرحلة المفاوضات"
            value={stats.negotiatingCount}
            icon={<Clock className="w-5 h-5" />}
            variant="indigo"
          />
          <KpiCard
            label="صفقات مكتملة (Won)"
            value={stats.wonCount}
            icon={<CheckCircle2 className="w-5 h-5" />}
            variant="emerald"
          />
          <KpiCard
            label="قيمة الفرص المتوقعة"
            value={stats.pipelineValue}
            unit="ج.م"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="amber"
          />
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-surface rounded-2xl border border-border/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="البحث باسم المنشأة، جهة الاتصال، أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-10 bg-slate-50 dark:bg-slate-900 border-border text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 text-xs font-bold bg-slate-50 dark:bg-slate-900">
                <SelectValue placeholder="حالة الفرصة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="new">عميل جديد</SelectItem>
                <SelectItem value="contacted">تم التواصل</SelectItem>
                <SelectItem value="negotiating">مفاوضات</SelectItem>
                <SelectItem value="won">صفقة ناجحة</SelectItem>
                <SelectItem value="lost">صفقة ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Table or Empty State */}
        {isLoading ? (
          <div className="p-16 text-center text-xs font-bold text-slate-400 bg-surface rounded-2xl border border-border/80">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            جاري تحميل بيانات الفرص البيعية...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-8 h-8 text-slate-400" />}
            title="لا توجد فرص بيعية مطابقة"
            description={
              search || statusFilter !== 'all'
                ? 'جرّب تعديل مصطلحات البحث أو تغيير فلتر الحالة للوصول إلى السجلات.'
                : 'لم تقم بإضافة أي فرص أو عملاء محتملين بعد. ابدأ الآن بإنشاء أول سجل لتتبع الفرصة البيعية.'
            }
            action={
              search || statusFilter !== 'all'
                ? {
                    label: 'إعادة ضبط الفلاتر',
                    onClick: () => {
                      setSearch('');
                      setStatusFilter('all');
                    },
                  }
                : {
                    label: 'إضافة أول عميل محتمل',
                    onClick: () => setIsOpen(true),
                    icon: <Plus className="w-4 h-4" />,
                  }
            }
          />
        ) : (
          <div className="bg-surface rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/60 dark:bg-slate-900/40">
                <TableRow>
                  <TableHead className="text-right font-black">المنشأة / العميل</TableHead>
                  <TableHead className="text-right font-black">الشخص المسؤول والتواصل</TableHead>
                  <TableHead className="text-right font-black">القيمة التقديرية</TableHead>
                  <TableHead className="text-right font-black">المندوب المتابع</TableHead>
                  <TableHead className="text-right font-black">المصدر</TableHead>
                  <TableHead className="text-center font-black">الحالة</TableHead>
                  <TableHead className="text-center font-black">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <TableCell className="font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold">{l.company_name}</div>
                          {l.notes && (
                            <div className="text-3xs text-slate-400 line-clamp-1 max-w-[200px]">
                              {l.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        {l.contact_person || '—'}
                      </div>
                      <div className="text-slate-400 text-3xs font-mono mt-0.5">
                        {l.phone}
                      </div>
                    </TableCell>

                    <TableCell className="font-bold text-xs text-primary">
                      {formatNumber(l.estimated_value)} ج.م
                    </TableCell>

                    <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {l.sales_rep_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {l.sales_rep_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">غير معين</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 font-medium">
                      {l.source || 'مباشر'}
                    </TableCell>

                    <TableCell className="text-center">
                      {getStatusBadge(l.status)}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {l.status !== 'won' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={() => handleUpdateStatus(l.id, 'won')}
                            title="تحويل لصفقة ناجحة"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {l.status !== 'lost' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleUpdateStatus(l.id, 'lost')}
                            title="إلغاء الصفقة"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modal: Add Lead */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-base">
                إضافة عميل محتمل / فرصة استثمارية
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1">
                  اسم المنشأة أو العميل <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="مثال: مستشفى الشفاء، صيدلية الأمل..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">الشخص المسؤول</label>
                  <Input
                    placeholder="اسم المسؤول"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    رقم الهاتف <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">القيمة التقديرية (ج.م)</label>
                  <Input
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">المندوب المتابع</label>
                  <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                    <SelectTrigger className="h-10 text-xs font-bold">
                      <SelectValue placeholder="اختر المندوب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون مندوب</SelectItem>
                      {salesReps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">البريد الإلكتروني (اختياري)</label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">ملاحظات واحتياجات الفرصة</label>
                <Textarea
                  placeholder="تفاصيل العرض، موعد المتابعة، والاحتياجات المطلوبة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleCreate}
                  className="flex-1 font-bold h-10 shadow-xs"
                >
                  حفظ الفرصة البيعية
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="h-10 font-bold"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function CrmPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-slate-400">
          جاري التحميل...
        </div>
      }
    >
      <CrmContent />
    </Suspense>
  );
}
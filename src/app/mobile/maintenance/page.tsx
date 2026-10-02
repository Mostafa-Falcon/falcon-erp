import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/core/db/app_database';
import { MaintenanceRepository } from '@/modules/mobile/maintenance_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackageCheck,
  User,
  Phone,
  Smartphone,
  ShieldAlert,
  Loader2,
  DollarSign,
  Printer,
  XCircle,
} from 'lucide-react';
import type {
  MaintenanceTicket,
  MaintenanceTicketItem,
  RepairStatus,
  Product,
  Unit,
  Contact,
  Warehouse,
  Treasury,
} from '@/types';
import { toast } from 'sonner';

const STATUS_LABELS: Record<RepairStatus, { label: string; color: string; icon: React.ReactNode }> = {
  received: { label: 'تم الاستلام', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300', icon: <Clock className="w-3.5 h-3.5" /> },
  diagnosing: { label: 'جاري الفحص', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300', icon: <Search className="w-3.5 h-3.5" /> },
  waiting_approval: { label: 'انتظار العميل', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  repairing: { label: 'جاري الإصلاح', color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300', icon: <Wrench className="w-3.5 h-3.5" /> },
  ready: { label: 'جاهز للتسليم', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300', icon: <PackageCheck className="w-3.5 h-3.5" /> },
  delivered: { label: 'تم التسليم', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'ملغي / متعذر', color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function MaintenancePage() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [ticketItems, setTicketItems] = useState<MaintenanceTicketItem[]>([]);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  // Form State: New Ticket
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [passcodeOrPattern, setPasscodeOrPattern] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [accessoriesReceived, setAccessoriesReceived] = useState('');
  const [laborFee, setLaborFee] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form State: Add Spare Part
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');

  // Form State: Pay
  const [payAmount, setPayAmount] = useState('');
  const [targetTreasuryId, setTargetTreasuryId] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [tList, cList, pList, uList, wList, trList] = await Promise.all([
        db.maintenance_tickets.where('org_id').equals(orgId).reverse().toArray(),
        db.contacts.where('org_id').equals(orgId).toArray(),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active).toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
        db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
      ]);

      const umap: Record<string, Unit> = {};
      for (const u of uList) umap[u.id] = u;

      setTickets(tList);
      setCustomers(cList.filter((c) => c.type === 'customer' || c.type === 'both'));
      setProducts(pList);
      setUnitsById(umap);
      setWarehouses(wList);
      setTreasuries(trList);

      if (wList.length > 0) setTargetWarehouseId(wList[0].id);
      if (trList.length > 0) setTargetTreasuryId(trList.find((t) => t.is_default)?.id || trList[0].id);
    } catch (err) {
      console.error('Error loading maintenance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const loadTicketDetail = async (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    try {
      const items = await db.maintenance_ticket_items.where('ticket_id').equals(ticket.id).toArray();
      setTicketItems(items);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesSearch =
        !q ||
        t.ticket_number.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.includes(q) ||
        t.device_model.toLowerCase().includes(q) ||
        (t.imei_or_serial || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!customerName.trim() || !customerPhone.trim() || !deviceModel.trim() || !problemDescription.trim()) {
      toast.error('يرجى ملء كافة البيانات الأساسية للعميل والجهاز والعطل');
      return;
    }
    if (!targetWarehouseId) {
      toast.error('يرجى اختيار مخزن الاستلام');
      return;
    }

    try {
      setIsSaving(true);
      await MaintenanceRepository.createTicket({
        orgId,
        branchId: branchId || currentUser.branch_id || '',
        warehouseId: targetWarehouseId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deviceModel: deviceModel.trim(),
        imeiOrSerial: imeiOrSerial.trim(),
        passcodeOrPattern: passcodeOrPattern.trim(),
        problemDescription: problemDescription.trim(),
        accessoriesReceived: accessoriesReceived.trim(),
        laborFee: parseFloat(laborFee) || 0,
        userId: currentUser.id,
      });

      toast.success('تم إنشاء إذن صيانة جديد بنجاح وطباعة التكيت');
      setIsNewTicketOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setDeviceModel('');
      setImeiOrSerial('');
      setPasscodeOrPattern('');
      setProblemDescription('');
      setAccessoriesReceived('');
      setLaborFee('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء حفظ إذن الصيانة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: RepairStatus) => {
    if (!currentUser) return;
    try {
      const updated = await MaintenanceRepository.updateStatus(ticketId, newStatus, currentUser.id);
      toast.success(`تم تحديث حالة تكت الصيانة إلى «${STATUS_LABELS[newStatus].label}»`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث الحالة');
    }
  };

  const handleAddSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser || !selectedPartId) return;
    const prod = products.find((p) => p.id === selectedPartId);
    if (!prod) return;

    try {
      setIsSaving(true);
      const qty = parseFloat(partQty) || 1;
      const price = parseFloat(partPrice) || prod.sale_price;

      const { item, ticket } = await MaintenanceRepository.addSparePart({
        ticketId: selectedTicket.id,
        productId: prod.id,
        productName: prod.name,
        unitId: prod.base_unit_id,
        conversionFactor: 1,
        quantity: qty,
        unitPrice: price,
        unitCost: prod.cost_price || prod.purchase_price || 0,
        userId: currentUser.id,
      });

      toast.success(`تمت إضافة قطعة الغيار «${prod.name}» وخصمها من المخزن`);
      setTicketItems((prev) => [...prev, item]);
      setSelectedTicket(ticket);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
      setIsAddPartOpen(false);
      setSelectedPartId('');
      setPartQty('1');
      setPartPrice('');
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في إضافة قطعة الغيار');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser) return;
    if (!targetTreasuryId) {
      toast.error('يرجى اختيار خزينة التحصيل');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await MaintenanceRepository.payTicket({
        ticketId: selectedTicket.id,
        amountPaid: parseFloat(payAmount) || selectedTicket.remaining_amount,
        treasuryId: targetTreasuryId,
        userId: currentUser.id,
      });

      toast.success(`تم تحصيل المبلغ وتسليم تكت الصيانة #${selectedTicket.ticket_number}`);
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsPayOpen(false);
      setPayAmount('');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل السداد');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="مركز الصيانة وتكت الإصلاح"
      subtitle="إدارة أذونات صيانة الموبايل والإلكترونيات، تتبع الحالات، قطع الغيار المستهلكة، والتسليم"
      actions={
        <Button
          onClick={() => setIsNewTicketOpen(true)}
          className="h-11 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء تكت صيانة جديد</span>
        </Button>
      }
    >
      <div className="space-y-6 text-right" dir="rtl">
        {/* Search & Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم التكت، اسم العميل، الهاتف، موديل الجهاز، أو السيريال/IMEI..."
            className="pr-10 h-11 rounded-2xl bg-surface text-xs font-semibold border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 rounded-2xl bg-surface text-xs font-bold border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="تصفية بالحالة..." />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
            <SelectItem value="all">كافة حالات الصيانة</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, st]) => (
              <SelectItem key={key} value={key}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List View */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          <span>جاري تحميل مركز أذونات الصيانة...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 bg-surface rounded-3xl border border-slate-200 dark:border-slate-800">
          لا توجد أذونات صيانة مطابقة لبيانات البحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((t) => {
            const st = STATUS_LABELS[t.status];
            return (
              <div
                key={t.id}
                onClick={() => loadTicketDetail(t)}
                className="p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-surface hover:border-amber-400 transition-all space-y-3 cursor-pointer group shadow-2xs hover:shadow-xs"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                    #{t.ticket_number}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-2xs font-bold border flex items-center gap-1 ${st.color}`}
                  >
                    {st.icon}
                    <span>{st.label}</span>
                  </span>
                </div>

                {/* Device & Client */}
                <div className="space-y-1 pt-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.device_model}</span>
                  </div>
                  <div className="text-2xs text-slate-500 font-medium flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {t.customer_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3" />
                      {t.customer_phone}
                    </span>
                  </div>
                  {t.imei_or_serial && (
                    <div className="text-3xs font-mono text-slate-400">
                      IMEI: {t.imei_or_serial}
                    </div>
                  )}
                </div>

                {/* Problem */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-2xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
                  {t.problem_description}
                </div>

                {/* Financial Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-2xs text-slate-400 block font-semibold">الإجمالي:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      {formatNumber(t.total_amount)} ج.م
                    </span>
                  </div>
                  {t.remaining_amount > 0 ? (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-2xs font-mono font-bold">
                      متبقي: {formatNumber(t.remaining_amount)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-2xs font-bold">
                      خالص السداد
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Drawer/Modal */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent
            className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
            dir="rtl"
          >
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>تفاصيل إذن صيانة</span>
                  <span className="font-mono text-amber-600">#{selectedTicket.ticket_number}</span>
                </DialogTitle>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${STATUS_LABELS[selectedTicket.status].color}`}
                >
                  {STATUS_LABELS[selectedTicket.status].icon}
                  <span>{STATUS_LABELS[selectedTicket.status].label}</span>
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Quick Status Buttons */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xs font-black text-slate-500 block">تحديث حالة الصيانة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_LABELS).map(([key, st]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={selectedTicket.status === key}
                      onClick={() => handleStatusChange(selectedTicket.id, key as RepairStatus)}
                      className={`px-3 py-1.5 rounded-xl text-2xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${st.color}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer & Device Info Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface-2 font-semibold">
                <div>
                  <span className="text-slate-400 block text-3xs">العميل:</span>
                  <span className="text-slate-900 dark:text-white text-xs font-bold">
                    {selectedTicket.customer_name} ({selectedTicket.customer_phone})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-3xs">موديل الجهاز:</span>
                  <span className="text-slate-900 dark:text-white text-xs font-bold">
                    {selectedTicket.device_model}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-3xs">IMEI / السيريال:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">
                    {selectedTicket.imei_or_serial || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-3xs">رمز القفل / الباسكود:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {selectedTicket.passcode_or_pattern || '—'}
                  </span>
                </div>
              </div>

              {/* Spare Parts List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    قطع الغيار المستهلكة ({ticketItems.length})
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddPartOpen(true)}
                    className="h-7 px-3 text-2xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    + إضافة قطعة غيار
                  </Button>
                </div>
                <table className="w-full text-right text-2xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">اسم القطعة</th>
                      <th className="py-2 px-2 text-center">الكمية</th>
                      <th className="py-2 px-3 text-center">السعر</th>
                      <th className="py-2 px-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {ticketItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          لم يتم إضافة قطع غيار لهذا الإذن بعد
                        </td>
                      </tr>
                    ) : (
                      ticketItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {item.product_name}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-center font-mono">{formatNumber(item.unit_price)}</td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-amber-600">
                            {formatNumber(item.total)} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                <div>
                  <span className="text-2xs text-amber-800 dark:text-amber-300 font-bold block">
                    المصنعية + قطع الغيار:
                  </span>
                  <span className="text-3xs text-slate-500">
                    (مصنعية: {formatNumber(selectedTicket.labor_fee)} ج.م | قطع غيار: {formatNumber(selectedTicket.actual_parts_cost)} ج.م)
                  </span>
                </div>
                <span className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">
                  {formatNumber(selectedTicket.total_amount)} ج.م
                </span>
              </div>

              {/* Actions: Pay / Deliver */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة إيصال صيانة</span>
                </Button>

                {selectedTicket.remaining_amount > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setPayAmount(String(selectedTicket.remaining_amount));
                      setIsPayOpen(true);
                    }}
                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>تحصيل النقدية وتسليم الجهاز ({formatNumber(selectedTicket.remaining_amount)} ج.م)</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: New Maintenance Ticket */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
          dir="rtl"
        >
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <span>إنشاء إذن صيانة جديد (استلام جهاز)</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">اسم العميل *</Label>
                <Input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اسم الزبون بالكامل..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">رقم الهاتف *</Label>
                <Input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxx..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">نوع وموديل الجهاز *</Label>
                <Input
                  required
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="مثال: iPhone 13 Pro Max 128GB أسود..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">IMEI / السيريال (اختياري)</Label>
                <Input
                  value={imeiOrSerial}
                  onChange={(e) => setImeiOrSerial(e.target.value)}
                  placeholder="رقم الـ IMEI للجهاز..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">رمز القفل / النمط</Label>
                <Input
                  value={passcodeOrPattern}
                  onChange={(e) => setPasscodeOrPattern(e.target.value)}
                  placeholder="مثال: 1234 أو النمط حرف Z..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-amber-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">رسوم المصنعية التقديرية (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={laborFee}
                  onChange={(e) => setLaborFee(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">وصف المشكلة والعيوب الملحوظة *</Label>
              <Input
                required
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="مثال: تغيير شاشة، لا يشحن، تهنيج عند الفتح..."
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">الملحقات المستلمة مع الجهاز</Label>
              <Input
                value={accessoriesReceived}
                onChange={(e) => setAccessoriesReceived(e.target.value)}
                placeholder="مثال: شاحن، جراب شفاف، بدون بيت الخط..."
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewTicketOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                <span>حفظ وطباعة إذن الاستلام</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Spare Part */}
      <Dialog open={isAddPartOpen} onOpenChange={setIsAddPartOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-black">إضافة قطعة غيار لتكت الصيانة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSparePart} className="space-y-3 text-xs pt-1">
            <div className="space-y-1">
              <Label>اختر قطعة الغيار من المخزن *</Label>
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <SelectValue placeholder="اختر الصنف..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — سعر البيع: {formatNumber(p.sale_price)} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>الكمية المستهلكة</Label>
                <Input
                  type="number"
                  step="any"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  className="h-10 rounded-xl font-mono text-center font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label>سعر البيع للعميل (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                  placeholder="افتراضي"
                  className="h-10 rounded-xl font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddPartOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving || !selectedPartId} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                تأكيد الإضافة والخصم
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Pay Ticket */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-black text-emerald-600">تحصيل نقدية صيانة وتسليم الجهاز</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayTicket} className="space-y-3 text-xs pt-1">
            <div className="space-y-1">
              <Label>المبلغ المحصل من العميل (ج.م) *</Label>
              <Input
                type="number"
                step="any"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 rounded-xl font-mono text-center font-black text-base text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30"
              />
            </div>

            <div className="space-y-1">
              <Label>خزينة التحصيل *</Label>
              <Select value={targetTreasuryId} onValueChange={setTargetTreasuryId}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="اختر الخزينة..." />
                </SelectTrigger>
                <SelectContent>
                  {treasuries.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({formatNumber(t.current_balance)} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                تأكيد التحصيل والتسليم
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </AppShell>
  );
}

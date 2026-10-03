'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  Truck,
  Plus,
  Search,
  Phone,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Package,
  Bike,
  Navigation,
  Send,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { DeliveryRepository } from '@/modules/contacts/delivery_repository';
import { formatNumber } from '@/lib/format';
import type { DeliveryAgent, DeliveryAgentStatus, DeliveryOrder, DeliveryOrderStatus } from '@/types';
import { toast } from 'sonner';

function DeliveryAgentsContent() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [activeTab, setActiveTab] = useState<'agents' | 'orders'>('agents');
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Agent Dialog
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [vehicleType, setVehicleType] = useState('دراجة نارية');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(5);

  // New Order Dialog
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('unassigned');
  const [deliveryFee, setDeliveryFee] = useState<number>(30);
  const [codAmount, setCodAmount] = useState<number>(0);

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [agList, ordList] = await Promise.all([
        DeliveryRepository.getDeliveryAgents(orgId),
        DeliveryRepository.getDeliveryOrders(orgId),
      ]);
      setAgents(agList);
      setOrders(ordList);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل بيانات الدليفري');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleCreateAgent = async () => {
    if (!agentName.trim() || !agentPhone.trim()) {
      toast.error('يرجى كتابة اسم المندوب ورقم هاتفه');
      return;
    }

    try {
      await DeliveryRepository.createDeliveryAgent({
        orgId,
        branchId: branchId || undefined,
        name: agentName,
        phone: agentPhone,
        nationalId: nationalId || undefined,
        vehicleType,
        vehicleNumber: vehicleNumber || undefined,
        commissionRate,
      });

      toast.success('تمت إضافة مندوب التوصيل بنجاح');
      setIsAddAgentOpen(false);
      setAgentName('');
      setAgentPhone('');
      setNationalId('');
      setVehicleNumber('');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل إضافة مندوب التوصيل');
    }
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      toast.error('يرجى ملء بيانات العميل وعنوان التوصيل');
      return;
    }

    const assignedAgent = agents.find((a) => a.id === selectedAgentId);

    try {
      await DeliveryRepository.createDeliveryOrder({
        orgId,
        branchId: branchId || 'main',
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryFee,
        codAmount,
        agentId: selectedAgentId !== 'unassigned' ? selectedAgentId : undefined,
        agentName: assignedAgent ? assignedAgent.name : undefined,
      });

      toast.success('تمت إضافة طلب الدليفري بنجاح');
      setIsAddOrderOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setCodAmount(0);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل إضافة طلب الدليفري');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: DeliveryOrderStatus) => {
    try {
      await DeliveryRepository.updateOrderStatus(orderId, status);
      toast.success('تم تحديث حالة طلب التوصيل');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث طلب التوصيل');
    }
  };

  const stats = useMemo(() => {
    const available = agents.filter((a) => a.status === 'available').length;
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending' || o.status === 'out_for_delivery'
    ).length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    return {
      totalAgents: agents.length,
      availableAgents: available,
      pendingOrders,
      deliveredOrders,
    };
  }, [agents, orders]);

  const getAgentBadge = (status: DeliveryAgentStatus) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            متاح للتوصيل
          </Badge>
        );
      case 'busy':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            في مهمة توصيل
          </Badge>
        );
      case 'off_duty':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
            غير متاح
          </Badge>
        );
    }
  };

  const getOrderBadge = (status: DeliveryOrderStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            تم التسليم
          </Badge>
        );
      case 'out_for_delivery':
        return (
          <Badge className="bg-primary/10 text-primary dark:bg-blue-950/60 dark:text-blue-400">
            جاري التوصيل
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            ملغي
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            في الانتظار
          </Badge>
        );
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {activeTab === 'agents' ? (
        <Button
          onClick={() => setIsAddAgentOpen(true)}
          className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مندوب توصيل</span>
        </Button>
      ) : (
        <Button
          onClick={() => setIsAddOrderOpen(true)}
          className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة طلب دليفري جديد</span>
        </Button>
      )}
    </div>
  );

  return (
    <AppShell
      title="مندوبي التوصيل والطلبات الدليفري"
      subtitle="إدارة أسطول التوصيل وتوزيع طلبات الدليفري وتتبع التسليم والتحصيل الفوري"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي مناديب التوصيل"
            value={stats.totalAgents}
            unit="مندوب"
            variant="blue"
            icon={<Bike className="w-5 h-5" />}
          />
          <KpiCard
            label="المناديب المتاحين للخدمة"
            value={stats.availableAgents}
            unit="مندوب"
            variant="emerald"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <KpiCard
            label="طلبات قيد التوصيل"
            value={stats.pendingOrders}
            unit="طلب"
            variant="amber"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            label="طلبات تم تسليمها"
            value={stats.deliveredOrders}
            unit="طلب"
            variant="indigo"
            icon={<Package className="w-5 h-5" />}
          />
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-surface text-primary shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>طاقم المناديب ({agents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-surface text-primary shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>طلبات الدليفري ({orders.length})</span>
          </button>
        </div>

        {/* Tab 1: Delivery Agents Grid */}
        {activeTab === 'agents' && (
          <div>
            {isLoading ? (
              <div className="py-20 text-center text-xs font-bold text-slate-400">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span>جاري تحميل بيانات المناديب...</span>
              </div>
            ) : agents.length === 0 ? (
              <EmptyState
                icon={<Bike className="w-8 h-8 text-slate-400" />}
                title="لا يوجد مندوبي توصيل مسجلين بعد"
                description="ابدأ بإضافة أول مندوب في أسطول التوصيل لإسناد طلبات الدليفري إليه."
                action={{
                  label: 'إضافة مندوب توصيل جديد',
                  onClick: () => setIsAddAgentOpen(true),
                  icon: <Plus className="w-4 h-4" />,
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {agents.map((ag) => (
                  <div
                    key={ag.id}
                    className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-primary font-black text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">
                          {ag.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-slate-500 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span dir="ltr" className="font-mono">{ag.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-2xs">نوع المركبة:</span>
                        <span className="font-bold text-foreground">
                          {ag.vehicle_type} ({ag.vehicle_number || 'بدون لوحة'})
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-2xs">نسبة عمولة التوصيل:</span>
                        <Badge variant="outline" className="font-mono font-black text-primary border-primary/20 bg-primary/5">
                          {ag.commission_rate}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      {getAgentBadge(ag.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Delivery Orders Table */}
        {activeTab === 'orders' && (
          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
                    <TableHead className="text-right font-black text-xs">اسم العميل</TableHead>
                    <TableHead className="text-right font-black text-xs">الهاتف والعنوان</TableHead>
                    <TableHead className="text-right font-black text-xs">مندوب التوصيل</TableHead>
                    <TableHead className="text-left font-black text-xs">أجرة التوصيل</TableHead>
                    <TableHead className="text-left font-black text-xs">مبلغ التحصيل (COD)</TableHead>
                    <TableHead className="text-center font-black text-xs">الحالة</TableHead>
                    <TableHead className="text-center font-black text-xs">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12">
                        <EmptyState
                          icon={<Package className="w-8 h-8 text-slate-400" />}
                          title="لا توجد طلبات توصيل مسجلة حالياً"
                          description="سجل أول طلب دليفري وحدد العنوان والمندوب لبدء التوصيل."
                          action={{
                            label: 'إضافة طلب دليفري',
                            onClick: () => setIsAddOrderOpen(true),
                            icon: <Plus className="w-4 h-4" />,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((ord) => (
                      <TableRow
                        key={ord.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60"
                      >
                        <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                          {ord.customer_name}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {ord.customer_phone}
                          </div>
                          <div className="text-slate-400 text-3xs truncate max-w-xs mt-0.5">
                            {ord.delivery_address}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {ord.agent_name || (
                            <span className="text-slate-400 text-3xs font-medium">غير معين</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-left font-mono">
                          {formatNumber(ord.delivery_fee)} <span className="text-3xs text-slate-400">ج.م</span>
                        </TableCell>
                        <TableCell className="font-black text-xs text-primary text-left font-mono">
                          {formatNumber(ord.cod_amount)} <span className="text-3xs text-slate-400">ج.م</span>
                        </TableCell>
                        <TableCell className="text-center">{getOrderBadge(ord.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {ord.status !== 'delivered' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                                className="h-7 px-2 text-3xs font-black text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                              >
                                تسليم ✓
                              </Button>
                            )}
                            {ord.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateOrderStatus(ord.id, 'out_for_delivery')}
                                className="h-7 px-2 text-3xs font-black text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                              >
                                خروج للتوصيل
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Modal: Add Delivery Agent */}
        <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground">
                إضافة مندوب توصيل جديد
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                سجل بيانات المندوب والمركبة ونسبة العمولة.
              </p>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">اسم المندوب *</label>
                <Input
                  placeholder="أدخل اسم المندوب..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">رقم الهاتف *</label>
                <Input
                  placeholder="01xxxxxxxxx"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">نوع المركبة</label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="دراجة نارية">دراجة نارية (موتوسيكل)</SelectItem>
                      <SelectItem value="سيارة">سيارة</SelectItem>
                      <SelectItem value="سكوتر">سكوتر كهربائي</SelectItem>
                      <SelectItem value="دراجة هوائية">دراجة هوائية</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">رقم اللوحة / المركبة</label>
                  <Input
                    placeholder="أ ب ج 123"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">نسبة عمولة التوصيل (%)</label>
                <Input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="h-10 text-xs font-bold rounded-xl font-mono"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreateAgent}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all"
                >
                  حفظ بيانات المندوب
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Add Delivery Order */}
        <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground">
                تسجيل طلب دليفري جديد
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                أدخل تفاصيل التوصيل وعنوان العميل والمبلغ المطلوب تحصيله.
              </p>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">اسم العميل *</label>
                <Input
                  placeholder="أدخل اسم العميل..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">رقم هاتف العميل *</label>
                <Input
                  placeholder="01xxxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">عنوان التوصيل بالتفصيل *</label>
                <Input
                  placeholder="المنطقة، الشارع، رقم العمارة، رقم الشقة..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">تعيين مندوب التوصيل</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                    <SelectValue placeholder="اختر مندوب التوصيل..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unassigned">بدون تعيين حالياً (في الانتظار)</SelectItem>
                    {agents.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id}>
                        {ag.name} ({ag.vehicle_type}) - {ag.status === 'available' ? 'متاح' : 'مشغول'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">أجرة التوصيل (ج.م)</label>
                  <Input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">مبلغ التحصيل COD (ج.م)</label>
                  <Input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreateOrder}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all"
                >
                  تأكيد وإرسال الطلب
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function DeliveryAgentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري التحميل...</div>}>
      <DeliveryAgentsContent />
    </Suspense>
  );
}
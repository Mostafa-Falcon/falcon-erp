'use client';

import React, { useEffect, useMemo, useState, Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { Card, CardContent } from'@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import {
 Truck,
 Plus,
 Search,
 Phone,
 CheckCircle2,
 Clock,
 User,
 MapPin,
 DollarSign,
 Package,
 Bike,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { DeliveryRepository } from'@/modules/contacts/delivery_repository';
import { formatNumber } from'@/lib/format';
import type { DeliveryAgent, DeliveryAgentStatus, DeliveryOrder, DeliveryOrderStatus } from'@/types';
import { toast } from'sonner';

function DeliveryAgentsContent() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [activeTab, setActiveTab] = useState<'agents'|'orders'>('agents');
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
 const [deliveryFee, setDeliveryFee] = useState<number>(3000);
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
 toast.error('يرجى كتابة اسم المندوب ورقم الهاتف');
 return;
 }

 try {
 await DeliveryRepository.createDeliveryAgent({
 orgId,
 branchId,
 name: agentName,
 phone: agentPhone,
 nationalId,
 vehicleType,
 vehicleNumber,
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
 if (!customerName.trim() || !deliveryAddress.trim()) {
 toast.error('يرجى كتابة اسم العميل وعنوان التوصيل');
 return;
 }

 try {
 const agent = agents.find((a) => a.id === selectedAgentId);

 await DeliveryRepository.createDeliveryOrder({
 orgId,
 branchId,
 customerName,
 customerPhone,
 deliveryAddress,
 agentId: selectedAgentId ==='unassigned'? undefined : selectedAgentId,
 agentName: agent?.name,
 deliveryFee,
 codAmount,
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

 const getAgentBadge = (status: DeliveryAgentStatus) => {
 switch (status) {
 case'available':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">متاح للتوصيل</Badge>;
 case'busy':
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">في مهمة توصيل</Badge>;
 case'off_duty':
 default:
 return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">غير متاح</Badge>;
 }
 };

 const getOrderBadge = (status: DeliveryOrderStatus) => {
 switch (status) {
 case'delivered':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">تم التسليم</Badge>;
 case'out_for_delivery':
 return <Badge className="bg-primary/10 text-primary dark:bg-blue-950/60 dark:text-blue-400">جاري التوصيل</Badge>;
 case'cancelled':
 return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">ملغي</Badge>;
 case'pending':
 default:
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">في الانتظار</Badge>;
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <Truck className="w-7 h-7 text-primary"/>
 مندوبي التوصيل والطلبات الدليفري
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 إدارة أسطول التوصيل وتوزيع طلبات الدليفري وتتبع التسليم
 </p>
 </div>

 <div className="flex items-center gap-2">
 {activeTab ==='agents'? (
 <Button onClick={() => setIsAddAgentOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إضافة مندوب توصيل
 </Button>
 ) : (
 <Button onClick={() => setIsAddOrderOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إضافة طلب دليفري جديد
 </Button>
 )}
 </div>
 </div>

 {/* Tabs */}
 <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-4">
 <button
 onClick={() => setActiveTab('agents')}
 className={`pb-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
 activeTab ==='agents'
 ?'border-primary text-primary'
 :'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 <Bike className="w-4 h-4"/>
 طاقم المندوبين ({agents.length})
 </button>
 <button
 onClick={() => setActiveTab('orders')}
 className={`pb-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
 activeTab ==='orders'
 ?'border-primary text-primary'
 :'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 <Package className="w-4 h-4"/>
 طلبات الدليفري ({orders.length})
 </button>
 </div>

 {activeTab ==='agents'? (
 /* Delivery Agents Grid */
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {agents.length === 0 ? (
 <div className="col-span-full text-center py-12 text-slate-500 font-bold bg-surface rounded-2xl border">
 لا يوجد مندوبي توصيل مسجلين بعد. انقر على إضاف المندوب للبدء.
 </div>
 ) : (
 agents.map((ag) => (
 <Card key={ag.id} className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Bike className="w-5 h-5"/>
 </div>
 <div>
 <h3 className="font-black text-slate-900 dark:text-white text-sm">{ag.name}</h3>
 <p className="text-2xs text-slate-500 flex items-center gap-1">
 <Phone className="w-3 h-3"/>
 {ag.phone}
 </p>
 </div>
 </div>
 </div>

 <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs space-y-1">
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>المركبة:</span>
 <span className="font-bold">{ag.vehicle_type} ({ag.vehicle_number ||'بدون لوحة'})</span>
 </div>
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>نسبة التوصيل:</span>
 <span className="font-bold text-primary">{ag.commission_rate}%</span>
 </div>
 </div>

 <div className="flex items-center justify-between pt-1">
 {getAgentBadge(ag.status)}
 </div>
 </CardContent>
 </Card>
 ))
 )}
 </div>
 ) : (
 /* Delivery Orders Table */
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">اسم العميل</TableHead>
 <TableHead className="text-right font-black">الهاتف والعنوان</TableHead>
 <TableHead className="text-right font-black">مندوب التوصيل</TableHead>
 <TableHead className="text-right font-black">أجرة التوصيل</TableHead>
 <TableHead className="text-right font-black">مبلغ التحصيل (COD)</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 <TableHead className="text-center font-black">تغيير الحالة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {orders.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-bold">
 لا توجد طلبات توصيل مسجلة
 </TableCell>
 </TableRow>
 ) : (
 orders.map((ord) => (
 <TableRow key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-bold text-slate-900 dark:text-white">
 {ord.customer_name}
 </TableCell>
 <TableCell className="text-xs">
 <div className="font-bold text-slate-700 dark:text-slate-300">{ord.customer_phone}</div>
 <div className="text-slate-400 text-3xs truncate max-w-xs">{ord.delivery_address}</div>
 </TableCell>
 <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
 {ord.agent_name ||'غير معين'}
 </TableCell>
 <TableCell className="font-bold text-xs">
 {formatNumber(ord.delivery_fee)} د.ع
 </TableCell>
 <TableCell className="font-black text-xs text-primary">
 {formatNumber(ord.cod_amount)} د.ع
 </TableCell>
 <TableCell className="text-center">
 {getOrderBadge(ord.status)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1">
 {ord.status !=='delivered'&& (
 <Button
 size="xs"
 variant="ghost"
 className="text-emerald-600 hover:text-emerald-700"
 onClick={() => handleUpdateOrderStatus(ord.id,'delivered')}
 title="تأكيد التسليم"
 >
 <CheckCircle2 className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>
 )}

 {/* Add Agent Modal */}
 <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>إضافة مندوب توصيل جديد</DialogTitle>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم المندوب *</label>
 <Input
 placeholder="أدخل اسم المندوب بالكامل..."
 value={agentName}
 onChange={(e) => setAgentName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">رقم الهاتف *</label>
 <Input
 placeholder="07xxxxxxxx"
 value={agentPhone}
 onChange={(e) => setAgentPhone(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">رقم الهوية الوطنية</label>
 <Input
 placeholder="رقم الهوية"
 value={nationalId}
 onChange={(e) => setNationalId(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">وسيلة النقل</label>
 <Select value={vehicleType} onValueChange={setVehicleType}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="الوسيلة"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="دراجة نارية">دراجة نارية</SelectItem>
 <SelectItem value="سيارة">سيارة</SelectItem>
 <SelectItem value="دراجة هوائية">دراجة هوائية</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">رقم اللوحة / المركبة</label>
 <Input
 placeholder="رقم المركبة"
 value={vehicleNumber}
 onChange={(e) => setVehicleNumber(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">نسبة التوصيل (%)</label>
 <Input
 type="number"
 value={commissionRate}
 onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <Button onClick={handleCreateAgent} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 حفظ المندوب
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* Add Order Modal */}
 <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>إضافة طلب دليفري جديد</DialogTitle>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم العميل *</label>
 <Input
 placeholder="أدخل اسم العميل..."
 value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">رقم الهاتف</label>
 <Input
 placeholder="07xxxxxxxx"
 value={customerPhone}
 onChange={(e) => setCustomerPhone(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">عنوان التوصيل بالكامل *</label>
 <Input
 placeholder="المنطقة، الشارع، البناية..."
 value={deliveryAddress}
 onChange={(e) => setDeliveryAddress(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">تعيين المندوب</label>
 <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر المندوب"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="unassigned">بدون مندوب حالياً</SelectItem>
 {agents.map((a) => (
 <SelectItem key={a.id} value={a.id}>
 {a.name} ({a.status ==='available'?'متاح':'مشغول'})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">أجرة التوصيل (د.ع)</label>
 <Input
 type="number"
 value={deliveryFee}
 onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">مبلغ التحصيل عند الاستلام</label>
 <Input
 type="number"
 value={codAmount}
 onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <Button onClick={handleCreateOrder} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 إنشاء الطلب
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function DeliveryAgentsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <DeliveryAgentsContent />
 </Suspense>
 </AppShell>
 );
}
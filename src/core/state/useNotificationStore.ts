import { create } from'zustand';

export interface AppNotification {
 id: string;
 type:'sale'|'purchase'|'stock'|'expiry'|'system';
 title: string;
 description: string;
 timestamp: string;
 timeAgo: string;
 isRead: boolean;
 link?: string;
 iconType:'truck'|'sale'|'alert'|'bell';
}

interface NotificationState {
 notifications: AppNotification[];
 unreadCount: number;
 isLoading: boolean;
 loadNotifications: (orgId?: string) => Promise<void>;
 markAsRead: (id: string) => void;
 markAllAsRead: () => void;
 deleteNotification: (id: string) => void;
 clearAll: () => void;
}

const getStorageSet = (key: string): Set<string> => {
 if (typeof window ==='undefined') return new Set();
 try {
 const raw = localStorage.getItem(key);
 return raw ? new Set(JSON.parse(raw)) : new Set();
 } catch {
 return new Set();
 }
};

const saveStorageSet = (key: string, set: Set<string>) => {
 if (typeof window ==='undefined') return;
 try {
 localStorage.setItem(key, JSON.stringify(Array.from(set)));
 } catch {
 // Ignore storage errors
 }
};

const formatTimeAgo = (isoString?: string): string => {
 if (!isoString) return'الآن';
 try {
 const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
 if (diff < 60) return'الآن';
 const minutes = Math.floor(diff / 60);
 if (minutes < 60) return`منذ ${minutes} دقيقة`;
 const hours = Math.floor(minutes / 60);
 if (hours < 24) return`منذ ${hours} ساعة`;
 const days = Math.floor(hours / 24);
 return`منذ ${days} يوم`;
 } catch {
 return'الآن';
 }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
 notifications: [],
 unreadCount: 0,
 isLoading: false,

 loadNotifications: async (orgId?: string) => {
 if (!orgId) return;
 set({ isLoading: true });

 try {
 const { db } = await import('@/core/db/app_database');
 const readIds = getStorageSet('falcon_read_notifications');
 const deletedIds = getStorageSet('falcon_deleted_notifications');

 const [sales, purchases, products, stockLevels, batches, contacts] = await Promise.all([
 db.sales_invoices.where('org_id').equals(orgId).reverse().limit(50).toArray(),
 db.purchase_invoices.where('org_id').equals(orgId).reverse().limit(30).toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 db.stock_levels.toArray(),
 db.product_batches.toArray(),
 db.contacts.where('org_id').equals(orgId).toArray(),
 ]);

 const contactMap = new Map(contacts.map((c) => [c.id, c.name]));
 const productMap = new Map(products.map((p) => [p.id, p]));
 const stockMap = new Map<string, number>();
 stockLevels.forEach((sl) => {
 stockMap.set(sl.product_id, (stockMap.get(sl.product_id) || 0) + (Number(sl.available_quantity) || 0));
 });

 const list: AppNotification[] = [];

 // 1. Sales Invoices Notifications
 sales.forEach((s) => {
 const notifId =`sale-${s.id}`;
 if (deletedIds.has(notifId)) return;
 const customerName = (s.customer_id ? contactMap.get(s.customer_id) : undefined) ||'عميل نقدي';
 list.push({
 id: notifId,
 type:'sale',
 title:`فاتورة مبيعات جديدة #${s.invoice_number}`,
 description:`تم إتمام فاتورة مبيعات بقيمة ${Number(s.total).toFixed(2)} ج.م للعميل: ${customerName}`,
 timestamp: s.invoice_date || s.created_at,
 timeAgo: formatTimeAgo(s.invoice_date || s.created_at),
 isRead: readIds.has(notifId),
 link:'/sales/invoices',
 iconType:'truck',
 });
 });

 // 2. Purchase Invoices Notifications
 purchases.forEach((p) => {
 const notifId =`purch-${p.id}`;
 if (deletedIds.has(notifId)) return;
 const supplierName = (p.supplier_id ? contactMap.get(p.supplier_id) : undefined) ||'مورد نقدي';
 list.push({
 id: notifId,
 type:'purchase',
 title:`فاتورة توريد ومشتريات #${p.invoice_number}`,
 description:`تم تسجيل فاتورة شراء بقيمة ${Number(p.total).toFixed(2)} ج.م من المورد: ${supplierName}`,
 timestamp: p.invoice_date || p.created_at,
 timeAgo: formatTimeAgo(p.invoice_date || p.created_at),
 isRead: readIds.has(notifId),
 link:'/purchases/invoices',
 iconType:'truck',
 });
 });

 // 3. Stock Shortages Notifications (Consolidated & Real)
 const lowStockProducts = products.filter((prod) => {
 const qty = stockMap.get(prod.id) ?? 0;
 const limit = Number(prod.min_stock_alert) || 5;
 return qty <= limit;
 });

 if (lowStockProducts.length > 0) {
 if (lowStockProducts.length <= 3) {
 lowStockProducts.forEach((prod) => {
 const notifId =`stock-${prod.id}`;
 if (deletedIds.has(notifId)) return;
 const qty = stockMap.get(prod.id) ?? 0;
 const limit = Number(prod.min_stock_alert) || 5;
 list.push({
 id: notifId,
 type:'stock',
 title:`تنبيه مخزون: ${prod.name}`,
 description:`الرصيد المتوفر (${qty}) وصل لحد الأمان المطلوب (${limit})`,
 timestamp: prod.updated_at || prod.created_at,
 timeAgo: formatTimeAgo(prod.updated_at || prod.created_at),
 isRead: readIds.has(notifId),
 link:'/inventory/status',
 iconType:'alert',
 });
 });
 } else {
 // Consolidated alert for multiple items
 const notifId ='stock-shortage-summary';
 if (!deletedIds.has(notifId)) {
 list.push({
 id: notifId,
 type:'stock',
 title:`تنبيه نواقص المخزون (${lowStockProducts.length} أصناف)`,
 description:`يوجد ${lowStockProducts.length} صنفاً وصلت أرصدتها للحد الأدنى للمخزون أو نفدت كميتها`,
 timestamp: new Date().toISOString(),
 timeAgo:'الآن',
 isRead: readIds.has(notifId),
 link:'/inventory/status',
 iconType:'alert',
 });
 }
 }
 }

 // 4. Batch Expiry Alerts (Only real imminent expiries within 30 days)
 const now = Date.now();
 const expiringBatches = batches.filter((b) => {
 if (!b.expiry_date) return false;
 const days = Math.ceil((new Date(b.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
 return days <= 30;
 });

 expiringBatches.slice(0, 3).forEach((batch) => {
 const notifId =`exp-${batch.id}`;
 if (deletedIds.has(notifId) || !batch.expiry_date) return;
 const days = Math.ceil((new Date(batch.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
 const prod = productMap.get(batch.product_id);
 const name = prod?.name ||'صنف غير معرف';
 list.push({
 id: notifId,
 type:'expiry',
 title: days < 0 ?`صنف منتهي الصلاحية: ${name}`:`اقتراب انتهاء صلاحية: ${name}`,
 description: days < 0
 ?`التشغيلة (${batch.batch_number}) منتهية الصلاحية منذ ${Math.abs(days)} يوم`
 :`التشغيلة (${batch.batch_number}) ستنتهي خلال ${days} يوم`,
 timestamp: batch.created_at,
 timeAgo: formatTimeAgo(batch.created_at),
 isRead: readIds.has(notifId),
 link:'/reports/expiry',
 iconType:'alert',
 });
 });

 // Sort newest first
 list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

 const unread = list.filter((n) => !n.isRead).length;
 set({
 notifications: list,
 unreadCount: unread,
 isLoading: false,
 });
 } catch (err) {
 console.warn('Notification load notice:', err);
 set({ isLoading: false });
 }
 },

 markAsRead: (id: string) => {
 const readIds = getStorageSet('falcon_read_notifications');
 readIds.add(id);
 saveStorageSet('falcon_read_notifications', readIds);

 const updated = get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
 set({
 notifications: updated,
 unreadCount: updated.filter((n) => !n.isRead).length,
 });
 },

 markAllAsRead: () => {
 const readIds = getStorageSet('falcon_read_notifications');
 get().notifications.forEach((n) => readIds.add(n.id));
 saveStorageSet('falcon_read_notifications', readIds);

 const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
 set({
 notifications: updated,
 unreadCount: 0,
 });
 },

 deleteNotification: (id: string) => {
 const deletedIds = getStorageSet('falcon_deleted_notifications');
 deletedIds.add(id);
 saveStorageSet('falcon_deleted_notifications', deletedIds);

 const updated = get().notifications.filter((n) => n.id !== id);
 set({
 notifications: updated,
 unreadCount: updated.filter((n) => !n.isRead).length,
 });
 },

 clearAll: () => {
 const deletedIds = getStorageSet('falcon_deleted_notifications');
 get().notifications.forEach((n) => deletedIds.add(n.id));
 saveStorageSet('falcon_deleted_notifications', deletedIds);

 set({
 notifications: [],
 unreadCount: 0,
 });
 },
}));
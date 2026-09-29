import { create } from'zustand';
import { networkListener } from'@/core/sync/network_listener';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { ReconciliationCoordinator } from'@/core/sync/reconciliation_coordinator';

interface SyncState {
 isOnline: boolean;
 isSyncing: boolean;
 pendingCount: number;
 lastSyncedAt: string | null;
 lastReconcile: {
 at: string | null;
 steps: string[];
 ok?: boolean;
 };
 setIsOnline: (status: boolean) => void;
 updatePendingCount: () => Promise<void>;
 triggerSync: () => Promise<void>;
 reconcileAfterReconnect: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
 isOnline: typeof window !=='undefined'? navigator.onLine : true,
 isSyncing: false,
 pendingCount: 0,
 lastSyncedAt: null,
 lastReconcile: { at: null, steps: [] },

 setIsOnline: (status: boolean) => set({ isOnline: status }),

 updatePendingCount: async () => {
 try {
 const count = await SyncQueueManager.getPendingCount();
 set({ pendingCount: count });
 } catch {
 // Ignore count fetch errors
 }
 },

 triggerSync: async () => {
 if (get().isSyncing) return;
 set({ isSyncing: true });
 try {
 const result = await syncCoordinator.triggerSync();
 if (result.success) {
 set({ lastSyncedAt: new Date().toISOString() });
 }
 await get().updatePendingCount();
 } finally {
 set({ isSyncing: false });
 }
 },

 reconcileAfterReconnect: async () => {
 if (get().isSyncing || ReconciliationCoordinator.isRunning) return;
 set({ isSyncing: true });
 try {
 const result = await ReconciliationCoordinator.reconcile();
 set({
 lastSyncedAt: result.ok ? new Date().toISOString() : get().lastSyncedAt,
 lastReconcile: { at: new Date().toISOString(), steps: result.steps, ok: result.ok },
 });
 await get().updatePendingCount();
 } finally {
 set({ isSyncing: false });
 }
 },
}));

// Initialize listeners in browser
if (typeof window !=='undefined') {
 // Track transitions: reconciliation only runs after a real offline->online hop.
 let lastStatus = useSyncStore.getState().isOnline;
 networkListener.subscribe((isOnline) => {
 const wasOffline = !lastStatus;
 lastStatus = isOnline;
 useSyncStore.getState().setIsOnline(isOnline);
 if (isOnline && wasOffline) {
 useSyncStore.getState().reconcileAfterReconnect();
 }
 });

 // Periodically refresh pending queue count
 setInterval(() => {
 useSyncStore.getState().updatePendingCount();
 }, 5000);
}
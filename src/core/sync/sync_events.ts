/**
 * 🦅 Falcon ERP - Cloud Sync Event
 * Broadcast whenever cloud data lands in local Dexie (realtime or pull reconcile),
 * so open pages can re-read their data instead of staying stale.
 */
export const CLOUD_DATA_CHANGED_EVENT ='falcon-cloud-data-changed';

export const notifyCloudDataChanged = (): void => {
 if (typeof window !=='undefined') {
 window.dispatchEvent(new Event(CLOUD_DATA_CHANGED_EVENT));
 }
};
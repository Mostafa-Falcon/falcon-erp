/**
 * Falcon ERP - Network Listener & Connectivity Monitor
 *
 * Online/offline is decided by a REAL probe against the Supabase cloud
 * endpoint - not by the browser's`navigator.onLine`alone (which only tells
 * you there is SOME link, not that the cloud is reachable).
 *
 * - browser`online`/`offline`events are used only as fast hints
 * - the periodic heartbeat issues a lightweight request to the Supabase
 * REST root; ANY HTTP response (200 / 400 / 401 / 404 ...) proves the
 * cloud path is reachable -> ONLINE
 * - only an aborted / failed transport (network error or time-out) is OFFLINE
 *
 * The returned boolean maps directly to the app's read/write mode:
 * online -> cloud-first reads (authoritative) + RPC writes
 * offline -> pure Dexie local reads + queued writes
 */

import { supabaseUrl } from'@/core/supabase/supabase_client';

type NetworkStatusCallback = (isOnline: boolean) => void;

const PROBE_INTERVAL_MS = 15_000;
const PROBE_TIMEOUT_MS = 8_000;

class NetworkListener {
 private static instance: NetworkListener;
 private isOnline: boolean = typeof window !=='undefined'? navigator.onLine : true;
 private listeners: Set<NetworkStatusCallback> = new Set();
 private pingIntervalId: ReturnType<typeof setInterval> | null = null;
 private probing = false;

 private constructor() {
 if (typeof window !=='undefined') {
 this.isOnline = navigator.onLine;
 window.addEventListener('online', () => this.probe());
 window.addEventListener('offline', () => {
 this.handleNetworkChange(false);
 });

 // Periodic heartbeat against the real cloud endpoint.
 this.pingIntervalId = setInterval(() => {
 void this.probe();
 }, PROBE_INTERVAL_MS);
 }
 }

 public static getInstance(): NetworkListener {
 if (!NetworkListener.instance) {
 NetworkListener.instance = new NetworkListener();
 }
 return NetworkListener.instance;
 }

 public getStatus(): boolean {
 return this.isOnline;
 }

 public subscribe(callback: NetworkStatusCallback): () => void {
 this.listeners.add(callback);
 callback(this.isOnline);
 return () => {
 this.listeners.delete(callback);
 };
 }

 private handleNetworkChange(status: boolean) {
 if (this.isOnline !== status) {
 this.isOnline = status;
 this.notifyListeners();
 }
 }

 /**
 * Probes connectivity to the Supabase cloud.`fetch`resolving with some
 * HTTP response (even a 4xx) means the cloud is reachable. Only transport
 * failures / time-outs mark the device offline.
 */
 public async probe(): Promise<boolean> {
 if (this.probing) return this.isOnline;
 if (typeof window ==='undefined') return true;
 if (navigator.onLine === false) {
 this.handleNetworkChange(false);
 return false;
 }

 this.probing = true;
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

 try {
 // REST root without auth: PostgREST answers 4xx - which is still a
 // successful HTTP round-trip, i.e. the network path to the cloud works.
 const response = await fetch(`${supabaseUrl}/rest/v1/`, {
 method:'GET',
 cache:'no-store',
 signal: controller.signal,
 });
 void response;
 this.handleNetworkChange(true);
 return true;
 } catch {
 this.handleNetworkChange(false);
 return false;
 } finally {
 clearTimeout(timeoutId);
 this.probing = false;
 }
 }

 /** Alias kept for compatibility with existing callers. */
 public async verifyConnectivity(): Promise<boolean> {
 return this.probe();
 }

 private notifyListeners() {
 this.listeners.forEach((callback) => callback(this.isOnline));
 }
}

export const networkListener = NetworkListener.getInstance();
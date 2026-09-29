import { createClient, type SupabaseClient } from'@supabase/supabase-js';

const DEFAULT_SUPABASE_URL ='https://swsmmnuisefafzofezus.supabase.co';
const DEFAULT_ANON_KEY ='sb_publishable_14pgd771yVdG3GSAvNd8Ag_A8HWsB41';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = (): boolean => {
 return (
 !!supabaseUrl &&
 supabaseUrl !=='https://placeholder-erp-tenant.supabase.co'&&
 !!supabaseAnonKey &&
 supabaseAnonKey !=='placeholder-anon-key'
 );
};

const ORG_TOKEN_STORAGE_KEY ='falcon_org_transport_token';
const HEADER_NAME ='x-falcon-org-token';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
 auth: {
 persistSession: true,
 autoRefreshToken: true,
 detectSessionInUrl: true,
 },
 global: {
 fetch: (url, options = {}) => {
 const token = getStoredTransportToken();
 const headers = new Headers(options?.headers);
 if (token) {
 headers.set(HEADER_NAME, token);
 }
 return fetch(url, { ...options, headers });
 },
 },
 realtime: {
 params: {
 eventsPerSecond: 10,
 },
 },
});

const getStoredTransportToken = (): string | null => {
 if (typeof window ==='undefined') return null;
 return window.localStorage.getItem(ORG_TOKEN_STORAGE_KEY);
};

export const getOrgTransportToken = (): string | null => getStoredTransportToken();

/**
 * Sets the per-organization device transport token used by RLS
 * (`current_org_id()`reads`x-falcon-org-token`on every request).
 */
export const setOrgTransportToken = (token: string | null): void => {
 if (typeof window ==='undefined') return;
 if (token) {
 window.localStorage.setItem(ORG_TOKEN_STORAGE_KEY, token);
 } else {
 window.localStorage.removeItem(ORG_TOKEN_STORAGE_KEY);
 }
 updateTransportHeader();
};

/**
 * Generates a short, URL-safe per-org device token for offline-first devices.
 */
export const generateOrgTransportToken = (): string => {
 if (typeof crypto !=='undefined'&&'randomUUID'in crypto) {
 return crypto.randomUUID().replace(/-/g,'').slice(0, 24);
 }
 return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`.slice(0, 24);
};

const updateTransportHeader = (): void => {
 const token = getStoredTransportToken();
 try {
 const sb = supabase as unknown as { headers?: Record<string, string>; rest?: { headers?: Record<string, string> } };
 if (sb.headers) {
 if (token) sb.headers[HEADER_NAME] = token;
 else delete sb.headers[HEADER_NAME];
 }
 if (sb.rest?.headers) {
 if (token) sb.rest.headers[HEADER_NAME] = token;
 else delete sb.rest.headers[HEADER_NAME];
 }
 } catch (err) {
 console.warn('updateTransportHeader notice:', err);
 }
};

// Initialize the transport header on first load (covers page refreshes).
if (typeof window !=='undefined') {
 updateTransportHeader();
}

/**
 * Restores the per-org transport token from localStorage, falling back to
 * the durable copy in Dexie (`app_settings`key`org_transport_token`).
 * Safe to call on every app start; the header is only set when the token exists.
 */
export const restoreOrgTransportToken = async (): Promise<void> => {
 if (typeof window ==='undefined') return;
 if (getStoredTransportToken()) {
 updateTransportHeader();
 return;
 }
 try {
 const { db } = await import('@/core/db/app_database');
 const setting = await db.app_settings.get('org_transport_token');
 if (setting?.value) {
 setOrgTransportToken(setting.value);
 }
 } catch {
 updateTransportHeader();
 }
};

export { HEADER_NAME as FALCON_ORG_TOKEN_HEADER };
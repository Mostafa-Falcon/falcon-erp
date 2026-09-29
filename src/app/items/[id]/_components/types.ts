import type { Product } from'@/types';

export type TabKey ='movements'|'batches'|'substitutes'|'stocktake';
export type TableDensity ='compact'|'medium'|'relaxed';

export interface MovementColumnsState {
 type: boolean;
 datetime: boolean;
 quantity: boolean;
 prices: boolean;
 reference: boolean;
 creator: boolean;
}

export interface BatchColumnsState {
 number: boolean;
 expiry: boolean;
 quantity: boolean;
 status: boolean;
}

export interface SubstituteColumnsState {
 name: boolean;
 price: boolean;
 stock: boolean;
}

export interface StocktakeColumnsState {
 reference: boolean;
 datetime: boolean;
 previous_quantity: boolean;
 adjusted_quantity: boolean;
 creator: boolean;
}

export interface StocktakeRecord {
 id: string;
 session_id: string;
 session_number: string;
 created_at: string;
 system_quantity: number;
 actual_quantity: number;
 difference: number;
 created_by: string;
}

export interface SubstituteProductWithStock extends Product {
 available_stock: number;
}

export const TRANSACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
 opening_balance: { label:'رصيد أول المدة', color:'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'},
 sale: { label:'فاتورة مبيعات', color:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'},
 purchase: { label:'فاتورة مشتريات', color:'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'},
 adjustment: { label:'تسوية مخزنية', color:'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'},
 transfer_in: { label:'تحويل وارد', color:'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300'},
 transfer_out: { label:'تحويل صادر', color:'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'},
 damaged: { label:'تسجيل تالف / هالك', color:'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'},
};
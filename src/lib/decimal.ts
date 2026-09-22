/**
 * 🦅 Falcon ERP - Fixed-Decimal Arithmetic Utilities
 *
 * Guarantees 100% calculation accuracy for stock quantities and money.
 * Floating-point arithmetic (e.g. 0.1 + 0.2) produces artifacts; every
 * monetary amount must be rounded to MONEY_DECIMALS and every stock
 * quantity to QTY_DECIMALS before persisting.
 */

/** Money precision: 2 decimals (ج.م). */
export const MONEY_DECIMALS = 2;

/** Quantity precision: 3 decimals (supports weighed kg items). */
export const QTY_DECIMALS = 3;

/** Rounds to an exact number of decimals, safe against float artifacts. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const p = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * p) / p;
}

/** Rounds a monetary amount to MONEY_DECIMALS. */
export function roundMoney(value: number): number {
  return roundTo(value, MONEY_DECIMALS);
}

/** Rounds a stock quantity to QTY_DECIMALS. */
export function roundQty(value: number): number {
  return roundTo(value, QTY_DECIMALS);
}

/** Parses a raw input (string | number) into a finite number; '' / NaN => 0. */
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/** Sums raw numbers then rounds once, avoiding artifact accumulation. */
export function roundedSum(values: readonly number[], decimals: number): number {
  let sum = 0;
  for (const v of values) sum += v;
  return roundTo(sum, decimals);
}

/** Accurate sum of monetary amounts. */
export function moneySum(values: readonly number[]): number {
  return roundedSum(values, MONEY_DECIMALS);
}

/** Accurate sum of stock quantities. */
export function qtySum(values: readonly number[]): number {
  return roundedSum(values, QTY_DECIMALS);
}

/** Accurate product (qty x unit price) rounded to money precision. */
export function moneyProduct(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/** Formats a monetary amount with exactly MONEY_DECIMALS decimals. */
export function formatMoney(value: number | null | undefined): string {
  const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return roundMoney(v).toFixed(MONEY_DECIMALS);
}
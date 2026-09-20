export function generateSku(name: string): string {
  const prefix =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.slice(0, 1))
      .join('')
      .toUpperCase() || 'ITM';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

/**
 * توليد رقم تشغيلة (Batch / Lot No.) تلقائي مميز للدفعة أو الدواء
 */
export function generateAutoBatchNumber(year?: string, month?: string): string {
  const y = (year && year.trim()) || String(new Date().getFullYear() + 1);
  const m = (month && month.trim()) || String(new Date().getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LOT-${y}${m}-${rand}`;
}

export interface PriceCalculationResult {
  grossCost: number;
  discountAmount: number;
  netCost: number;
  salePrice: number;
  profit: number;
  marginPercent: number;
  marginText: string;
  profitText: string;
}

/**
 * حساب تفاصيل التسعير والخصم وهامش الربح:
 * 1. نسبة أو قيمة الخصم تُطبق على سعر الشراء لحساب صافي سعر الشراء (Net Cost).
 * 2. هامش الربح يُحسب من سعر البيع: ((سعر البيع - صافي سعر الشراء) / سعر البيع) * 100
 */
export function calculatePriceDetails(
  costStr: string,
  saleStr: string,
  discountValStr?: string,
  discountType: 'percent' | 'amount' = 'percent'
): PriceCalculationResult {
  const grossCost = parseFloat(costStr) || 0;
  const salePrice = parseFloat(saleStr) || 0;
  const disc = parseFloat(discountValStr || '0') || 0;

  let discountAmount = 0;
  if (grossCost > 0 && disc > 0) {
    if (discountType === 'amount') {
      discountAmount = Math.min(grossCost, disc);
    } else {
      discountAmount = (grossCost * disc) / 100;
    }
  }

  const netCost = Math.max(0, grossCost - discountAmount);
  const profit = salePrice > 0 ? salePrice - netCost : 0;

  let marginPercent = 0;
  if (salePrice > 0) {
    marginPercent = (profit / salePrice) * 100;
  } else if (grossCost > 0) {
    marginPercent = 0;
  }

  return {
    grossCost,
    discountAmount,
    netCost,
    salePrice,
    profit,
    marginPercent,
    marginText: `${marginPercent.toFixed(1)}%`,
    profitText: `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} ج.م`,
  };
}

export function calculateMargin(
  costStr: string,
  saleStr: string,
  discountValStr?: string,
  discountType: 'percent' | 'amount' = 'percent'
): string {
  return calculatePriceDetails(costStr, saleStr, discountValStr, discountType).marginText;
}

import type {
  Product,
  ProductCategory,
  ProductBrand,
  ProductTypeItem,
  ProductUnit,
  Unit,
  Warehouse,
} from '@/types';

export interface ProductFormProps {
  orgId: string;
  categories: ProductCategory[];
  brands: ProductBrand[];
  productTypes?: ProductTypeItem[];
  units: Unit[];
  warehouses?: Warehouse[];
  initial?: Product;
  initialUnits?: ProductUnit[];
  isPharmacy?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export interface UnitLevelItem {
  id: string;
  unitName: string;
  conversionFactor: string;
  openingStock: string;
  allowSale: boolean;
  purchasePrice: string;
  discountValue: string;
  discountType: 'percent' | 'amount';
  dualPricing: boolean;
  salePrice: string;
  oldSalePrice: string;
  newSalePrice: string;
}

export interface FormBatchEntry {
  id: string;
  quantity: string;
  unitLevelId: string; // 'level-1' | 'level-2' | 'level-3' | 'weight'
  day: string;
  month: string;
  year: string;
  batchNumber: string;
}

export type ModalType = 'brand' | 'category' | 'product_type' | null;

export type ItemTypeMode = 'unit' | 'weight';

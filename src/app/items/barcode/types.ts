import type { Product } from'@/types';

export interface PrintItem {
 product: Product;
 copies: number;
 barcode: string;
 price: number;
 unitName?: string;
}

export interface BarcodeSettings {
 labelSize:'38x25'|'50x25'|'a4_3x10';
 showOrgName: boolean;
 showPrice: boolean;
 showSkuText: boolean;
 fontSize:'small'|'medium'|'large';
}

export const DEFAULT_BARCODE_SETTINGS: BarcodeSettings = {
 labelSize:'38x25',
 showOrgName: true,
 showPrice: true,
 showSkuText: true,
 fontSize:'medium',
};
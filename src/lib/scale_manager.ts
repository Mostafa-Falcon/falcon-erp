import { SettingsRepository } from'@/modules/settings/settings_repository';
import type { Product } from'@/types';

export interface ScaleConfig {
 enabled: boolean;
 mode:'barcode'|'serial'|'both';
 barcodePrefix: string;
 barcodeType:'weight'|'price';
 pluLength: number;
 weightDecimals: number;
 scaleIp: string;
 scalePort: string;
 baudRate: number;
}

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
 enabled: true,
 mode:'both',
 barcodePrefix:'99',
 barcodeType:'weight',
 pluLength: 5,
 weightDecimals: 3,
 scaleIp:'192.168.1.150',
 scalePort:'4001',
 baudRate: 9600,
};

export class ScaleManager {
 /**
 * Load scale configuration for an organization from app_settings
 */
 public static async getConfig(orgId: string): Promise<ScaleConfig> {
 if (!orgId) return DEFAULT_SCALE_CONFIG;
 try {
 const settings = await SettingsRepository.getAppSettings(orgId);
 const getVal = (key: string, fallback: string) =>
 settings.find((s) => s.id === key)?.value ?? fallback;

 return {
 enabled: getVal('scale_enabled','true') ==='true',
 mode: (getVal('scale_mode','both') as ScaleConfig['mode']) ||'both',
 barcodePrefix: getVal('scale_prefix','99'),
 barcodeType: (getVal('scale_type','weight') as'weight'|'price') ||'weight',
 pluLength: Math.max(2, Math.min(6, parseInt(getVal('scale_plu_length','5'), 10) || 5)),
 weightDecimals: Math.max(1, Math.min(4, parseInt(getVal('scale_weight_decimals','3'), 10) || 3)),
 scaleIp: getVal('scale_ip','192.168.1.150'),
 scalePort: getVal('scale_port','4001'),
 baudRate: parseInt(getVal('scale_baud_rate','9600'), 10) || 9600,
 };
 } catch {
 return DEFAULT_SCALE_CONFIG;
 }
 }

 /**
 * Save scale configuration to app_settings (supports partial updates)
 */
 public static async saveConfig(orgId: string, cfg: Partial<ScaleConfig>): Promise<void> {
 const current = await this.getConfig(orgId);
 const merged: ScaleConfig = { ...current, ...cfg };

 await Promise.all([
 SettingsRepository.setSetting(orgId,'scale_enabled', String(merged.enabled),'تفعيل الربط مع الموازين الإلكترونية'),
 SettingsRepository.setSetting(orgId,'scale_mode', merged.mode,'نمط تشغيل الميزان (باركود / مباشر / كلاهما)'),
 SettingsRepository.setSetting(orgId,'scale_prefix', merged.barcodePrefix.trim(),'بادئة باركود الميزان (EAN-13 Prefix)'),
 SettingsRepository.setSetting(orgId,'scale_type', merged.barcodeType,'نوع تشفير باركود الميزان (بالوزن أو بالسعر)'),
 SettingsRepository.setSetting(orgId,'scale_plu_length', String(merged.pluLength),'عدد خانات كود الصنف بالميزان (PLU)'),
 SettingsRepository.setSetting(orgId,'scale_weight_decimals', String(merged.weightDecimals),'عدد الخانات العشرية للوزن'),
 SettingsRepository.setSetting(orgId,'scale_ip', merged.scaleIp.trim(),'عنوان IP الميزان بالشبكة'),
 SettingsRepository.setSetting(orgId,'scale_port', merged.scalePort.trim(),'منفذ الميزان بالشبكة'),
 SettingsRepository.setSetting(orgId,'scale_baud_rate', String(merged.baudRate),'سرعة منفذ السيريال للميزان المباشر (Baud Rate)'),
 ]);
 }

 /**
 * Parse a barcode to check if it's an EAN-13 Scale Barcode
 */
 public static parseBarcode(
 rawBarcode: string,
 cfg: ScaleConfig
 ): {
 isScale: boolean;
 plu?: string;
 rawPlu?: string;
 weight?: number;
 price?: number;
 } {
 if (!cfg.enabled || !rawBarcode) {
 return { isScale: false };
 }

 const clean = rawBarcode.trim();
 const prefix = cfg.barcodePrefix.trim();

 // Barcode scale labels are typically 12 or 13 digits (EAN-13 format)
 if (clean.length !== 12 && clean.length !== 13) {
 return { isScale: false };
 }

 if (!clean.startsWith(prefix)) {
 return { isScale: false };
 }

 // Prefix offset
 const prefixLen = prefix.length;
 const pluLen = cfg.pluLength;

 if (clean.length < prefixLen + pluLen + 4) {
 return { isScale: false };
 }

 const rawPlu = clean.slice(prefixLen, prefixLen + pluLen);
 const numericPlu = String(parseInt(rawPlu, 10)); // e.g."00012"->"12"

 // Extract value (5 digits before check digit)
 const valSlice = clean.slice(prefixLen + pluLen, prefixLen + pluLen + 5);
 const rawVal = parseInt(valSlice, 10);

 if (isNaN(rawVal)) {
 return { isScale: false };
 }

 const calculatedVal = rawVal / Math.pow(10, cfg.weightDecimals);

 if (cfg.barcodeType ==='weight') {
 return {
 isScale: true,
 plu: numericPlu,
 rawPlu,
 weight: calculatedVal,
 };
 } else {
 return {
 isScale: true,
 plu: numericPlu,
 rawPlu,
 price: calculatedVal,
 };
 }
 }

 /**
 * Generate CSV format of scale products for importing directly into scale software
 * (CAS, Rongta, Dibal, Digi, Toledo)
 */
 public static exportPluFile(products: Product[]): string {
 const header ='PLU_CODE,ITEM_NAME,PRICE_PER_KG,BARCODE,UNIT';
 const weighed = products.filter(
 (p) => p.measurement_type ==='weight'|| (p.scale_code && p.scale_code.trim())
 );

 const rows = weighed.map((p, idx) => {
 const plu = p.scale_code?.trim() || String(idx + 1);
 const name = p.name.replace(/,/g,'');
 const price = (p.sale_price || 0).toFixed(2);
 const barcode = p.sku || plu;
 return`${plu},${name},${price},${barcode},KG`;
 });

 return [header, ...rows].join('\r\n');
 }

 /**
 * Trigger download of the scale PLU file in the browser
 */
 public static downloadPluFile(products: Product[]): void {
 const content = this.exportPluFile(products);
 const blob = new Blob(['\uFEFF'+ content], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download',`scale_plu_products_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 }

 /**
 * Read weight directly from USB/Serial checkout scale via Web Serial API
 */
 public static async readLiveWeightFromSerial(baudRate = 9600): Promise<{
 success: boolean;
 weight?: number;
 error?: string;
 }> {
 if (typeof window ==='undefined'|| !('serial'in navigator)) {
 return {
 success: false,
 error:'المتصفح لا يدعم Web Serial API. يرجى استخدام متصفح حديث مثل Google Chrome أو Microsoft Edge.',
 };
 }

 try {
 // Prompt user to select scale COM/USB port
 const nav = navigator as unknown as {
 serial: {
 requestPort: () => Promise<{
 open: (opt: { baudRate: number }) => Promise<void>;
 readable: {
 getReader: () => {
 read: () => Promise<{ value?: Uint8Array; done: boolean }>;
 releaseLock: () => void;
 };
 };
 close: () => Promise<void>;
 }>;
 };
 };
 const port = await nav.serial.requestPort();
 await port.open({ baudRate });

 const reader = port.readable.getReader();
 let accumulated ='';
 const startTime = Date.now();

 // Read for up to 2.5 seconds to catch weight frame
 while (Date.now() - startTime < 2500) {
 const { value, done } = await reader.read();
 if (done) break;
 if (value) {
 const text = new TextDecoder().decode(value);
 accumulated += text;

 // Typical scale format:"ST,GS,+ 1.520kg\r\n"or"WN01.500kg"or digits with dot
 const match = accumulated.match(/([+\-\s]?\d+\.\d+)/);
 if (match) {
 const parsed = parseFloat(match[1].trim());
 reader.releaseLock();
 await port.close();
 return { success: true, weight: parsed };
 }
 }
 }

 reader.releaseLock();
 await port.close();

 return {
 success: false,
 error:'لم يتم استقبال قراءة وزن صحيحة من الميزان خلال المهلة الزمنية.',
 };
 } catch (err: unknown) {
 return {
 success: false,
 error: err instanceof Error ? err.message :'تم إلغاء الاتصال أو فشل فتح المنفذ.',
 };
 }
 }
}
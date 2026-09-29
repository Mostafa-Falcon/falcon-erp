import { db } from'./app_database';

/**
 * ضمان بداية نظيفة وخالية من أي بيانات افتراضية إذا لم تكن هناك أصناف مسجلة
 */
export async function ensureCleanLookupState(): Promise<void> {
 try {
 if (typeof window !=='undefined'&& !localStorage.getItem('falcon_catalog_clean_v1')) {
 const prodCount = await db.products.count();
 if (prodCount === 0) {
 await db.product_categories.clear();
 await db.product_types.clear();
 await db.product_brands.clear();
 }
 localStorage.setItem('falcon_catalog_clean_v1','true');
 }
 } catch (err) {
 console.warn('ensureCleanLookupState notice:', err);
 }
}
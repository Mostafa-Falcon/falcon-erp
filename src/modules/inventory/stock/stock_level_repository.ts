import { db } from'@/core/db/app_database';
import type { StockLevel, Warehouse, Product } from'@/types';

export class StockLevelRepository {
 /**
 * Get stock level for a product in a warehouse
 */
 public static async getStockLevel(
 warehouseId: string,
 productId: string
 ): Promise<StockLevel | undefined> {
 const stockId =`${warehouseId}_${productId}`;
 return await db.stock_levels.get(stockId);
 }

 /**
 * Get all active warehouses for an organization
 */
 public static async getWarehouses(orgId: string): Promise<Warehouse[]> {
 return await db.warehouses
 .where('org_id')
 .equals(orgId)
 .and((w) => w.is_active)
 .toArray();
 }

 /**
 * Get low stock products that breached the min alert limit
 */
 public static async getLowStockProducts(
 orgId: string
 ): Promise<{ product: Product; stock: number; minAlert: number }[]> {
 const products = await db.products
 .where('org_id')
 .equals(orgId)
 .and((p) => p.is_active && p.item_type ==='storable')
 .toArray();

 const alerts: { product: Product; stock: number; minAlert: number }[] = [];

 for (const prod of products) {
 const stockLevels = await db.stock_levels
 .where('product_id')
 .equals(prod.id)
 .toArray();

 const totalStock = stockLevels.reduce((acc, s) => acc + s.quantity, 0);
 if (totalStock <= prod.min_stock_alert) {
 alerts.push({
 product: prod,
 stock: totalStock,
 minAlert: prod.min_stock_alert,
 });
 }
 }

 return alerts;
 }
}
export interface TransferItemInput {
 productId: string;
 batchId?: string | null;
 unitId: string;
 conversionFactor: number;
 quantity: number; // in selected unit
 unitCost: number;
}
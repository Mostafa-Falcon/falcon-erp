import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '@/types';
import type { FormBatchEntry, ItemTypeMode } from '../types';
import { generateAutoBatchNumber } from '../utils';

interface UseProductBatchesProps {
  initial?: Product;
  itemTypeMode: ItemTypeMode;
}

export function useProductBatches({
  initial,
  itemTypeMode,
}: UseProductBatchesProps) {
  const [enableExpiryTracking, setEnableExpiryTracking] = useState(
    initial?.tracks_expiry ?? false
  );
  const [batchEntries, setBatchEntries] = useState<FormBatchEntry[]>([]);

  // إضافة صف تاريخ صلاحية جديد ورقم تشغيلة تلقائي
  const handleAddBatch = () => {
    const today = new Date();
    const nextYear = today.getFullYear() + 1;
    const yStr = String(nextYear);
    const mStr = String(today.getMonth() + 1).padStart(2, '0');
    const dStr = String(today.getDate()).padStart(2, '0');
    const autoBatchNum = generateAutoBatchNumber(yStr, mStr);

    const newBatch: FormBatchEntry = {
      id: uuidv4(),
      quantity: '1',
      unitLevelId: itemTypeMode === 'unit' ? 'level-1' : 'weight',
      day: dStr,
      month: mStr,
      year: yStr,
      batchNumber: autoBatchNum,
    };
    setBatchEntries((prev) => [...prev, newBatch]);
  };

  const handleUpdateBatch = (idx: number, patch: Partial<FormBatchEntry>) => {
    setBatchEntries((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleRemoveBatch = (idx: number) => {
    setBatchEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    enableExpiryTracking,
    setEnableExpiryTracking,
    batchEntries,
    setBatchEntries,
    handleAddBatch,
    handleUpdateBatch,
    handleRemoveBatch,
  };
}

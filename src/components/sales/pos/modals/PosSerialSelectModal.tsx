'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Smartphone, Loader2 } from 'lucide-react';
import { ProductSerialRepository } from '@/modules/mobile/product_serial_repository';
import type { ProductSerial, Product } from '@/types';

interface PosSerialSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  orgId: string;
  warehouseId?: string;
  onSelectSerial: (serial: ProductSerial) => void;
}

export function PosSerialSelectModal({
  isOpen,
  onClose,
  product,
  orgId,
  warehouseId,
  onSelectSerial,
}: PosSerialSelectModalProps) {
  const [serials, setSerials] = useState<ProductSerial[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product || !orgId) {
      setSerials([]);
      return;
    }

    let isMounted = true;
    const loadSerials = async () => {
      setIsLoading(true);
      try {
        const list = await ProductSerialRepository.getAvailableSerials(orgId, product.id, warehouseId);
        if (isMounted) setSerials(list);
      } catch (err) {
        console.error('Error loading available serials:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSerials();
    return () => {
      isMounted = false;
    };
  }, [isOpen, product, orgId, warehouseId]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-sm font-black flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-500" />
            <span>اختر رقم الـ IMEI / السيريال للجهاز</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{product.name}</span>
          </div>

          {isLoading ? (
            <div className="py-10 text-center font-bold text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              <span>جاري تحميل الأرقام المتوفرة...</span>
            </div>
          ) : serials.length === 0 ? (
            <div className="py-10 text-center font-bold text-rose-500">
              لا توجد أرقام IMEI متوفرة في المخزن لهذا الجهاز!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-2xs font-bold text-slate-400 block">الأجهزة المتوفرة بالمخزن:</span>
              {serials.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSerial(s);
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-sky-950/30 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-sky-600 block">
                      {s.serial_number}
                    </span>
                    {s.imei2 && <span className="text-3xs font-mono text-slate-400 block">IMEI 2: {s.imei2}</span>}
                  </div>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {s.condition === 'new' ? 'جديد' : 'مستعمل'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

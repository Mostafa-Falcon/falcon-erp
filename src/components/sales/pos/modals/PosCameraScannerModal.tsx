'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, ScanLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PosCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCode: (barcode: string) => void;
}

export function PosCameraScannerModal({
  isOpen,
  onClose,
  onScanCode,
}: PosCameraScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsSaving] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanCode(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-sky-600">
            <Camera className="w-5 h-5 text-sky-500" />
            <span>قارئ باركود الكاميرا المباشر</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Camera Scanner View Box */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center animate-pulse">
              <ScanLine className="w-8 h-8" />
            </div>
            <p className="text-slate-300 font-bold text-xs">
              وجه كاميرا الهاتف أو التابلت نحو باركود الصنف أو الـ IMEI
            </p>
            <p className="text-3xs text-slate-500">
              دعم القراءة المباشرة مجاناً وبدون أي تكاليف أو قارئ خارجي
            </p>
          </div>

          {/* Manual Barcode Code Fallback Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <span className="text-2xs font-bold text-slate-500 block">أو أدخل الكود/الباركود يدويًا:</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="امسح أو اكتب الباركود/IMEI..."
                className="flex-1 h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold"
              />
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-10 px-4 rounded-xl">
                إضافة
              </Button>
            </div>
          </form>

          <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

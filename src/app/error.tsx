'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Falcon ERP App Route Error:', error);
  }, [error]);

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-900 text-white p-4 text-center dir-rtl">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">
            تنبيـه أثناء التحميل
          </h2>
          <p className="text-xs text-slate-400">
            يمكنك إعادة المحاولة لمتابعة العمل أوفلاين أو العودة للرئيسية.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 py-2.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-700 font-bold text-xs gap-2 py-2.5 rounded-xl cursor-pointer"
          >
            <Home className="w-4 h-4" />
            الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}

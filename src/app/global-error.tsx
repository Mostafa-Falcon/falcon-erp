'use client';

import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 text-white p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">
              تنبيه في المنظومة
            </h2>
            <p className="text-xs text-slate-400">
              حدث خطأ غير متوقع. يرجى الضغط على زر إعادة المحاولة لاستكمال العمل.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}

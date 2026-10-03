'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  HardDrive,
  Copy,
  Check,
  Clock,
  ExternalLink,
  MessageCircle,
  Building2
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.58 1.942.875 2.796.875 3.183 0 5.768-2.586 5.769-5.766.001-3.181-2.585-5.762-5.769-5.762zm3.39 8.163c-.144.405-.837.774-1.17.822-.312.043-.65.064-1.95-.445-1.528-.597-2.56-2.148-2.639-2.25-.078-.102-.628-.836-.628-1.593 0-.756.398-1.127.539-1.281.14-.153.307-.192.41-.192.102 0 .205.002.295.006.096.004.225-.036.352.269.13.313.442 1.077.481 1.154.038.077.064.167.013.269-.052.102-.078.167-.154.256-.077.09-.161.2-.23.269-.078.078-.159.162-.068.318.09.155.402.664.862 1.074.593.528 1.093.691 1.248.768.154.077.244.064.334-.039.09-.102.385-.448.487-.602.103-.154.205-.128.346-.077.141.051.897.423 1.051.5.154.077.256.115.295.179.038.064.038.372-.106.777z" />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.178L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.684 0-3.263-.483-4.606-1.317l-.33-.205-3.052.801.815-2.977-.225-.357A8.136 8.136 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.504-3.664 8.167-8.167 8.167z" />
    </svg>
  );
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { currentUser } = useSessionStore();

  const SUPPORT_PHONE = '01116603371';
  const SUPPORT_PHONE_FORMATTED = '0111 660 3371';
  const userName = currentUser?.full_name || currentUser?.username || '';

  const defaultMessage = encodeURIComponent(
    `السلام عليكم، أحتاج مساعدة في نظام Falcon ERP.${userName ? `\nالمستخدم: ${userName}` : ''}`
  );
  const whatsappUrl = `https://wa.me/201116603371?text=${defaultMessage}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPPORT_PHONE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in-50 duration-150">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-[440px] bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col transition-all duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">
                مركز الدعم الفني المباشر
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                شركة لوجيكسا لتكنولوجيا النظم الرقمية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Main WhatsApp Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-3xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                متاح الآن عبر واتساب
              </span>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-2xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-background/80"
                title="نسخ رقم الواتساب"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرقم</span>
                  </>
                )}
              </button>
            </div>

            {/* Display Phone Number */}
            <div className="mb-4 text-center">
              <span
                className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-wider block"
                dir="ltr"
              >
                {SUPPORT_PHONE_FORMATTED}
              </span>
              <span className="text-3xs text-muted-foreground mt-1 block">
                مخصص للمحادثات الفورية عبر واتساب حصراً
              </span>
            </div>

            {/* Big WhatsApp CTA Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
              <span>بدء محادثة واتساب الآن</span>
              <ExternalLink className="w-4 h-4 opacity-80 shrink-0" />
            </a>
          </div>

          {/* System & Support Details */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-2xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>أوقات المتابعة:</span>
              </span>
              <span className="font-bold text-foreground">24/7 لخدمة ومساندة العملاء</span>
            </div>

            {userName && (
              <div className="flex items-center justify-between text-2xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>المستخدم الحالي:</span>
                </span>
                <span className="font-bold text-foreground truncate max-w-[200px]">
                  {userName}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-2xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>حالة النظام:</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Falcon Enterprise جاهز
              </span>
            </div>
          </div>

          {/* Local DB status footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-3xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span>قاعدة البيانات: IndexedDB نشطة محلياً</span>
            </span>
            <span className="font-mono font-medium">Logixa Falcon</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
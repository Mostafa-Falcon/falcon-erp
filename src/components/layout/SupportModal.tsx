'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Headphones,
    X,
    Phone,
    MessageSquare,
    ShieldCheck,
    HardDrive,
    Copy,
    Check,
    Clock,
} from 'lucide-react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SupportContact {
    id: string;
    phone: string;
    formatted: string;
    type: 'phone_and_whatsapp' | 'whatsapp_only';
    label: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const contacts: SupportContact[] = [
        {
            id: 'support-1',
            phone: '01116603371',
            formatted: '0111 660 3371',
            type: 'phone_and_whatsapp',
            label: 'متاح اتصال هاتفي وواتساب',
        },
        {
            id: 'support-2',
            phone: '01116603376',
            formatted: '0111 660 3376',
            type: 'phone_and_whatsapp',
            label: 'متاح اتصال هاتفي وواتساب',
        },
        {
            id: 'support-3',
            phone: '01116603372',
            formatted: '0111 660 3372',
            type: 'whatsapp_only',
            label: 'مخصص للمحادثات عبر واتساب فقط',
        },
    ];

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => {
            setCopiedId(null);
        }, 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none animate-in fade-in-50 duration-150">
            {/* Click outside backdrop */}
            <div className="fixed inset-0" onClick={onClose} />

            <div
                className="relative z-10 w-full max-w-[460px] bg-surface rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col"
                dir="rtl"
            >
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs border border-blue-100 dark:border-blue-900">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                                مركز الدعم الفني والمساعدة
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                شركة لوجيسكا لتكنولوجيا النظم الرقمية
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Falcon System Status Banner */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/80 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-blue-950 dark:text-blue-200">
                                    Falcon ERP Enterprise
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 text-3xs font-extrabold">
                                    دعم فوري ومستمر
                                </span>
                            </div>
                            <span className="text-2xs text-blue-800/80 dark:text-blue-300/80 mt-1 font-medium leading-relaxed">
                                فريق الدعم الفني جاهز لمساعدتك في أي استفسار تقني أو عمليات المزامنة والنسخ الاحتياطي.
                            </span>
                        </div>
                    </div>

                    {/* Contact Numbers List */}
                    <div className="space-y-3">
                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/60 bg-surface/40 transition-all shadow-xs"
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-3xs font-black px-2 py-0.5 rounded-full ${contact.type === 'whatsapp_only'
                                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                }`}
                                        >
                                            {contact.type === 'whatsapp_only' ? 'واتس اب فقط' : 'فون أو واتس اب'}
                                        </span>
                                    </div>

                                    {/* Copy Button */}
                                    <button
                                        onClick={() => handleCopy(contact.id, contact.phone)}
                                        title="نسخ الرقم"
                                        className="flex items-center gap-1 text-2xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        {copiedId === contact.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>نسخ الرقم</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-slate-900 dark:text-white font-mono tracking-wider" dir="ltr">
                                            {contact.formatted}
                                        </span>
                                        <span className="text-2xs text-slate-400 font-semibold mt-0.5">
                                            {contact.label}
                                        </span>
                                    </div>

                                    {/* Quick Action Buttons */}
                                    <div className="flex items-center gap-1.5">
                                        {/* Phone Call (if supported) */}
                                        {contact.type === 'phone_and_whatsapp' && (
                                            <a
                                                href={`tel:${contact.phone}`}
                                                title="اتصال هاتفي مباشر"
                                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>اتصال</span>
                                            </a>
                                        )}

                                        {/* WhatsApp Action */}
                                        <a
                                            href={`https://wa.me/20${contact.phone.substring(1)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="فتح محادثة واتساب"
                                            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>واتساب</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Availability note */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>فريق الدعم الفني متاح للمساعدة السريعة ومتابعة المنظومة 24/7</span>
                    </div>

                    {/* Local DB status footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                            <span>قاعدة البيانات المحلية: نشطة (IndexedDB)</span>
                        </span>
                        <span className="font-mono text-3xs text-slate-400">Logixa Falcon</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
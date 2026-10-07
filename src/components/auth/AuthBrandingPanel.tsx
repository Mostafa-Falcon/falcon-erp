import React from 'react';
import { ShieldCheck, Zap, RefreshCw, Layers, TrendingUp } from 'lucide-react';

interface AuthBrandingPanelProps {
    mode?: 'login' | 'register';
}

export const AuthBrandingPanel: React.FC<AuthBrandingPanelProps> = ({ mode = 'login' }) => {
    return (
        <div className="relative hidden lg:flex flex-col items-center justify-between w-full h-full p-8 xl:p-12 overflow-hidden bg-gradient-to-br from-[#0a1026] via-[#0f1738] to-[#070b1a] text-white select-none border-l border-slate-800/60">
            {/* Ambient background glow effects */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-[140px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-[150px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

            {/* Top Brand Tag */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-semibold text-blue-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>منظومة فالكون لإدارة المؤسسات</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">v2.5 Enterprise</span>
            </div>

            {/* Center Hero Block */}
            <div className="flex flex-col items-center text-center max-w-lg z-10 my-auto py-8">
                {/* Sleek Falcon Emblem */}
                <div className="relative mb-6 flex items-center justify-center group">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-[#18264d] to-[#0d152c] border border-blue-500/30 shadow-2xl flex items-center justify-center p-3 backdrop-blur-xl">
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-inner">
                            {/* Dynamic Falcon Wings / Layers Icon */}
                            <Layers className="w-10 h-10 text-white stroke-[2.2]" />
                        </div>
                    </div>
                </div>

                {/* Main Brand Heading */}
                <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white mb-3">
                    Falcon ERP
                </h1>
                <p className="text-base font-bold text-blue-200/90 mb-1">
                    نظام الإدارة المالية والمخزنية المتكامل
                </p>
                <p className="text-xs text-slate-400 max-w-sm mb-8 leading-relaxed">
                    إدارة متكاملة لنقاط البيع، الحسابات العامة، المخازن، والرواتب بمعمارية Offline-First تضمن استمرارية الأعمال بدون انقطاع.
                </p>

                {/* Feature Highlights Grid */}
                <div className="w-full grid grid-cols-1 gap-3 text-right">
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                            <Zap className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white">نقاط بيع سريعة (POS) دون انقطاع</h4>
                            <p className="text-2xs text-slate-400 mt-0.5 leading-relaxed">
                                استمر في البيع وإصدار الفواتير وطباعة الباركود والورديات حتى في حال انقطاع الإنترنت.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                            <TrendingUp className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white">محاسبة تلقائية وقيود مزدوجة</h4>
                            <p className="text-2xs text-slate-400 mt-0.5 leading-relaxed">
                                ترحيل فوري للمبيعات والمشتريات والمصروفات إلى دفتر اليومية وشجرة الحسابات دون تدخل يدوي.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                            <RefreshCw className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white">مزامنة سحابية لحظية آمنة</h4>
                            <p className="text-2xs text-slate-400 mt-0.5 leading-relaxed">
                                مزامنة ثنائية مشفرة وفورية مع السحابة فور توفر الشبكة لربط الفروع والخزائن بدقة متناهية.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Trust Indicators */}
            <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400 z-10 pt-4 border-t border-white/5 w-full">
                <span className="flex items-center gap-1.5 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    تشفير Enterprise
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    معمارية Offline-First
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                    مزامنة لحظية Realtime
                </span>
            </div>
        </div>
    );
};
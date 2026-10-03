'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, X, Delete, Equal, Keyboard } from 'lucide-react';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [prevVal, setPrevVal] = useState<number | null>(null);
    const [operation, setOperation] = useState<string | null>(null);
    const [resetNext, setResetNext] = useState(false);
    const [activeKey, setActiveKey] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const triggerVisualKey = (key: string) => {
        setActiveKey(key);
        setTimeout(() => setActiveKey(null), 130);
    };

    const handleNumber = useCallback((num: string) => {
        setDisplay((prev) => {
            if (prev === '0' || resetNext) {
                return num;
            }
            if (prev.length >= 15) return prev; // Limit max length
            return prev + num;
        });
        setResetNext(false);
    }, [resetNext]);

    const handleDot = useCallback(() => {
        setDisplay((prev) => {
            if (resetNext) {
                return '0.';
            }
            if (!prev.includes('.')) {
                return prev + '.';
            }
            return prev;
        });
        setResetNext(false);
    }, [resetNext]);

    const calculate = (a: number, b: number, op: string): number => {
        let res: number;
        switch (op) {
            case '+':
                res = a + b;
                break;
            case '-':
                res = a - b;
                break;
            case '×':
                res = a * b;
                break;
            case '÷':
                res = b !== 0 ? a / b : 0;
                break;
            default:
                res = b;
        }
        // Round to avoid floating point precision issues (e.g. 0.1 + 0.2 = 0.30000000000000004)
        return Math.round(res * 100000000) / 100000000;
    };

    const handleOp = useCallback((op: string) => {
        const current = parseFloat(display);
        if (isNaN(current)) return;

        if (prevVal === null) {
            setPrevVal(current);
            setEquation(`${current} ${op}`);
        } else if (operation) {
            const result = calculate(prevVal, current, operation);
            setPrevVal(result);
            setDisplay(String(result));
            setEquation(`${result} ${op}`);
        }
        setOperation(op);
        setResetNext(true);
    }, [display, operation, prevVal]);

    const handlePercent = useCallback(() => {
        const current = parseFloat(display);
        if (isNaN(current)) return;

        if (prevVal !== null && operation) {
            // Calculate percentage of prevVal (e.g. 200 + 10% = 20)
            const percentVal = (prevVal * current) / 100;
            setDisplay(String(percentVal));
        } else {
            const result = current / 100;
            setDisplay(String(result));
        }
    }, [display, operation, prevVal]);

    const handleEqual = useCallback(() => {
        if (prevVal === null || !operation) return;
        const current = parseFloat(display);
        if (isNaN(current)) return;

        const result = calculate(prevVal, current, operation);
        setEquation(`${prevVal} ${operation} ${current} =`);
        setDisplay(String(result));
        setPrevVal(null);
        setOperation(null);
        setResetNext(true);
    }, [display, operation, prevVal]);

    const handleClear = useCallback(() => {
        setDisplay('0');
        setEquation('');
        setPrevVal(null);
        setOperation(null);
        setResetNext(false);
    }, []);

    const handleBackspace = useCallback(() => {
        setDisplay((prev) => {
            if (resetNext) return '0';
            if (prev.length > 1) {
                return prev.slice(0, -1);
            }
            return '0';
        });
    }, [resetNext]);

    // Full keyboard interaction handler
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Allow Ctrl+C and Ctrl+V
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c' || e.key === 'C') {
                    navigator.clipboard.writeText(display);
                }
                return;
            }

            const key = e.key;

            // 1. Digits 0-9
            if (/^[0-9]$/.test(key)) {
                e.preventDefault();
                triggerVisualKey(key);
                handleNumber(key);
                return;
            }

            // 2. Decimal point
            if (key === '.' || key === ',') {
                e.preventDefault();
                triggerVisualKey('.');
                handleDot();
                return;
            }

            // 3. Operations
            if (key === '+') {
                e.preventDefault();
                triggerVisualKey('+');
                handleOp('+');
                return;
            }
            if (key === '-') {
                e.preventDefault();
                triggerVisualKey('-');
                handleOp('-');
                return;
            }
            if (key === '*' || key === 'x' || key === 'X') {
                e.preventDefault();
                triggerVisualKey('×');
                handleOp('×');
                return;
            }
            if (key === '/') {
                e.preventDefault();
                triggerVisualKey('÷');
                handleOp('÷');
                return;
            }
            if (key === '%') {
                e.preventDefault();
                triggerVisualKey('%');
                handlePercent();
                return;
            }

            // 4. Equal (Enter or =)
            if (key === 'Enter' || key === '=') {
                e.preventDefault();
                triggerVisualKey('=');
                handleEqual();
                return;
            }

            // 5. Backspace
            if (key === 'Backspace') {
                e.preventDefault();
                triggerVisualKey('backspace');
                handleBackspace();
                return;
            }

            // 6. Clear / Escape
            if (key === 'Delete' || key === 'c' || key === 'C') {
                e.preventDefault();
                triggerVisualKey('c');
                handleClear();
                return;
            }

            if (key === 'Escape') {
                e.preventDefault();
                if (display !== '0' || equation !== '') {
                    handleClear();
                } else {
                    onClose();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, display, equation, handleNumber, handleDot, handleOp, handlePercent, handleEqual, handleClear, handleBackspace, onClose]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none animate-in fade-in-50 duration-150">
            {/* Click outside to close */}
            <div className="fixed inset-0" onClick={onClose} />

            <div
                className="relative z-10 w-full max-w-[340px] bg-surface rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col"
                dir="ltr"
            >
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800" dir="rtl">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                                الآلة الحاسبة السريعة
                            </span>
                            <div className="flex items-center gap-1 text-3xs text-emerald-600 dark:text-emerald-400 font-bold">
                                <Keyboard className="w-3 h-3" />
                                <span>الكيبورد متصل ونشط</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Display Screen */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/60 flex flex-col items-end justify-center min-h-[96px] border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 mb-1 h-4 select-text">
                        {equation}
                    </span>
                    <span className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight break-all select-text">
                        {display}
                    </span>
                </div>

                {/* Keypad Grid */}
                <div className="p-4 grid grid-cols-4 gap-2.5">
                    {/* Row 1: C, Backspace, %, ÷ */}
                    <button
                        onClick={() => {
                            triggerVisualKey('c');
                            handleClear();
                        }}
                        className={`h-12 rounded-2xl font-bold text-sm transition-all duration-100 cursor-pointer ${activeKey === 'c'
                            ? 'bg-rose-500 text-white scale-95'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50'
                            }`}
                    >
                        C
                    </button>
                    <button
                        onClick={() => {
                            triggerVisualKey('backspace');
                            handleBackspace();
                        }}
                        className={`h-12 rounded-2xl font-bold text-sm flex items-center justify-center transition-all duration-100 cursor-pointer ${activeKey === 'backspace'
                            ? 'bg-slate-400 text-white scale-95 dark:bg-slate-600'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        <Delete className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            triggerVisualKey('%');
                            handlePercent();
                        }}
                        className={`h-12 rounded-2xl font-bold text-sm transition-all duration-100 cursor-pointer ${activeKey === '%'
                            ? 'bg-slate-400 text-white scale-95 dark:bg-slate-600'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        %
                    </button>
                    <button
                        onClick={() => {
                            triggerVisualKey('÷');
                            handleOp('÷');
                        }}
                        className={`h-12 rounded-2xl font-bold text-base transition-all duration-100 cursor-pointer ${activeKey === '÷'
                            ? 'bg-blue-600 text-white scale-95'
                            : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                            }`}
                    >
                        ÷
                    </button>

                    {/* Row 2: 7, 8, 9, × */}
                    {['7', '8', '9'].map((n) => (
                        <button
                            key={n}
                            onClick={() => {
                                triggerVisualKey(n);
                                handleNumber(n);
                            }}
                            className={`h-12 rounded-2xl border font-bold text-base shadow-2xs transition-all duration-100 cursor-pointer ${activeKey === n
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 scale-95 ring-2 ring-blue-400'
                                : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-white'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            triggerVisualKey('×');
                            handleOp('×');
                        }}
                        className={`h-12 rounded-2xl font-bold text-base transition-all duration-100 cursor-pointer ${activeKey === '×'
                            ? 'bg-blue-600 text-white scale-95'
                            : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                            }`}
                    >
                        ×
                    </button>

                    {/* Row 3: 4, 5, 6, - */}
                    {['4', '5', '6'].map((n) => (
                        <button
                            key={n}
                            onClick={() => {
                                triggerVisualKey(n);
                                handleNumber(n);
                            }}
                            className={`h-12 rounded-2xl border font-bold text-base shadow-2xs transition-all duration-100 cursor-pointer ${activeKey === n
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 scale-95 ring-2 ring-blue-400'
                                : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-white'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            triggerVisualKey('-');
                            handleOp('-');
                        }}
                        className={`h-12 rounded-2xl font-bold text-base transition-all duration-100 cursor-pointer ${activeKey === '-'
                            ? 'bg-blue-600 text-white scale-95'
                            : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                            }`}
                    >
                        -
                    </button>

                    {/* Row 4: 1, 2, 3, + */}
                    {['1', '2', '3'].map((n) => (
                        <button
                            key={n}
                            onClick={() => {
                                triggerVisualKey(n);
                                handleNumber(n);
                            }}
                            className={`h-12 rounded-2xl border font-bold text-base shadow-2xs transition-all duration-100 cursor-pointer ${activeKey === n
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 scale-95 ring-2 ring-blue-400'
                                : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-white'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            triggerVisualKey('+');
                            handleOp('+');
                        }}
                        className={`h-12 rounded-2xl font-bold text-base transition-all duration-100 cursor-pointer ${activeKey === '+'
                            ? 'bg-blue-600 text-white scale-95'
                            : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                            }`}
                    >
                        +
                    </button>

                    {/* Row 5: 0, ., = */}
                    <button
                        onClick={() => {
                            triggerVisualKey('0');
                            handleNumber('0');
                        }}
                        className={`h-12 col-span-2 rounded-2xl border font-bold text-base shadow-2xs transition-all duration-100 cursor-pointer ${activeKey === '0'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 scale-95 ring-2 ring-blue-400'
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-white'
                            }`}
                    >
                        0
                    </button>
                    <button
                        onClick={() => {
                            triggerVisualKey('.');
                            handleDot();
                        }}
                        className={`h-12 rounded-2xl border font-bold text-base shadow-2xs transition-all duration-100 cursor-pointer ${activeKey === '.'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 scale-95 ring-2 ring-blue-400'
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-white'
                            }`}
                    >
                        .
                    </button>
                    <button
                        onClick={() => {
                            triggerVisualKey('=');
                            handleEqual();
                        }}
                        className={`h-12 rounded-2xl text-white font-bold text-base flex items-center justify-center shadow-md transition-all duration-100 cursor-pointer ${activeKey === '='
                            ? 'bg-blue-800 scale-95 ring-2 ring-blue-400'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        <Equal className="w-5 h-5" />
                    </button>
                </div>

                {/* Footer shortcuts hint */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-3xs font-bold text-slate-400" dir="rtl">
                    <span>Enter للناتج • Esc للإغلاق</span>
                    <span dir="ltr">Numpad / Keys Ready</span>
                </div>
            </div>
        </div>,
        document.body
    );
};
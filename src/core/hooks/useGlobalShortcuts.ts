'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * جلب جميع حقول عناصر النموذج القابلة للتركيز والظاهرة في الصفحة الحالية
 */
function getFocusableFormElements(): HTMLElement[] {
  const selector = [
    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    '[role="combobox"]:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(',');

  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  return elements.filter((el) => {
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.getClientRects().length) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

/**
 * التعامل مع التنقل بين حقول الإدخال عبر مفاتيح الأسهم (ArrowDown, ArrowUp, ArrowLeft, ArrowRight) ومفتاح Enter
 */
function handleArrowNavigation(e: KeyboardEvent) {
  const activeEl = document.activeElement as HTMLElement | null;
  if (!activeEl) return;

  const tagName = activeEl.tagName.toLowerCase();
  const isInput = tagName === 'input';
  const isSelect = tagName === 'select';
  const isTextarea = tagName === 'textarea';
  const isButton = tagName === 'button';
  const isCombobox = activeEl.getAttribute('role') === 'combobox';

  // نتحقق أولاً مما إذا كان العنصر الحالي هو حقل نموذج
  if (!isInput && !isSelect && !isTextarea && !isButton && !isCombobox) {
    return;
  }

  // إذا كانت هناك قائمة منسدلة مفتوحة (مثل Radix UI Listbox/Popover)، نترك الأسهم للتنقل داخل عناصر القائمة
  const hasOpenPopover = document.querySelector(
    '[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'
  );
  if (hasOpenPopover && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    return;
  }

  // عدم تعطيل عمل مفتاح Enter أو المسافة على زر الحفظ/الإجراء
  if (isButton && (e.key === 'Enter' || e.key === ' ')) {
    return;
  }

  // عدم تعطيل السطر الجديد في خانة النص المتعدد (Textarea)
  if (isTextarea && e.key === 'Enter') {
    return;
  }

  const keysToHandle = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];
  if (!keysToHandle.includes(e.key)) return;

  const focusables = getFocusableFormElements();
  const currentIndex = focusables.indexOf(activeEl);
  if (currentIndex === -1) return;

  let nextIndex = -1;

  // 1. [ArrowDown] أو [Enter] -> الانتقال للحقل التالي
  if (e.key === 'ArrowDown' || (e.key === 'Enter' && !isTextarea)) {
    if (e.key === 'Enter') {
      e.preventDefault();
    } else if (isInput) {
      // منع تغيير قيمة الحقول الرقمية عند استخدام سهم لأسفل للتنقل
      e.preventDefault();
    }
    nextIndex = currentIndex + 1;
  }
  // 2. [ArrowUp] -> الانتقال للحقل السابق
  else if (e.key === 'ArrowUp') {
    if (isInput) {
      e.preventDefault();
    }
    nextIndex = currentIndex - 1;
  }
  // 3. [ArrowLeft] (في الواجهات العربية RTL -> الانتقال للحقل التالي عند حافة النص)
  else if (e.key === 'ArrowLeft') {
    if (isInput) {
      const input = activeEl as HTMLInputElement;
      const isTextType = ['text', 'search', 'tel', 'url', 'email', 'number'].includes(input.type);
      if (isTextType && input.selectionStart !== null && input.selectionEnd !== null) {
        if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        }
      } else {
        e.preventDefault();
        nextIndex = currentIndex + 1;
      }
    } else if (isButton || isCombobox || isSelect) {
      e.preventDefault();
      nextIndex = currentIndex + 1;
    }
  }
  // 4. [ArrowRight] (في الواجهات العربية RTL -> الانتقال للحقل السابق عند حافة النص)
  else if (e.key === 'ArrowRight') {
    if (isInput) {
      const input = activeEl as HTMLInputElement;
      const isTextType = ['text', 'search', 'tel', 'url', 'email', 'number'].includes(input.type);
      if (isTextType && input.selectionStart !== null && input.selectionEnd !== null) {
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      } else {
        e.preventDefault();
        nextIndex = currentIndex - 1;
      }
    } else if (isButton || isCombobox || isSelect) {
      e.preventDefault();
      nextIndex = currentIndex - 1;
    }
  }

  if (nextIndex >= 0 && nextIndex < focusables.length) {
    const target = focusables[nextIndex];
    target.focus();
    if (
      target instanceof HTMLInputElement &&
      ['text', 'search', 'tel', 'url', 'email', 'number'].includes(target.type)
    ) {
      target.select();
    }
  }
}

/**
 * 🦅 Falcon ERP - Global Unified Keyboard Shortcuts & Form Navigation
 * Ensures lightning-fast, keyboard-driven navigation across the whole system:
 * - [ArrowDown / ArrowUp / Enter / ArrowLeft / ArrowRight]: سهولة التنقل الفوري بين حقول الإدخال
 * - [F1]: نقطة البيع السريعة (POS)
 * - [F2]: فاتورة شراء وتوريد جديدة
 * - [F3]: إضافة صنف جديد
 * - [F4] / [Ctrl+K]: البحث الشامل السريع
 * - [Ctrl+S]: حفظ العملية الحالية
 * - [Esc]: إلغاء / إغلاق
 */
export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. [Ctrl + K] or [F4] -> Quick Global Search
      if ((e.ctrlKey && (e.key === 'k' || e.key === 'K')) || e.key === 'F4') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
          toast.info('تم تفعيل البحث السريع (Ctrl + K)');
        }
        return;
      }

      // 2. [Ctrl + S] -> Save current action / form submit
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();

        // Dispatch custom event for page-specific handling
        window.dispatchEvent(new CustomEvent('erp:save'));

        // Attempt to click the primary submit button if present
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          toast.success('تم تنفيذ أمر الحفظ (Ctrl + S)');
        } else {
          toast.info('اختصار الحفظ (Ctrl + S)');
        }
        return;
      }

      // 3. Navigation between inputs using Arrow keys and Enter
      handleArrowNavigation(e);

      // 4. Function keys accelerators (F1, F2, F3)
      if (e.key === 'F1') {
        e.preventDefault();
        router.push('/sales/pos');
        toast.info('جاري فتح نقطة البيع (F1)...');
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        router.push('/purchases/invoices/new');
        toast.info('جاري فتح فاتورة شراء جديدة (F2)...');
        return;
      }

      if (e.key === 'F3') {
        e.preventDefault();
        router.push('/items/new');
        toast.info('جاري فتح إضافة صنف جديد (F3)...');
        return;
      }

      // 5. [Esc] -> Blur active element or cancel
      if (e.key === 'Escape') {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.blur();
        }
        window.dispatchEvent(new CustomEvent('erp:escape'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);
}

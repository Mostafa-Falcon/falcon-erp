'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SalesRepository } from '@/modules/sales/sales_repository';
import type { SalesInvoice, PurchaseInvoice, Contact, Product } from '@/types';

// Hooks & Types
import { usePosData } from './usePosData';
import { usePosCart } from './usePosCart';

// UI Subcomponents
import { PosHeader } from './PosHeader';
import { PosToolbar } from './PosToolbar';
import { PosSearchCustomerBar } from './PosSearchCustomerBar';
import { PosCartTable } from './PosCartTable';
import { PosTotalsBar } from './PosTotalsBar';
import { PosPaymentActions } from './PosPaymentActions';
import { PosQuickItemsSidebar } from './PosQuickItemsSidebar';
import { PosOpenShiftView } from './PosOpenShiftView';

// Modals
import { PosCustomerModal } from './modals/PosCustomerModal';
import { PosLookupModal } from './modals/PosLookupModal';
import { PosReceiptModal } from './modals/PosReceiptModal';
import { PosSplitPaymentModal } from './modals/PosSplitPaymentModal';
import { PosHeldSalesModal } from './modals/PosHeldSalesModal';
import { PosQuickItemsModal } from './modals/PosQuickItemsModal';
import { PosRecentOperationsModal } from './modals/PosRecentOperationsModal';
import { PosReturnOptionsModal } from './modals/PosReturnOptionsModal';
import { PosFreeReturnModal } from './modals/PosFreeReturnModal';
import { PosInvoiceSelectReturnModal } from './modals/PosInvoiceSelectReturnModal';
import { PosInvoiceReturnModal } from './modals/PosInvoiceReturnModal';
import { PosPurchaseReturnOptionsModal } from './modals/PosPurchaseReturnOptionsModal';
import { PosFreePurchaseReturnModal } from './modals/PosFreePurchaseReturnModal';
import { PosPurchaseInvoiceSelectReturnModal } from './modals/PosPurchaseInvoiceSelectReturnModal';
import { PosPurchaseInvoiceReturnModal } from './modals/PosPurchaseInvoiceReturnModal';
import { PosExpenseModal } from './modals/PosExpenseModal';
import { PosSupplierPaymentModal } from './modals/PosSupplierPaymentModal';
import { PosCustomerPaymentModal } from './modals/PosCustomerPaymentModal';
import { PosDiscountsModal } from './modals/PosDiscountsModal';

import { OpenShiftModal } from '@/components/sales/shifts/OpenShiftModal';
import { ShiftDetailModal } from '@/components/sales/shifts/ShiftDetailModal';
import { AdminCloseShiftModal } from '@/components/sales/shifts/AdminCloseShiftModal';
import { SupportModal } from '@/components/layout/SupportModal';
import { CalculatorModal } from '@/components/layout/CalculatorModal';

export function POS() {
  // 1. Data Hook
  const {
    currentUser,
    orgId,
    branchId,
    branchName,
    activeShift,
    setActiveShift,
    warehouses,
    warehouseId,
    treasuries,
    treasuryId,
    customers,
    products,
    unitsById,
    unitOptions,
    stock,
    batches,
    users,
    isLoading,
    scaleConfig,
    enableTax,
    vatRate,
    isTaxInclusive,
    loadData,
  } = usePosData();

  // Dialog & Sidebar States
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isShiftDetailOpen, setIsShiftDetailOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isQuickItemsOpen, setIsQuickItemsOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isRecentOperationsOpen, setIsRecentOperationsOpen] = useState(false);
  const [isReturnOptionsOpen, setIsReturnOptionsOpen] = useState(false);
  const [isFreeReturnOpen, setIsFreeReturnOpen] = useState(false);
  const [isInvoiceSelectReturnOpen, setIsInvoiceSelectReturnOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<SalesInvoice | null>(null);

  // Purchase Return States
  const [isPurchaseReturnOptionsOpen, setIsPurchaseReturnOptionsOpen] = useState(false);
  const [isFreePurchaseReturnOpen, setIsFreePurchaseReturnOpen] = useState(false);
  const [isPurchaseInvoiceSelectReturnOpen, setIsPurchaseInvoiceSelectReturnOpen] = useState(false);
  const [selectedPurchaseInvoiceForReturn, setSelectedPurchaseInvoiceForReturn] = useState<PurchaseInvoice | null>(null);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Supplier Payment Modal State
  const [isSupplierPaymentModalOpen, setIsSupplierPaymentModalOpen] = useState(false);

  // Customer Payment Modal State
  const [isCustomerPaymentModalOpen, setIsCustomerPaymentModalOpen] = useState(false);

  // Discounts & Shipping Modal State
  const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState(false);

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Resizable Quick Items Sidebar State
  const [isQuickSidebarOpen, setIsQuickSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(340);
  const [isResizing, setIsResizing] = useState(false);

  // Load saved sidebar width
  useEffect(() => {
    try {
      const saved = localStorage.getItem('falcon_pos_quick_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 650) {
          setSidebarWidth(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved sidebar width:', e);
    }
  }, []);

  // Handle Drag Resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // In RTL layout, sidebar is on the left side (x: 0 to sidebarWidth)
      const newWidth = Math.min(650, Math.max(240, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('falcon_pos_quick_sidebar_width', String(sidebarWidth));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // Saving / Invoice
  const [isSaving, setIsSaving] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<SalesInvoice | null>(null);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);

  // Theme
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('falcon_theme');
    setIsDark(savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('falcon_theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  // 2. Cart Hook
  const {
    cart,
    setCart,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    searchHighlightedIndex,
    setSearchHighlightedIndex,
    searchResults,
    searchInputRef,
    customerMode,
    setCustomerMode,
    selectedCustomerId,
    setSelectedCustomerId,
    priceTier,
    setPriceTier,
    globalDiscount,
    setGlobalDiscount,
    shippingFee,
    setShippingFee,
    notes,
    setNotes,
    isReadingScale,
    heldSales,
    activeReturnInvoice,
    setActiveReturnInvoice,
    startInvoiceReturn,
    cancelReturnMode,
    availableFor,
    addToCart,
    handleSearchKeyDown,
    handleReadLiveWeight,
    updateQty,
    setLineQty,
    setLineBatch,
    handleUnitChange,
    setLineDiscount,
    toggleLinePriceTier,
    removeLine,
    clearCart,
    holdCurrentSale,
    resumeHeldSale,
    deleteHeldSale,
    lastAddedKey,
    subtotal,
    totalDiscount,
    totalTax,
    total,
  } = usePosCart({
    products,
    unitOptions,
    batches,
    stock,
    activeShift,
    scaleConfig,
    setIsShiftModalOpen,
    orgId,
    enableTax,
    vatRate,
    isTaxInclusive,
  });

  // Focus search input on mount
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [isLoading]);

  // Checkout Execution
  const executeCheckout = async (
    payType: 'cash' | 'card' | 'credit' | 'split',
    splitDetails?: { cashAmount: number; cardAmount: number }
  ) => {
    if (!activeShift) {
      toast.error('لا يمكن إتمام العملية بدون فتح وردية كاشير أولاً');
      setIsShiftModalOpen(true);
      return;
    }
    if (cart.length === 0) {
      toast.error('السلة فارغة! يرجى إضافة أصناف أولاً.');
      return;
    }
    if (!warehouseId || !treasuryId) {
      toast.error('يرجى تحديد المخزن والخزينة لإتمام العملية.');
      return;
    }

    // Return Mode Checkout
    if (activeReturnInvoice) {
      setIsSaving(true);
      try {
        const returnItems = cart.map((line) => ({
          productId: line.productId,
          unitId: line.unitId,
          conversionFactor: line.factor,
          quantity: line.qty,
          unitPrice: line.price,
          unitCost: line.cost * line.factor,
          discountAmount: line.discount,
          taxRate: line.taxRate,
        }));

        await SalesRepository.createSalesReturn({
          orgId,
          branchId,
          warehouseId,
          originalInvoiceId: activeReturnInvoice.id,
          shiftId: activeShift.id,
          customerId: activeReturnInvoice.customer_id || null,
          items: returnItems,
          discountAmount: globalDiscount,
          discountPercent: globalDiscountPercent,
          enableTax,
          vatRate,
          treasuryId,
          userId: currentUser?.id || '',
          reason: notes.trim() || `مرتجع مبيعات مباشر من الفاتورة #${activeReturnInvoice.invoice_number}`,
        });

        // Live update shift balance
        const { db } = await import('@/core/db/app_database');
        const refreshedShift = await db.cashier_shifts.get(activeShift.id);
        if (refreshedShift) {
          setActiveShift(refreshedShift);
        }

        toast.success(`تم حفظ المرتجع للفاتورة #${activeReturnInvoice.invoice_number} بنجاح!`);
        cancelReturnMode();
        loadData();
      } catch (err) {
        console.error('Error processing sales return:', err);
        toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المرتجع.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (payType === 'credit' && !selectedCustomerId) {
      setIsCustomerModalOpen(true);
      toast.error('البيع الآجل يتطلب تحديد العميل أولاً!');
      return;
    }

    setIsSaving(true);
    try {
      const items = cart.map((line) => ({
        productId: line.productId,
        batchId: line.batchId || null,
        unitId: line.unitId,
        conversionFactor: line.factor,
        quantity: line.qty,
        unitPrice: line.price,
        unitCost: line.cost * line.factor,
        discountAmount: line.discount,
        taxRate: line.taxRate,
      }));

      let cashAmount = 0;
      let cardAmount = 0;

      if (payType === 'cash') {
        cashAmount = total;
      } else if (payType === 'card') {
        cardAmount = total;
      } else if (payType === 'split') {
        cashAmount = splitDetails?.cashAmount ?? 0;
        cardAmount = splitDetails?.cardAmount ?? 0;
      }

      const invoice = await SalesRepository.createSalesInvoice({
        orgId,
        branchId,
        warehouseId,
        shiftId: activeShift.id,
        customerId: selectedCustomerId || null,
        items,
        discountAmount: globalDiscount,
        discountPercent: globalDiscountPercent,
        shippingFee,
        paymentType: payType,
        cashAmount,
        cardAmount,
        treasuryId,
        userId: currentUser?.id || '',
        notes: [notes.trim(), shippingFee > 0 ? `مصاريف توصيل/شحن: ${shippingFee} ج.م` : '']
          .filter(Boolean)
          .join(' | ') || undefined,
      });

      // Live update shift balance
      const { db } = await import('@/core/db/app_database');
      const refreshedShift = await db.cashier_shifts.get(activeShift.id);
      if (refreshedShift) {
        setActiveShift(refreshedShift);
      }

      setSuccessInvoice(invoice);
      toast.success(`تم حفظ وطباعة الفاتورة #${invoice.invoice_number} بنجاح!`);
      setCart([]);
      setGlobalDiscount(0);
      setShippingFee(0);
      setGlobalDiscountPercent(0);
      setNotes('');
      setSelectedCustomerId('');
      setCustomerMode('cash');
      setIsSplitModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إتمام عملية البيع.');
    } finally {
      setIsSaving(false);
    }
  };

  // Global Keyboard Shortcuts inside POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F10: Cash Checkout
      if (e.key === 'F10') {
        e.preventDefault();
        executeCheckout('cash');
        return;
      }
      // F7: Card Payment
      if (e.key === 'F7') {
        e.preventDefault();
        executeCheckout('card');
        return;
      }
      // F9: Split Payment Modal
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsSplitModalOpen(true);
        } else {
          toast.warning('السلة فارغة، أضف أصنافاً أولاً');
        }
        return;
      }
      // F4: Discounts & Shipping Modal
      if (e.key === 'F4') {
        e.preventDefault();
        setIsDiscountsModalOpen(true);
        return;
      }
      // F12: Cancel / Clear Cart
      if (e.key === 'F12') {
        e.preventDefault();
        clearCart();
        return;
      }
      // F6: Read Live Weight from Scale
      if (e.key === 'F6') {
        e.preventDefault();
        handleReadLiveWeight();
        return;
      }
      // F2: Focus Search / Barcode
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      // F3: Quick Product Lookup Modal
      if (e.key === 'F3') {
        e.preventDefault();
        setIsLookupModalOpen(true);
        return;
      }
      // Escape: Close search or modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsCustomerModalOpen(false);
        setIsCustomerPaymentModalOpen(false);
        setIsSupplierPaymentModalOpen(false);
        setIsExpenseModalOpen(false);
        setIsLookupModalOpen(false);
        setIsHeldModalOpen(false);
        setIsQuickItemsOpen(false);
        setIsSplitModalOpen(false);
        setIsDiscountsModalOpen(false);
        if (activeShift) setIsShiftModalOpen(false);
        setSuccessInvoice(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, warehouseId, treasuryId, selectedCustomerId, total, totalDiscount, activeShift]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f4f6f8] dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">جاري تحميل نقطة البيع (الكاشير)...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f4f6f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-between select-none overflow-x-hidden font-sans">
      {/* 1. Header */}
      <PosHeader
        currentUser={currentUser}
        activeShift={activeShift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenSupportModal={() => setIsSupportOpen(true)}
        onOpenCalcModal={() => setIsCalcOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* 2. Main POS Flow or Open Shift View */}
      {!activeShift ? (
        <PosOpenShiftView
          currentUser={currentUser}
          orgId={orgId}
          branchId={branchId}
          treasuries={treasuries}
          onShiftOpened={(shift) => {
            setActiveShift(shift);
            loadData();
          }}
        />
      ) : (
        <>
          {/* Operations Toolbar */}
          <PosToolbar
            activeShift={activeShift}
            onOpenLookupModal={() => setIsLookupModalOpen(true)}
            onToggleQuickSidebar={() => setIsQuickSidebarOpen((prev) => !prev)}
            isQuickSidebarOpen={isQuickSidebarOpen}
            onOpenRecentOperations={() => setIsRecentOperationsOpen(true)}
            onOpenReturnOptions={() => setIsReturnOptionsOpen(true)}
            onOpenPurchaseReturnOptions={() => setIsPurchaseReturnOptionsOpen(true)}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onOpenSupplierPaymentModal={() => setIsSupplierPaymentModalOpen(true)}
            onOpenCustomerPaymentModal={() => setIsCustomerPaymentModalOpen(true)}
            onOpenHeldModal={() => setIsHeldModalOpen(true)}
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            onReadLiveWeight={() => handleReadLiveWeight()}
            isReadingScale={isReadingScale}
            heldCount={heldSales.length}
          />

          {/* Return Mode Active Alert Banner */}
          {activeReturnInvoice && (
            <div className="bg-amber-500/10 dark:bg-amber-950/40 border-y border-amber-300/80 dark:border-amber-800/80 px-6 py-2.5 flex items-center justify-between shadow-2xs shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>وضع المرتجع نشط: #{activeReturnInvoice.invoice_number}</span>
              </div>
              <button
                onClick={cancelReturnMode}
                className="h-8 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Search, Barcode & Customer Segment Bar */}
          <PosSearchCustomerBar
            customerMode={customerMode}
            setCustomerMode={setCustomerMode}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            customers={customers}
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            searchHighlightedIndex={searchHighlightedIndex}
            setSearchHighlightedIndex={setSearchHighlightedIndex}
            searchResults={searchResults}
            searchInputRef={searchInputRef}
            onSearchKeyDown={handleSearchKeyDown}
            onAddToCart={addToCart}
            availableFor={availableFor}
            cartCount={cart.length}
            priceTier={priceTier}
            setPriceTier={setPriceTier}
          />

          {/* Main Working Area: Cart Table + Left Quick Items Sidebar */}
          <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* Main Cart Table */}
            <div className="flex-1 overflow-y-auto flex flex-col min-w-0">
              <PosCartTable
                cart={cart}
                products={products}
                unitsById={unitsById}
                unitOptions={unitOptions}
                batches={batches}
                availableFor={availableFor}
                onUpdateQty={updateQty}
                onSetQty={setLineQty}
                onSetLineBatch={setLineBatch}
                onSetLineDiscount={setLineDiscount}
                onOpenDiscountsModal={() => setIsDiscountsModalOpen(true)}
                onRemoveLine={removeLine}
                onReadLiveWeight={handleReadLiveWeight}
                isReadingScale={isReadingScale}
                onUnitChange={handleUnitChange}
                onToggleLinePriceTier={toggleLinePriceTier}
                lastAddedKey={lastAddedKey}
                onFocusSearch={() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                }}
              />
            </div>

            {/* Resizable Left Quick Items Sidebar */}
            {isQuickSidebarOpen && (
              <>
                {/* Mobile Slide-Over Drawer (< 768px) */}
                <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    onClick={() => setIsQuickSidebarOpen(false)}
                  />
                  {/* Drawer Container */}
                  <div className="relative z-10 w-[88vw] max-w-sm h-full bg-white dark:bg-[#111726] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                    <PosQuickItemsSidebar
                      products={products}
                      unitsById={unitsById}
                      availableFor={availableFor}
                      onAddToCart={(p) => {
                        addToCart(p);
                      }}
                      onClose={() => setIsQuickSidebarOpen(false)}
                      orgId={orgId}
                    />
                  </div>
                </div>

                {/* Desktop Resizable Sidebar (>= 768px) */}
                <div className="hidden md:flex flex-row h-full">
                  {/* Drag Resizer Handle */}
                  <div
                    onMouseDown={startResizing}
                    title="اسحب لتغيير حجم قائمة الأصناف السريعة"
                    className={`w-2 hover:w-2.5 bg-slate-200 hover:bg-amber-400 dark:bg-slate-800 dark:hover:bg-amber-500 cursor-col-resize transition-all shrink-0 select-none flex items-center justify-center group ${
                      isResizing ? 'bg-amber-500 w-2.5' : ''
                    }`}
                  >
                    <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-600 group-hover:bg-white rounded-full" />
                  </div>

                  {/* Sidebar Box */}
                  <div
                    style={{ width: `${sidebarWidth}px` }}
                    className="shrink-0 h-full border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111726] flex flex-col overflow-hidden shadow-sm animate-in slide-in-from-left duration-200"
                  >
                    <PosQuickItemsSidebar
                      products={products}
                      unitsById={unitsById}
                      availableFor={availableFor}
                      onAddToCart={addToCart}
                      onClose={() => setIsQuickSidebarOpen(false)}
                      orgId={orgId}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Totals Bar */}
          <PosTotalsBar
            cartCount={cart.length}
            subtotal={subtotal}
            totalDiscount={totalDiscount}
            shippingFee={shippingFee}
            totalTax={totalTax}
            total={total}
            isReturnMode={Boolean(activeReturnInvoice)}
            onOpenDiscountsModal={() => setIsDiscountsModalOpen(true)}
          />

          {/* Action Payment Buttons Bar */}
          <PosPaymentActions
            onClearCart={clearCart}
            onCheckout={(type) => executeCheckout(type)}
            onOpenSplitModal={() => {
              if (cart.length === 0) {
                toast.warning('السلة فارغة! يرجى إضافة أصناف أولاً.');
                return;
              }
              setIsSplitModalOpen(true);
            }}
            isSaving={isSaving}
            cartCount={cart.length}
            isReturnMode={Boolean(activeReturnInvoice)}
          />
        </>
      )}

      {/* 7. Modals */}
      <PosCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={(c: Contact | null) => {
          if (c) {
            setSelectedCustomerId(c.id);
            setCustomerMode('customer');
          } else {
            setSelectedCustomerId('');
            setCustomerMode('cash');
          }
        }}
      />

      <PosLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        products={products}
        availableFor={availableFor}
        onSelectProduct={(p: Product) => addToCart(p)}
      />

      <PosQuickItemsModal
        isOpen={isQuickItemsOpen}
        onClose={() => setIsQuickItemsOpen(false)}
        products={products}
        availableFor={availableFor}
        onSelectItem={(p: Product) => addToCart(p)}
      />

      <PosHeldSalesModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        heldSales={heldSales}
        activeCartCount={cart.length}
        onHoldCurrentSale={(note) => holdCurrentSale(note)}
        onResumeSale={(id) => resumeHeldSale(id)}
        onDeleteHeldSale={(id) => deleteHeldSale(id)}
      />

      <PosSplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        total={total}
        onConfirm={(cashAmt, cardAmt) => {
          executeCheckout('split', { cashAmount: cashAmt, cardAmount: cardAmt });
        }}
        isSaving={isSaving}
      />

      <PosDiscountsModal
        isOpen={isDiscountsModalOpen}
        onClose={() => setIsDiscountsModalOpen(false)}
        cart={cart}
        products={products}
        unitsById={unitsById}
        globalDiscount={globalDiscount}
        shippingFee={shippingFee}
        onApplyDiscounts={({ globalDiscount: gDisc, globalDiscountPercent: gDiscPct, shippingFee: sFee, lineDiscounts }) => {
          setGlobalDiscount(gDisc);
          setGlobalDiscountPercent(gDiscPct);
          setShippingFee(sFee);
          Object.entries(lineDiscounts).forEach(([k, d]) => {
            setLineDiscount(k, d);
          });
        }}
      />

      <PosReceiptModal
        invoice={successInvoice}
        onClose={() => setSuccessInvoice(null)}
      />

      <PosRecentOperationsModal
        isOpen={isRecentOperationsOpen}
        onClose={() => setIsRecentOperationsOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        products={products}
        unitsById={unitsById}
        customers={customers}
        treasuries={treasuries}
        warehouses={warehouses}
        users={users}
        onPrintInvoice={(inv) => {
          setSuccessInvoice(inv);
        }}
        onShiftDataChanged={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* Sales Return Modals */}
      {/* 1. Return Type Choice Modal (Free Return vs From Invoice) */}
      <PosReturnOptionsModal
        isOpen={isReturnOptionsOpen}
        onClose={() => setIsReturnOptionsOpen(false)}
        onSelectFreeReturn={() => setIsFreeReturnOpen(true)}
        onSelectInvoiceReturn={() => setIsInvoiceSelectReturnOpen(true)}
      />

      {/* 2. Free Sales Return Modal */}
      <PosFreeReturnModal
        isOpen={isFreeReturnOpen}
        onClose={() => setIsFreeReturnOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        products={products}
        unitsById={unitsById}
        unitOptions={unitOptions}
        customers={customers}
        warehouses={warehouses}
        treasuries={treasuries}
        warehouseId={warehouseId}
        treasuryId={treasuryId}
        onReturnProcessed={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* 3. Invoice Search & Select Modal for Return */}
      <PosInvoiceSelectReturnModal
        isOpen={isInvoiceSelectReturnOpen}
        onClose={() => setIsInvoiceSelectReturnOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        customers={customers}
        onSelectInvoice={async (inv) => {
          try {
            const { db } = await import('@/core/db/app_database');
            const invoiceItems = await db.sales_invoice_items
              .where('invoice_id')
              .equals(inv.id)
              .toArray();

            if (!invoiceItems || invoiceItems.length === 0) {
              toast.error('لا توجد أصناف مسجلة في هذه الفاتورة!');
              return;
            }

            const returnableItems = invoiceItems.map((item) => {
              const prod = products.find((p) => p.id === item.product_id);
              return {
                productId: item.product_id,
                batchId: item.batch_id || '',
                unitId: item.unit_id,
                factor: item.conversion_factor || 1,
                qty: item.quantity,
                price: item.unit_price,
                discount: item.discount_amount || 0,
                cost: item.unit_cost || (prod?.purchase_price || 0),
                taxRate: item.tax_rate || 0,
              };
            });

            startInvoiceReturn(inv, returnableItems);
            toast.info(`معلومة: تم تفعيل وضع المرتجع وتحميل أصناف الفاتورة #${inv.invoice_number}`);
          } catch (err) {
            console.error('Error loading invoice items for return mode:', err);
            toast.error('تعذر تحميل أصناف الفاتورة للبدء في المرتجع');
          }
        }}
      />

      {/* Purchase Return Modals */}
      {/* 1. Purchase Return Options Modal (Free vs From Invoice) */}
      <PosPurchaseReturnOptionsModal
        isOpen={isPurchaseReturnOptionsOpen}
        onClose={() => setIsPurchaseReturnOptionsOpen(false)}
        onSelectFreeReturn={() => setIsFreePurchaseReturnOpen(true)}
        onSelectInvoiceReturn={() => setIsPurchaseInvoiceSelectReturnOpen(true)}
      />

      {/* 2. Free Purchase Return Modal */}
      <PosFreePurchaseReturnModal
        isOpen={isFreePurchaseReturnOpen}
        onClose={() => setIsFreePurchaseReturnOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        products={products}
        unitsById={unitsById}
        unitOptions={unitOptions}
        contacts={customers}
        warehouses={warehouses}
        treasuries={treasuries}
        warehouseId={warehouseId}
        treasuryId={treasuryId}
        onReturnProcessed={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* 3. Purchase Invoice Search & Select Modal for Return */}
      <PosPurchaseInvoiceSelectReturnModal
        isOpen={isPurchaseInvoiceSelectReturnOpen}
        onClose={() => setIsPurchaseInvoiceSelectReturnOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        contacts={customers}
        onSelectInvoice={(inv) => {
          setSelectedPurchaseInvoiceForReturn(inv);
        }}
      />

      {/* 4. Purchase Invoice Items Return Modal */}
      <PosPurchaseInvoiceReturnModal
        invoice={selectedPurchaseInvoiceForReturn}
        isOpen={Boolean(selectedPurchaseInvoiceForReturn)}
        onClose={() => setSelectedPurchaseInvoiceForReturn(null)}
        activeShift={activeShift}
        currentUser={currentUser}
        products={products}
        unitsById={unitsById}
        treasuries={treasuries}
        onReturnProcessed={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* 5. Direct Expenses Modal */}
      <PosExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        treasuries={treasuries}
        onExpenseAdded={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* 6. Supplier Payment Modal */}
      <PosSupplierPaymentModal
        isOpen={isSupplierPaymentModalOpen}
        onClose={() => setIsSupplierPaymentModalOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        contacts={customers}
        treasuries={treasuries}
        onPaymentRecorded={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* 7. Customer Payment (Collection) Modal */}
      <PosCustomerPaymentModal
        isOpen={isCustomerPaymentModalOpen}
        onClose={() => setIsCustomerPaymentModalOpen(false)}
        activeShift={activeShift}
        currentUser={currentUser}
        contacts={customers}
        treasuries={treasuries}
        onPaymentRecorded={async () => {
          if (activeShift) {
            const { db } = await import('@/core/db/app_database');
            const refreshed = await db.cashier_shifts.get(activeShift.id);
            if (refreshed) {
              setActiveShift(refreshed);
            }
          }
          loadData();
        }}
      />

      {/* Shift & Layout Modals */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />

      <OpenShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentUser={currentUser}
        orgId={orgId}
        branchId={branchId}
        branchName={branchName}
        treasuries={treasuries}
        onShiftOpened={(shift) => {
          setActiveShift(shift);
          setIsShiftModalOpen(false);
        }}
      />

      <ShiftDetailModal
        shift={activeShift}
        isOpen={isShiftDetailOpen}
        onClose={() => setIsShiftDetailOpen(false)}
        users={users}
        treasuries={treasuries}
      />

      <AdminCloseShiftModal
        shift={activeShift}
        isOpen={isCloseShiftOpen}
        onClose={() => setIsCloseShiftOpen(false)}
        currentUser={currentUser}
        users={users}
        treasuries={treasuries}
        onShiftClosed={() => {
          setActiveShift(null);
          setIsCloseShiftOpen(false);
          setIsShiftModalOpen(true);
        }}
      />
    </div>
  );
}

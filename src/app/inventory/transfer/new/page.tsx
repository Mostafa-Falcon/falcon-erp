'use client';

import React from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Icons } from'@/components/ui/Icons';
import {
 useNewStockTransfer,
 TransferBasicInfoCard,
 TransferItemSelectorCard,
 TransferSelectedItemsTable,
} from'@/components/inventory/transfer';

export default function NewStockTransferPage() {
 const router = useRouter();
 const {
 transferNumber,
 branches,
 currentBranch,
 targetBranchId,
 setTargetBranchId,
 notes,
 setNotes,
 items,
 isSubmitting,
 searchQuery,
 setSearchQuery,
 searchResults,
 isSearchOpen,
 setIsSearchOpen,
 selectedProduct,
 setSelectedProduct,
 availableUnits,
 selectedUnitOption,
 quantity,
 setQuantity,
 availableSenderStock,
 handleSelectProduct,
 handleUnitChange,
 handleAddItem,
 handleRemoveItem,
 handleUpdateItemQuantity,
 handleSubmit,
 } = useNewStockTransfer();

 return (
 <AppShell
 title="طلب تحويل مخزني جديد"
 subtitle="إنشاء حركة نقل أصناف ومستلزمات بين الفروع"
 actions={
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => router.push('/inventory/transfer')}
 className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-all active:scale-95"
 >
 إلغاء
 </button>
 <button
 type="button"
 onClick={handleSubmit}
 disabled={isSubmitting || items.length === 0}
 className="h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
 >
 <Icons.Check /> {isSubmitting ?'جاري الحفظ...':'إنشاء طلب التحويل'}
 </button>
 </div>
 }
 >
 <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
 {/* Card 1: بيانات التحويل الأساسية */}
 <TransferBasicInfoCard
 transferNumber={transferNumber}
 currentBranch={currentBranch}
 targetBranchId={targetBranchId}
 branches={branches}
 notes={notes}
 onTargetBranchChange={setTargetBranchId}
 onNotesChange={setNotes}
 />

 {/* Card 2: إضافة أصناف للتحويل */}
 <TransferItemSelectorCard
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 searchResults={searchResults}
 isSearchOpen={isSearchOpen}
 onSearchOpenChange={setIsSearchOpen}
 selectedProduct={selectedProduct}
 onSelectProduct={handleSelectProduct}
 onClearSelectedProduct={() => {
 setSelectedProduct(null);
 setSearchQuery('');
 }}
 availableUnits={availableUnits}
 selectedUnitOption={selectedUnitOption}
 onUnitChange={handleUnitChange}
 quantity={quantity}
 onQuantityChange={setQuantity}
 availableSenderStock={availableSenderStock}
 onAddItem={handleAddItem}
 />

 {/* Card 3: الأصناف المحددة للتحويل */}
 <TransferSelectedItemsTable
 items={items}
 onUpdateQuantity={handleUpdateItemQuantity}
 onRemoveItem={handleRemoveItem}
 />
 </div>
 </AppShell>
 );
}
'use client';

import React, { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Card } from'@/components/ui/card';
import {
 BarcodeSearchBar,
 BarcodeTableToolbar,
 BarcodeTable,
 BarcodeSettingsModal,
 BarcodePrintLayout,
} from'./_components';
import { useBarcodePrint } from'./_hooks/useBarcodePrint';

function BarcodePrintContent() {
 const {
 orgName,
 currency,
 unitsById,
 printItems,
 filteredItems,
 pagedItems,
 totalLabelsCount,
 currentPage,
 totalPages,
 pageSize,
 setPageSize,
 setCurrentPage,
 tableFilter,
 setTableFilter,
 searchInput,
 setSearchInput,
 searchResults,
 selectedIndex,
 setSelectedIndex,
 stockByProductId,
 isSearching,
 showDropdown,
 setShowDropdown,
 searchContainerRef,
 handleAddItem,
 handleBarcodeKeyDown,
 handleUpdateCopies,
 handleSetCopies,
 handleRemoveItem,
 handleClearAll,
 isSettingsOpen,
 setIsSettingsOpen,
 settings,
 saveSettings,
 flatPrintLabels,
 handlePrint,
 } = useBarcodePrint();

 return (
 <AppShell
 title="طباعة الملصقات"
 subtitle="اختر المنتجات والأصناف وحدد عدد ملصقات الباركود للطباعة بحسب المقاس المطلوب"
 >
 {/* Screen Interactive UI - hidden during print */}
 <div className="no-print space-y-6">
 <BarcodeSearchBar
 searchInput={searchInput}
 setSearchInput={setSearchInput}
 searchResults={searchResults}
 selectedIndex={selectedIndex}
 setSelectedIndex={setSelectedIndex}
 stockByProductId={stockByProductId}
 isSearching={isSearching}
 showDropdown={showDropdown}
 setShowDropdown={setShowDropdown}
 searchContainerRef={searchContainerRef}
 handleAddItem={handleAddItem}
 handleBarcodeKeyDown={handleBarcodeKeyDown}
 unitsById={unitsById}
 currency={currency}
 />

 <Card className="overflow-hidden shadow-xs border-border rounded-xl">
 <BarcodeTableToolbar
 totalLabelsCount={totalLabelsCount}
 printItemsCount={printItems.length}
 pageSize={pageSize}
 setPageSize={setPageSize}
 tableFilter={tableFilter}
 setTableFilter={setTableFilter}
 handlePrint={handlePrint}
 handleClearAll={handleClearAll}
 openSettings={() => setIsSettingsOpen(true)}
 />

 <BarcodeTable
 pagedItems={pagedItems}
 printItemsLength={printItems.length}
 totalLabelsCount={totalLabelsCount}
 currentPage={currentPage}
 totalPages={totalPages}
 setCurrentPage={setCurrentPage}
 handleUpdateCopies={handleUpdateCopies}
 handleSetCopies={handleSetCopies}
 handleRemoveItem={handleRemoveItem}
 currency={currency}
 />
 </Card>
 </div>

 <BarcodeSettingsModal
 isOpen={isSettingsOpen}
 onClose={() => setIsSettingsOpen(false)}
 settings={settings}
 onSave={saveSettings}
 />

 {/* Printable Barcode Stickers - shown ONLY during print */}
 <BarcodePrintLayout
 flatPrintLabels={flatPrintLabels}
 settings={settings}
 orgName={orgName}
 currency={currency}
 />
 </AppShell>
 );
}

export default function BarcodePrintPage() {
 return (
 <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-bold">جاري تحميل صفحة طباعة الملصقات...</div>}>
 <BarcodePrintContent />
 </Suspense>
 );
}
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Plus, Boxes, FileSpreadsheet } from 'lucide-react';

import {
  useItemsCatalog,
  ItemKpiCards,
  ItemFilterTabs,
  ItemAdvancedFilters,
  ItemTableToolbar,
  ItemTable,
  ItemPagination,
  ItemDetailModal,
  OpeningStockModal,
  ItemCardModal,
} from './_components';

function ItemsCatalogContent() {
  const router = useRouter();
  const catalog = useItemsCatalog();

  return (
    <AppShell
      title={catalog.isPharmacy ? "قائمة الأدوية والمخزون" : "قائمة الأصناف والمخزون"}
      subtitle={
        catalog.isPharmacy
          ? "نظام إدارة الصيدليات المحترف (PHARMA ERP) - إدارة الأدوية والمستحضرات، تتبع الصلاحيات والتشغيلات، والرقابة على الأرصدة والجرعات"
          : "إدارة المخزون، تتبع الكميات، والرقابة الحية على الأصناف"
      }
      actions={
        <div className="flex items-center gap-2">
          {/* Header tabs */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-black rounded-lg bg-white dark:bg-[#131b2e] shadow-xs text-slate-900 dark:text-white flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5 text-[#558b2f]" />
              <span>{catalog.isPharmacy ? 'جميع الأدوية' : 'جميع الأصناف'}</span>
            </Button>
            <Link href="/reports/inventory">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-black rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                <span>تقرير المخزون</span>
              </Button>
            </Link>
          </div>

          <Link href="/items/new">
            <Button className="h-10 px-5 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95">
              <Plus className="w-4 h-4" />
              <span>{catalog.isPharmacy ? 'إضافة دواء جديد' : 'إضافة صنف جديد'}</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Top KPI Cards */}
        <ItemKpiCards stats={catalog.stats} isPharmacy={catalog.isPharmacy} />

        {/* 2. Quick Filter Chips & Advanced Filter Toggle */}
        <ItemFilterTabs
          quickFilter={catalog.quickFilter}
          setQuickFilter={catalog.setQuickFilter}
          stats={catalog.stats}
          showAdvancedFilter={catalog.showAdvancedFilter}
          setShowAdvancedFilter={catalog.setShowAdvancedFilter}
        />

        {/* 3. Collapsible Advanced Filters Drawer */}
        {catalog.showAdvancedFilter && (
          <ItemAdvancedFilters
            categories={catalog.categories}
            brands={catalog.brands}
            units={catalog.units}
            warehouses={catalog.warehouses}
            categoryFilter={catalog.categoryFilter}
            setCategoryFilter={catalog.setCategoryFilter}
            brandFilter={catalog.brandFilter}
            setBrandFilter={catalog.setBrandFilter}
            typeFilter={catalog.typeFilter}
            setTypeFilter={catalog.setTypeFilter}
            unitFilter={catalog.unitFilter}
            setUnitFilter={catalog.setUnitFilter}
            taxFilter={catalog.taxFilter}
            setTaxFilter={catalog.setTaxFilter}
            warehouseFilter={catalog.warehouseFilter}
            setWarehouseFilter={catalog.setWarehouseFilter}
            showInactive={catalog.showInactive}
            setShowInactive={catalog.setShowInactive}
            onReset={catalog.resetAdvancedFilters}
            onClose={() => catalog.setShowAdvancedFilter(false)}
          />
        )}

        {/* 4. Table Toolbar */}
        <ItemTableToolbar
          onPrint={() => window.print()}
          onExportCsv={catalog.handleExportCsv}
          visibleColumns={catalog.visibleColumns}
          setVisibleColumns={catalog.setVisibleColumns}
          pageSize={catalog.pageSize}
          setPageSize={catalog.setPageSize}
          density={catalog.density}
          setDensity={catalog.setDensity}
          searchQuery={catalog.searchQuery}
          setSearchQuery={catalog.setSearchQuery}
          totalFiltered={catalog.filteredProducts.length}
        />

        {/* 5. Items Data Table & Pagination Container */}
        <div>
          <ItemTable
            products={catalog.paginatedProducts}
            isLoading={catalog.isLoading}
            selectedIds={catalog.selectedIds}
            toggleSelectAll={catalog.toggleSelectAll}
            toggleSelectRow={catalog.toggleSelectRow}
            visibleColumns={catalog.visibleColumns}
            sortField={catalog.sortField}
            sortDirection={catalog.sortDirection}
            onSort={catalog.toggleSort}
            density={catalog.density}
            brands={catalog.brands}
            unitsById={catalog.unitsById}
            productUnitsByProduct={catalog.productUnitsByProduct}
            stockMap={catalog.stockMap}
            catName={catalog.catName}
            unitName={catalog.unitName}
            onResetFilters={() => {
              catalog.setSearchQuery('');
              catalog.setQuickFilter('all');
              catalog.resetAdvancedFilters();
            }}
            onOpenDetail={(p) => router.push(`/items?id=${p.id}`)}
            onOpenItemCard={(p) => catalog.setItemCardProduct(p)}
            onOpenOpeningStock={(p) => catalog.setOpeningStockProduct(p)}
            onToggleQuickPos={catalog.toggleQuickPos}
            onArchive={catalog.archiveProduct}
            isPharmacy={catalog.isPharmacy}
          />

          {catalog.filteredProducts.length > 0 && (
            <ItemPagination
              currentPage={catalog.currentPage}
              totalPages={catalog.totalPages}
              setCurrentPage={catalog.setCurrentPage}
              pageSize={catalog.pageSize}
              totalFiltered={catalog.filteredProducts.length}
            />
          )}
        </div>
      </div>

      {/* 6. Product Detail Modal (تفاصيل الصنف) */}
      {catalog.detailProduct && (
        <ItemDetailModal
          product={catalog.detailProduct}
          unitName={catalog.unitName}
          catName={catalog.catName}
          brands={catalog.brands}
          warehouses={catalog.warehouses}
          stockLevels={catalog.stockLevels}
          productUnits={catalog.productUnitsByProduct[catalog.detailProduct.id] || []}
          unitsById={catalog.unitsById}
          stockMap={catalog.stockMap}
          onClose={() => router.push('/items')}
        />
      )}

      {/* 7. Item Card Modal (كرت الصنف) */}
      {catalog.itemCardProduct && (
        <ItemCardModal
          product={catalog.itemCardProduct}
          warehouses={catalog.warehouses}
          stockLevels={catalog.stockLevels}
          unitsById={catalog.unitsById}
          productUnits={catalog.productUnitsByProduct[catalog.itemCardProduct.id] || []}
          catName={catalog.catName}
          unitName={catalog.unitName}
          onClose={() => catalog.setItemCardProduct(null)}
          onOpenOpeningStock={(p) => catalog.setOpeningStockProduct(p)}
        />
      )}

      {/* 8. Opening Stock Modal (إضافة كميات افتتاحية) */}
      {catalog.openingStockProduct && (
        <OpeningStockModal
          product={catalog.openingStockProduct}
          warehouses={catalog.warehouses}
          orgId={catalog.orgId}
          unitName={catalog.unitName}
          onClose={() => catalog.setOpeningStockProduct(null)}
          onSuccess={catalog.reload}
        />
      )}
    </AppShell>
  );
}

export default function ItemsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#f4f6f8]">
          <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ItemsCatalogContent />
    </Suspense>
  );
}

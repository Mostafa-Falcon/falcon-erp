'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Printer, Plus } from 'lucide-react';
import { OpeningStockModal } from '@/app/items/_components/OpeningStockModal';
import { useItemCard } from './_components/useItemCard';
import { ItemCardHeaderBanner } from './_components/ItemCardHeaderBanner';
import { ItemCardKpiMetrics } from './_components/ItemCardKpiMetrics';
import { ItemCardTabsNav } from './_components/ItemCardTabsNav';
import { MovementsTab } from './_components/MovementsTab';
import { BatchesTab } from './_components/BatchesTab';
import { SubstitutesTab } from './_components/SubstitutesTab';
import { StocktakeTab } from './_components/StocktakeTab';
import { AddSubstituteModal } from './_components/AddSubstituteModal';

export default function ItemCardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const card = useItemCard(productId);

  if (card.isLoading || !card.product) {
    return (
      <AppShell title="كرت الصنف">
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="كرت الصنف"
      subtitle={card.product.name}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => card.setShowOpeningStockModal(true)}
            className="h-9 px-3 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة رصيد / تشغيلة</span>
          </Button>

          <Link href={`/items/barcode?id=${card.product.id}`} prefetch={false}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-800 gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة باركود</span>
            </Button>
          </Link>

          <Link href="/items">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-800 gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للأصناف</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* 1. Header Navigation Tabs */}
        <ItemCardTabsNav activeTab={card.activeTab} setActiveTab={card.setActiveTab} />

        {/* 2. Top Product Summary Banner */}
        <ItemCardHeaderBanner
          product={card.product}
          category={card.category}
          brand={card.brand}
          baseUName={card.baseUName}
        />

        {/* 3. Four KPI Metric Cards */}
        <ItemCardKpiMetrics
          totalPurchases={card.totalPurchases}
          totalSales={card.totalSales}
          totalDamaged={card.totalDamaged}
          stockBreakdownText={card.stockBreakdownText}
        />

        {/* 4. Tab 1: سجل الحركات */}
        {card.activeTab === 'movements' && (
          <MovementsTab
            density={card.density}
            setDensity={card.setDensity}
            movementColumns={card.movementColumns}
            setMovementColumns={card.setMovementColumns}
            searchQuery={card.searchQuery}
            setSearchQuery={card.setSearchQuery}
            pageSize={card.pageSize}
            setPageSize={card.setPageSize}
            currentPage={card.currentPage}
            setCurrentPage={card.setCurrentPage}
            totalPages={card.totalPages}
            filteredTransactions={card.filteredTransactions}
            paginatedTransactions={card.paginatedTransactions}
            handleTxSort={card.handleTxSort}
            exportMovementsToCsv={card.exportMovementsToCsv}
            baseUName={card.baseUName}
            rowPadding={card.rowPadding}
            creatorName={card.currentUser?.username}
          />
        )}

        {/* 5. Tab 2: التشغيلات والصلاحية */}
        {card.activeTab === 'batches' && (
          <BatchesTab
            density={card.density}
            setDensity={card.setDensity}
            batchColumns={card.batchColumns}
            setBatchColumns={card.setBatchColumns}
            batchSearch={card.batchSearch}
            setBatchSearch={card.setBatchSearch}
            batchPageSize={card.batchPageSize}
            setBatchPageSize={card.setBatchPageSize}
            batchCurrentPage={card.batchCurrentPage}
            setBatchCurrentPage={card.setBatchCurrentPage}
            batchTotalPages={card.batchTotalPages}
            filteredBatches={card.filteredBatches}
            paginatedBatches={card.paginatedBatches}
            handleBatchSort={card.handleBatchSort}
            exportBatchesToCsv={card.exportBatchesToCsv}
            rowPadding={card.rowPadding}
          />
        )}

        {/* 6. Tab 3: بدائل الصنف (بيتم إدخالها بواسطة صاحب المنشأة) */}
        {card.activeTab === 'substitutes' && (
          <SubstitutesTab
            density={card.density}
            setDensity={card.setDensity}
            substituteColumns={card.substituteColumns}
            setSubstituteColumns={card.setSubstituteColumns}
            subSearch={card.subSearch}
            setSubSearch={card.setSubSearch}
            subPageSize={card.subPageSize}
            setSubPageSize={card.setSubPageSize}
            subCurrentPage={card.subCurrentPage}
            setSubCurrentPage={card.setSubCurrentPage}
            subTotalPages={card.subTotalPages}
            filteredSubstitutes={card.filteredSubstitutes}
            paginatedSubstitutes={card.paginatedSubstitutes}
            handleSubSort={card.handleSubSort}
            exportSubstitutesToCsv={card.exportSubstitutesToCsv}
            onOpenAddModal={() => card.setShowAddSubstituteModal(true)}
            onRemoveSubstitute={card.handleRemoveSubstitute}
            baseUName={card.baseUName}
            rowPadding={card.rowPadding}
          />
        )}

        {/* 7. Tab 4: الجرد (بيانات حقيقية من جلسات الجرد) */}
        {card.activeTab === 'stocktake' && (
          <StocktakeTab
            density={card.density}
            setDensity={card.setDensity}
            stocktakeColumns={card.stocktakeColumns}
            setStocktakeColumns={card.setStocktakeColumns}
            stSearch={card.stSearch}
            setStSearch={card.setStSearch}
            stPageSize={card.stPageSize}
            setStPageSize={card.setStPageSize}
            stCurrentPage={card.stCurrentPage}
            setStCurrentPage={card.setStCurrentPage}
            stTotalPages={card.stTotalPages}
            filteredStocktake={card.filteredStocktake}
            paginatedStocktake={card.paginatedStocktake}
            handleStSort={card.handleStSort}
            exportStocktakeToCsv={card.exportStocktakeToCsv}
            baseUName={card.baseUName}
            rowPadding={card.rowPadding}
          />
        )}

        {/* Modal for adding opening stock or new batch */}
        {card.showOpeningStockModal && card.product && (
          <OpeningStockModal
            product={card.product}
            warehouses={card.warehouses}
            orgId={card.orgId}
            unitName={(id) => (id && card.unitsById[id]?.name) || card.baseUName}
            onSuccess={() => {
              card.setShowOpeningStockModal(false);
              card.loadData();
            }}
            onClose={() => card.setShowOpeningStockModal(false)}
          />
        )}

        {/* Modal for adding substitute product by store owner */}
        {card.showAddSubstituteModal && card.product && (
          <AddSubstituteModal
            currentProductId={card.product.id}
            orgId={card.orgId}
            existingSubstituteIds={card.substitutes.map((s) => s.id)}
            categories={card.categories}
            onClose={() => card.setShowAddSubstituteModal(false)}
            onSuccess={() => {
              card.setShowAddSubstituteModal(false);
              card.loadData();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

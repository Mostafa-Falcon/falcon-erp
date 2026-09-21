'use client';

import React from 'react';
import type { ProductFormProps } from './types';
import { useProductForm } from './useProductForm';
import { CustomizationToolbar } from './components/CustomizationToolbar';
import { ItemTypeSelector } from './components/ItemTypeSelector';
import { BasicInfoSection } from './components/BasicInfoSection';
import { ClassificationsSection } from './components/ClassificationsSection';
import { AdvancedSettingsSection } from './components/AdvancedSettingsSection';
import { UnitPricingSection } from './components/UnitPricingSection';
import { WeightPricingSection } from './components/WeightPricingSection';
import { ExpiryBatchesSection } from './components/ExpiryBatchesSection';
import { FormActions } from './components/FormActions';
import { LookupManageModal } from './components/LookupManageModal';

export const ProductForm: React.FC<ProductFormProps> = (props) => {
  const {
    isEdit,
    isPharmacy,
    fileInputRef,
    // Bar
    showSpecs,
    setShowSpecs,
    showAdvanced,
    setShowAdvanced,
    showExpiry,
    setShowExpiry,
    // Lookups
    uniqueBrands,
    uniqueCategories,
    uniqueProductTypes,
    // Basic info
    itemTypeMode,
    setItemTypeMode,
    name,
    setName,
    nameEn,
    setNameEn,
    scientificName,
    setScientificName,
    sku,
    setSku,
    alternateBarcodes,
    shelfLocation,
    setShelfLocation,
    imageUrl,
    setImageUrl,
    categoryId,
    setCategoryId,
    brandId,
    setBrandId,
    productType,
    setProductType,
    // Advanced
    isTaxable,
    setIsTaxable,
    enableMinStockAlert,
    setEnableMinStockAlert,
    minStockAlert,
    setMinStockAlert,
    isActiveForSale,
    setIsActiveForSale,
    isQuickPos,
    setIsQuickPos,
    productNotes,
    setProductNotes,
    // Expiry
    enableExpiryTracking,
    setEnableExpiryTracking,
    batchEntries,
    // Modal
    activeModal,
    setActiveModal,
    modalInputValue,
    setModalInputValue,
    isModalSaving,
    handleModalSave,
    handleDeleteLookupItem,
    // Unit levels
    unitLevels,
    handleAddSmallerUnit,
    updateUnitLevel,
    removeUnitLevel,
    // Weight
    weightUnitName,
    scaleCode,
    setScaleCode,
    weightOpeningStock,
    setWeightOpeningStock,
    weightPurchasePrice,
    setWeightPurchasePrice,
    weightDiscount,
    setWeightDiscount,
    weightDiscountType,
    setWeightDiscountType,
    weightSalePrice,
    setWeightSalePrice,
    weightOldSalePrice,
    setWeightOldSalePrice,
    weightNewSalePrice,
    setWeightNewSalePrice,
    weightDualPricing,
    setWeightDualPricing,
    canUploadProductImages,
    // Actions & state
    isSaving,
    handleGenerateRandomBarcode,
    handleAddAlternateBarcode,
    handleUpdateAlternateBarcode,
    handleRemoveAlternateBarcode,
    handleImageUpload,
    handleAddBatch,
    handleUpdateBatch,
    handleRemoveBatch,
    handleResetForm,
    handleSubmit,
    onCancel,
  } = useProductForm(props);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4" dir="rtl">
      {/* 1. شريط تخصيص واجهة الإدخال */}
      <CustomizationToolbar
        showSpecs={showSpecs}
        setShowSpecs={setShowSpecs}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        showExpiry={showExpiry}
        setShowExpiry={setShowExpiry}
        setEnableExpiryTracking={setEnableExpiryTracking}
        isPharmacy={isPharmacy}
      />

      {/* 2. نوع الصنف وطبيعة البيع (قطع أو وزن بالميزان) */}
      <ItemTypeSelector
        itemTypeMode={itemTypeMode}
        setItemTypeMode={setItemTypeMode}
        isPharmacy={isPharmacy}
      />

      {/* 3. كرت البيانات الأساسية والباركود والصورة */}
      <BasicInfoSection
        showSpecs={showSpecs}
        fileInputRef={fileInputRef}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        handleImageUpload={handleImageUpload}
        canUploadProductImages={canUploadProductImages}
        name={name}
        setName={setName}
        scientificName={scientificName}
        setScientificName={setScientificName}
        nameEn={nameEn}
        setNameEn={setNameEn}
        sku={sku}
        setSku={setSku}
        handleGenerateRandomBarcode={handleGenerateRandomBarcode}
        alternateBarcodes={alternateBarcodes}
        handleAddAlternateBarcode={handleAddAlternateBarcode}
        handleUpdateAlternateBarcode={handleUpdateAlternateBarcode}
        handleRemoveAlternateBarcode={handleRemoveAlternateBarcode}
        shelfLocation={shelfLocation}
        setShelfLocation={setShelfLocation}
        isPharmacy={isPharmacy}
      />

      {/* 4. الشاشة الوسطى: التصنيفات والإعدادات (يسار) والوحدات والتسعير (يمين) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* العمود الأيسر: التصنيفات + الإعدادات المتقدمة (إن فُعّلت) */}
        <div className="lg:col-span-4 space-y-4">
          <ClassificationsSection
            brandId={brandId}
            setBrandId={setBrandId}
            uniqueBrands={uniqueBrands}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            uniqueCategories={uniqueCategories}
            productType={productType}
            setProductType={setProductType}
            uniqueProductTypes={uniqueProductTypes}
            setActiveModal={setActiveModal}
            isPharmacy={isPharmacy}
          />

          {showAdvanced && (
            <AdvancedSettingsSection
              isTaxable={isTaxable}
              setIsTaxable={setIsTaxable}
              enableMinStockAlert={enableMinStockAlert}
              setEnableMinStockAlert={setEnableMinStockAlert}
              minStockAlert={minStockAlert}
              setMinStockAlert={setMinStockAlert}
              isActiveForSale={isActiveForSale}
              setIsActiveForSale={setIsActiveForSale}
              isQuickPos={isQuickPos}
              setIsQuickPos={setIsQuickPos}
              productNotes={productNotes}
              setProductNotes={setProductNotes}
            />
          )}
        </div>

        {/* العمود الأيمن: كروت تسعير الوحدات (للقطع) أو تسعير الوزن (للميزان) */}
        <div className="lg:col-span-8 space-y-4">
          {itemTypeMode === 'unit' ? (
            <UnitPricingSection
              unitLevels={unitLevels}
              handleAddSmallerUnit={handleAddSmallerUnit}
              updateUnitLevel={updateUnitLevel}
              removeUnitLevel={removeUnitLevel}
              isPharmacy={isPharmacy}
            />
          ) : (
            <WeightPricingSection
              weightUnitName={weightUnitName}
              scaleCode={scaleCode}
              setScaleCode={setScaleCode}
              weightOpeningStock={weightOpeningStock}
              setWeightOpeningStock={setWeightOpeningStock}
              weightPurchasePrice={weightPurchasePrice}
              setWeightPurchasePrice={setWeightPurchasePrice}
              weightDualPricing={weightDualPricing}
              setWeightDualPricing={setWeightDualPricing}
              weightDiscount={weightDiscount}
              setWeightDiscount={setWeightDiscount}
              weightDiscountType={weightDiscountType}
              setWeightDiscountType={setWeightDiscountType}
              weightOldSalePrice={weightOldSalePrice}
              setWeightOldSalePrice={setWeightOldSalePrice}
              weightNewSalePrice={weightNewSalePrice}
              setWeightNewSalePrice={setWeightNewSalePrice}
              weightSalePrice={weightSalePrice}
              setWeightSalePrice={setWeightSalePrice}
            />
          )}
        </div>
      </div>

      {/* 5. كرت تواريخ الصلاحية والتشغيلات (يظهر فقط إذا فُعّل التتبع) */}
      {showExpiry && (
        <ExpiryBatchesSection
          enableExpiryTracking={enableExpiryTracking}
          setEnableExpiryTracking={setEnableExpiryTracking}
          batchEntries={batchEntries}
          itemTypeMode={itemTypeMode}
          unitLevels={unitLevels}
          handleAddBatch={handleAddBatch}
          handleUpdateBatch={handleUpdateBatch}
          handleRemoveBatch={handleRemoveBatch}
          isPharmacy={isPharmacy}
        />
      )}

      {/* 6. شريط الإجراءات السفلي */}
      <FormActions
        isSaving={isSaving}
        onCancel={onCancel}
        handleResetForm={handleResetForm}
        isPharmacy={isPharmacy}
      />

      {/* 7. نافذة الإضافة والإدارة المنبثقة للتصنيفات والشركات والأنواع */}
      <LookupManageModal
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        modalInputValue={modalInputValue}
        setModalInputValue={setModalInputValue}
        isModalSaving={isModalSaving}
        handleModalSave={handleModalSave}
        handleDeleteLookupItem={handleDeleteLookupItem}
        uniqueBrands={uniqueBrands}
        uniqueCategories={uniqueCategories}
        uniqueProductTypes={uniqueProductTypes}
      />
    </form>
  );
};

export default ProductForm;
export * from './types';
export * from './utils';
export { useProductForm } from './useProductForm';

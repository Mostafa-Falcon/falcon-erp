import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { db } from '@/core/db/app_database';
import { StockTransferRepository } from '@/modules/inventory/stock_transfer_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { Branch, Product, Unit, ProductUnit } from '@/types';
import { TransferDraftItem, SelectableUnitOption } from '../types';

export function useNewStockTransfer() {
  const router = useRouter();
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || 'org-default';

  // Form State
  const [transferNumber, setTransferNumber] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferDraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [availableUnits, setAvailableUnits] = useState<SelectableUnitOption[]>([]);
  const [selectedUnitOption, setSelectedUnitOption] = useState<SelectableUnitOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [availableSenderStock, setAvailableSenderStock] = useState<number>(0);

  // Initialize branches and next transfer number
  useEffect(() => {
    async function init() {
      try {
        const nextNo = await StockTransferRepository.getNextTransferNumber(orgId);
        setTransferNumber(nextNo);

        // 1. Fetch real branches created in Settings for this org
        let branchList = await db.branches.where('org_id').equals(orgId).toArray();
        if (branchList.length === 0) {
          branchList = await db.branches.toArray();
        }

        setBranches(branchList);

        // 2. Sender branch MUST be the currently active branch of the business owner
        const currentBid = activeBranchId || currentUser?.branch_id;
        let activeBranch: Branch | null = null;
        if (currentBid) {
          activeBranch = branchList.find((b: Branch) => b.id === currentBid) || null;
        }
        if (!activeBranch) {
          activeBranch = branchList.find((b: Branch) => b.is_main) || branchList[0] || null;
        }
        setCurrentBranch(activeBranch);

        // 3. Destination branches: Only OTHER branches added in Settings
        const destinationBranches = branchList.filter(
          (b: Branch) => b.id !== activeBranch?.id && b.is_active !== false
        );

        if (destinationBranches.length > 0) {
          setTargetBranchId(destinationBranches[0].id);
        } else {
          setTargetBranchId('');
        }
      } catch (err) {
        console.error('Failed to init new stock transfer:', err);
      }
    }
    init();
  }, [orgId, activeBranchId, currentUser]);

  // Product Search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase().trim();
      const allProducts = await db.products.toArray();
      const filtered = allProducts
        .filter(
          (p: Product) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.scientific_name && p.scientific_name.toLowerCase().includes(q))
        )
        .slice(0, 10);
      setSearchResults(filtered);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When a product is selected, load units and available stock in sender branch
  const handleSelectProduct = useCallback(async (prod: Product) => {
    setSelectedProduct(prod);
    setSearchQuery(prod.name);
    setIsSearchOpen(false);

    // Load available units (base unit + packaging levels)
    const allUnits = await db.units.toArray();
    const unitMap = new Map<string, Unit>(allUnits.map((u: Unit) => [u.id, u]));

    const prodUnits = await db.product_units.where('product_id').equals(prod.id).toArray();
    const options: SelectableUnitOption[] = [];

    // Base unit option
    const baseUnitObj = unitMap.get(prod.base_unit_id);
    options.push({
      id: prod.base_unit_id || 'base',
      unitId: prod.base_unit_id || 'pcs',
      unitName: baseUnitObj?.name || 'قطعة',
      conversionFactor: 1,
    });

    // Sub/higher level units
    for (const pu of prodUnits) {
      const uObj = unitMap.get(pu.unit_id);
      options.push({
        id: pu.id,
        unitId: pu.unit_id,
        unitName: uObj?.name || `مستوى (${pu.conversion_factor})`,
        conversionFactor: pu.conversion_factor || 1,
      });
    }

    setAvailableUnits(options);
    setSelectedUnitOption(options[0]);

    // Calculate available sender stock in base units
    if (currentBranch) {
      const whId = await StockTransferRepository.ensureBranchWarehouse(currentBranch.id, orgId);
      const stockLevel = await db.stock_levels.get(`${whId}_${prod.id}`);
      const totalStock = stockLevel
        ? stockLevel.quantity - (stockLevel.reserved_quantity || 0)
        : 0;
      setAvailableSenderStock(Math.max(0, totalStock));
    } else {
      setAvailableSenderStock(0);
    }

    setQuantity(1);
  }, [currentBranch, orgId]);

  // Handle unit change
  const handleUnitChange = useCallback((unitId: string) => {
    const found = availableUnits.find((u) => u.unitId === unitId || u.id === unitId);
    if (found) {
      setSelectedUnitOption(found);
    }
  }, [availableUnits]);

  // Add line item
  const handleAddItem = useCallback(() => {
    if (!selectedProduct || !selectedUnitOption) return;

    const baseQty = quantity * selectedUnitOption.conversionFactor;
    if (baseQty > availableSenderStock && availableSenderStock > 0) {
      if (!confirm(`الكمية المطلوبة (${baseQty}) أكبر من الرصيد المتوفر في الفرع الحالي (${availableSenderStock}). هل تريد المتابعة على أي حال؟`)) {
        return;
      }
    }

    const existingIdx = items.findIndex(
      (it) => it.productId === selectedProduct.id && it.unitId === selectedUnitOption.unitId
    );

    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += quantity;
      updated[existingIdx].baseQuantity = updated[existingIdx].quantity * updated[existingIdx].unitFactor;
      setItems(updated);
    } else {
      const newItem: TransferDraftItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        barcode: selectedProduct.sku || '',
        unitId: selectedUnitOption.unitId,
        unit: selectedUnitOption.unitName,
        unitFactor: selectedUnitOption.conversionFactor,
        quantity,
        baseQuantity: baseQty,
        costPrice: selectedProduct.purchase_price || 0,
        availableStock: availableSenderStock,
        unitCost: (selectedProduct.purchase_price || 0) * selectedUnitOption.conversionFactor,
      };
      setItems([...items, newItem]);
    }

    // Reset selector
    setSelectedProduct(null);
    setSearchQuery('');
    setQuantity(1);
    setAvailableUnits([]);
    setSelectedUnitOption(null);
    setAvailableSenderStock(0);
  }, [selectedProduct, selectedUnitOption, quantity, availableSenderStock, items]);

  // Remove line item
  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Update line item quantity
  const handleUpdateItemQuantity = useCallback((idx: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[idx].quantity = newQty;
      updated[idx].baseQuantity = newQty * updated[idx].unitFactor;
      return updated;
    });
  }, []);

  // Submit transfer form
  const handleSubmit = useCallback(async () => {
    if (!currentBranch) {
      toast.error('لم يتم تحديد فرع الإرسال (الفرع الحالي)');
      return;
    }
    if (!targetBranchId) {
      toast.error('برجاء اختيار الفرع المستلم. إذا لم يكن هناك فروع أخرى، قم بإضافتها أولاً من صفحة الإعدادات.');
      return;
    }
    if (targetBranchId === currentBranch.id) {
      toast.error('لا يمكن التحويل لنفس الفرع! برجاء اختيار فرع مستلم مختلف.');
      return;
    }
    if (items.length === 0) {
      toast.error('برجاء إضافة صنف واحد على الأقل للتحويل');
      return;
    }

    setIsSubmitting(true);
    try {
      const fromWhId = await StockTransferRepository.ensureBranchWarehouse(currentBranch.id, orgId);
      const toWhId = await StockTransferRepository.ensureBranchWarehouse(targetBranchId, orgId);

      const result = await StockTransferRepository.createTransfer({
        orgId,
        fromWarehouseId: fromWhId,
        toWarehouseId: toWhId,
        fromBranchId: currentBranch.id,
        toBranchId: targetBranchId,
        transferNo: transferNumber,
        notes: notes.trim() || undefined,
        userId: currentUser?.id || 'user-admin',
        items: items.map((it) => ({
          productId: it.productId,
          unitId: it.unitId,
          conversionFactor: it.unitFactor,
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
      });

      if (!result.success) {
        toast.error(result.error || 'فشل إنشاء طلب التحويل');
        return;
      }

      toast.success('تم إنشاء طلب التحويل المخزني بنجاح');
      router.push('/inventory/transfer');
    } catch (err: any) {
      console.error('Failed to create stock transfer:', err);
      toast.error(err.message || 'حدث خطأ أثناء حفظ طلب التحويل');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentBranch, targetBranchId, items, orgId, transferNumber, notes, router, currentUser]);

  return {
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
  };
}
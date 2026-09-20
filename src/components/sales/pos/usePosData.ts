import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { ScaleManager, ScaleConfig, DEFAULT_SCALE_CONFIG } from '@/lib/scale_manager';
import type {
  Warehouse,
  Treasury,
  Contact,
  Product,
  Unit,
  ProductBatch,
  User as UserType,
} from '@/types';
import type { UnitOption } from './types';

export function usePosData() {
  const { currentUser, activeBranchId, setActiveBranchId, activeShift, setActiveShift } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [resolvedBranchId, setResolvedBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [treasuryId, setTreasuryId] = useState('');
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [unitOptions, setUnitOptions] = useState<Record<string, UnitOption[]>>({});
  const [stock, setStock] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<Record<string, ProductBatch[]>>({});
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scaleConfig, setScaleConfig] = useState<ScaleConfig>(DEFAULT_SCALE_CONFIG);
  const [enableTax, setEnableTax] = useState(false);
  const [vatRate, setVatRate] = useState(14);
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    try {
      const { db } = await import('@/core/db/app_database');
      const { v4: uuidv4 } = await import('uuid');

      // 1. Resolve branch if not yet determined
      let effectiveBranchId = branchId || resolvedBranchId;
      if (!effectiveBranchId && orgId) {
        const firstBranch = await db.branches.where('org_id').equals(orgId).first();
        if (firstBranch) {
          effectiveBranchId = firstBranch.id;
          setResolvedBranchId(firstBranch.id);
          setActiveBranchId(firstBranch.id);
          setBranchName(firstBranch.name);
        }
      }

      const [whs, tres, custs, prods, unts, pUnits, levels, bchs, usrs, currentBranch, appSettings] = await Promise.all([
        effectiveBranchId
          ? db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active && w.branch_id === effectiveBranchId).toArray()
          : db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
        effectiveBranchId
          ? db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active && (!t.branch_id || t.branch_id === effectiveBranchId)).toArray()
          : db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
        ContactsRepository.getContacts(orgId),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active).toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
        db.product_units.toArray(),
        db.stock_levels.toArray(),
        db.product_batches.toArray(),
        db.users.where('org_id').equals(orgId).toArray(),
        effectiveBranchId ? db.branches.get(effectiveBranchId) : Promise.resolve(undefined),
        db.app_settings.where('org_id').equals(orgId).toArray(),
      ]);

      const enableTaxSetting = appSettings.find((s) => s.id === 'enable_tax');
      const vatRateSetting = appSettings.find((s) => s.id === 'vat_rate');
      const taxIncSetting = appSettings.find((s) => s.id === 'is_tax_inclusive');

      setEnableTax(enableTaxSetting ? enableTaxSetting.value === 'true' : false);
      setVatRate(vatRateSetting ? parseFloat(vatRateSetting.value) || 14 : 14);
      setIsTaxInclusive(taxIncSetting ? taxIncSetting.value === 'true' : false);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      let kgUnit = unts.find((u) => u.name === 'كيلوجرام' || u.symbol === 'كجم');
      let gramUnit = unts.find((u) => u.name === 'جرام' || u.symbol === 'جرام' || u.symbol === 'جم');

      if (!kgUnit && orgId) {
        kgUnit = {
          id: 'unit_kg_default',
          org_id: orgId,
          name: 'كيلوجرام',
          symbol: 'كجم',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending',
        };
        umap[kgUnit.id] = kgUnit;
      }
      if (!gramUnit && orgId) {
        gramUnit = {
          id: 'unit_gram_default',
          org_id: orgId,
          name: 'جرام',
          symbol: 'جم',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending',
        };
        umap[gramUnit.id] = gramUnit;
      }
      if (kgUnit) umap[kgUnit.id] = kgUnit;
      if (gramUnit) umap[gramUnit.id] = gramUnit;

      const opts: Record<string, UnitOption[]> = {};
      for (const p of prods) {
        const list: UnitOption[] = [
          { unitId: p.base_unit_id, factor: 1, price: p.sale_price },
        ];
        for (const pu of pUnits.filter((x) => x.product_id === p.id)) {
          const basePrice = pu.sale_price ?? p.sale_price;
          list.push({
            unitId: pu.unit_id,
            factor: pu.conversion_factor || 1,
            price: basePrice !== undefined && pu.sale_price !== undefined ? pu.sale_price : (p.sale_price || 0) * (pu.conversion_factor || 1),
          });
        }

        // Auto-inject weight units (kg <-> gram) with dynamic factor 1/1000
        const baseUnitName = umap[p.base_unit_id]?.name || '';
        const isWeight =
          p.measurement_type === 'weight' ||
          baseUnitName.includes('كيلو') ||
          baseUnitName.includes('جرام') ||
          Boolean(p.scale_code);

        if (isWeight && kgUnit && gramUnit) {
          // If base unit is kg and gram is not in list
          if ((p.base_unit_id === kgUnit.id || baseUnitName.includes('كيلو')) && !list.some((o) => o.unitId === gramUnit!.id)) {
            list.push({
              unitId: gramUnit.id,
              factor: 0.001,
              price: Number(((p.sale_price || 0) / 1000).toFixed(4)),
            });
          }
          // If base unit is gram and kg is not in list
          else if ((p.base_unit_id === gramUnit.id || baseUnitName.includes('جرام')) && !list.some((o) => o.unitId === kgUnit!.id)) {
            list.push({
              unitId: kgUnit.id,
              factor: 1000,
              price: Number(((p.sale_price || 0) * 1000).toFixed(2)),
            });
          }
        }

        opts[p.id] = list;
      }

      // Auto-heal Treasuries if empty
      let activeTreasuries = tres;
      if (activeTreasuries.length === 0 && orgId) {
        const defaultTreasury = await TreasuryRepository.ensureDefaultTreasury({
          orgId,
          branchId: effectiveBranchId || undefined,
        });
        activeTreasuries = [defaultTreasury];
      }

      setWarehouses(whs);
      setTreasuries(activeTreasuries);
      setCustomers(custs);
      setProducts(prods);
      setUnitsById(umap);
      setUnitOptions(opts);
      setUsers(usrs);
      if (currentBranch) {
        setBranchName(currentBranch.name);
      }

      if (whs.length > 0) setWarehouseId(whs[0].id);
      if (activeTreasuries.length > 0) setTreasuryId(activeTreasuries.find((t) => t.is_default)?.id || activeTreasuries[0].id);

      const defW = whs[0]?.id || '';
      const stockMap: Record<string, number> = {};
      for (const l of levels) {
        if (l.warehouse_id === defW) stockMap[l.product_id] = l.quantity;
      }
      setStock(stockMap);

      const batchMap: Record<string, ProductBatch[]> = {};
      for (const b of bchs) {
        if (b.warehouse_id !== defW) continue;
        if (b.current_quantity <= 0) continue; // Filter out zero/exhausted batches
        (batchMap[b.product_id] = batchMap[b.product_id] || []).push(b);
      }
      // Sort batches by FEFO (First-Expired, First-Out)
      for (const pId in batchMap) {
        batchMap[pId].sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return a.expiry_date.localeCompare(b.expiry_date);
        });
      }
      setBatches(batchMap);

      // Scale config
      try {
        const sc = await ScaleManager.getConfig(orgId);
        setScaleConfig(sc);
      } catch (scErr) {
        console.warn('Could not load scale config:', scErr);
      }

      // Check current open shift
      if (currentUser?.id) {
        const currentOpen = await SalesRepository.getCurrentOpenShift(currentUser.id, effectiveBranchId, orgId);
        if (currentOpen) {
          setActiveShift(currentOpen);
        } else {
          setActiveShift(null);
        }
      }
    } catch (err) {
      console.error('POS Load err:', err);
      toast.error('حدث خطأ أثناء تحميل بيانات نقطة البيع.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, branchId]);

  return {
    currentUser,
    orgId,
    branchId: branchId || resolvedBranchId,
    branchName,
    activeShift,
    setActiveShift,
    warehouses,
    warehouseId,
    setWarehouseId,
    treasuries,
    treasuryId,
    setTreasuryId,
    customers,
    setCustomers,
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
  };
}

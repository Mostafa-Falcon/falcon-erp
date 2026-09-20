'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProductForm } from '@/components/inventory/ProductForm';
import { useSessionStore } from '@/core/state/useSessionStore';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { ensureCleanLookupState } from '@/core/db/seed';
import type { Product, ProductCategory, ProductBrand, ProductTypeItem, ProductUnit, Unit, Warehouse } from '@/types';

function NewItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { currentUser } = useSessionStore();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [initial, setInitial] = useState<Product | undefined>();
  const [initialUnits, setInitialUnits] = useState<ProductUnit[]>([]);
  const [isPharmacy, setIsPharmacy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentUser?.org_id) return;
    let mounted = true;

    const load = async () => {
      try {
        await ensureCleanLookupState();
        const { db } = await import('@/core/db/app_database');
        const [cats, brs, ptypes, uns, whs, org] = await Promise.all([
          ProductRepository.getCategories(currentUser.org_id),
          ProductRepository.getBrands(currentUser.org_id),
          ProductRepository.getProductTypes(currentUser.org_id),
          ProductRepository.getAllUnits(currentUser.org_id),
          ProductRepository.getAllWarehouses(currentUser.org_id),
          db.organizations.get(currentUser.org_id),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setBrands(brs);
        setProductTypes(ptypes);
        setUnits(uns);
        setWarehouses(whs);
        if (org && org.activity_type === 'pharmacy') {
          setIsPharmacy(true);
        }

        if (editId) {
          const product = await ProductRepository.getById(editId);
          if (!product || product.org_id !== currentUser.org_id) {
            setNotFound(true);
          } else {
            const prodUnits = await ProductRepository.getProductUnits(editId);
            setInitial(product);
            setInitialUnits(prodUnits);
          }
        }
      } catch (err) {
        console.error('Load item form error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, editId]);

  if (notFound) {
    return (
      <AppShell title={isPharmacy ? "الدواء غير موجود" : "الصنف غير موجود"} subtitle="ربما تم حذف هذا السجل أو أنك لا تملك صلاحية الوصول له">
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-10 text-center">
          <button
            onClick={() => router.push('/items')}
            className="text-xs font-bold text-[#558b2f] hover:underline cursor-pointer"
          >
            {isPharmacy ? 'العودة لدليل الأدوية' : 'العودة لدليل الأصناف'}
          </button>
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title={isPharmacy ? (editId ? 'تعديل الدواء' : 'إضافة دواء جديد') : (editId ? 'تعديل الصنف' : 'إضافة صنف جديد')}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        isPharmacy
          ? editId ? 'تعديل بيانات الدواء' : 'إضافة دواء / مستحضر جديد'
          : editId ? 'تعديل الصنف' : 'إضافة صنف جديد'
      }
      subtitle={
        isPharmacy
          ? editId ? 'تعديل بيانات الدواء والمادة الفعالة والوحدات والتسعير' : 'إنشاء دواء جديد بالعلبة والشريط والقرص مع المادة الفعالة وتاريخ الصلاحية'
          : editId ? 'تعديل بيانات ووحدات الصنف الموجود' : 'إنشاء صنف جديد في دليل الأصناف مع الوحدات والتسعير'
      }
    >
      <ProductForm
        orgId={currentUser!.org_id!}
        categories={categories}
        brands={brands}
        productTypes={productTypes}
        units={units}
        warehouses={warehouses}
        initial={initial}
        initialUnits={initialUnits}
        isPharmacy={isPharmacy}
        onSaved={() => {
          router.push('/items');
          router.refresh();
        }}
        onCancel={() => router.back()}
      />
    </AppShell>
  );
}

export default function NewItemPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#f4f6f8]">
          <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewItemContent />
    </Suspense>
  );
}
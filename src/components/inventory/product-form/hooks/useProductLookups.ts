import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ProductRepository } from '@/modules/inventory/product_repository';
import type { ProductCategory, ProductBrand, ProductTypeItem } from '@/types';
import type { ModalType } from '../types';

interface UseProductLookupsProps {
    orgId: string;
    brands: ProductBrand[];
    categories: ProductCategory[];
    productTypes?: ProductTypeItem[];
    brandId: string;
    setBrandId: (val: string) => void;
    categoryId: string;
    setCategoryId: (val: string) => void;
    productType: string;
    setProductType: (val: string) => void;
}

export function useProductLookups({
    orgId,
    brands,
    categories,
    productTypes = [],
    brandId,
    setBrandId,
    categoryId,
    setCategoryId,
    productType,
    setProductType,
}: UseProductLookupsProps) {
    const [localBrands, setLocalBrands] = useState<ProductBrand[]>(brands);
    const [localCategories, setLocalCategories] = useState<ProductCategory[]>(categories);
    const [localProductTypes, setLocalProductTypes] = useState<ProductTypeItem[]>(productTypes || []);

    useEffect(() => {
        setLocalBrands(brands || []);
    }, [brands]);

    useEffect(() => {
        setLocalCategories(categories || []);
    }, [categories]);

    useEffect(() => {
        setLocalProductTypes(productTypes || []);
    }, [productTypes]);

    const uniqueProductTypes = useMemo(() => {
        const map = new Map<string, ProductTypeItem>();
        for (const item of localProductTypes) {
            const key = item.name.trim();
            if (!map.has(key)) map.set(key, item);
        }
        return Array.from(map.values());
    }, [localProductTypes]);

    const uniqueBrands = useMemo(() => {
        const map = new Map<string, ProductBrand>();
        for (const item of localBrands) {
            const key = item.name.trim();
            if (!map.has(key)) map.set(key, item);
        }
        return Array.from(map.values());
    }, [localBrands]);

    const uniqueCategories = useMemo(() => {
        const map = new Map<string, ProductCategory>();
        for (const item of localCategories) {
            const key = item.name.trim();
            if (!map.has(key)) map.set(key, item);
        }
        return Array.from(map.values());
    }, [localCategories]);

    // حالة النافذة المنبثقة (Modal Dialog) للإضافة والإدارة
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalInputValue, setModalInputValue] = useState('');
    const [isModalSaving, setIsModalSaving] = useState(false);

    const handleModalSave = async () => {
        if (!modalInputValue.trim()) return;
        const val = modalInputValue.trim();
        setIsModalSaving(true);
        try {
            if (activeModal === 'brand') {
                const created = await ProductRepository.createBrand(val, orgId);
                setLocalBrands((prev) => [...prev, created]);
                setBrandId(created.id);
                toast.success('تمت إضافة الشركة / الماركة بنجاح');
            } else if (activeModal === 'category') {
                const created = await ProductRepository.createCategory(val, orgId);
                setLocalCategories((prev) => [...prev, created]);
                setCategoryId(created.id);
                toast.success('تمت إضافة المجموعة / التصنيف بنجاح');
            } else if (activeModal === 'product_type') {
                const created = await ProductRepository.createProductType(val, orgId);
                setLocalProductTypes((prev) => [...prev, created]);
                setProductType(created.name);
                toast.success('تمت إضافة نوع المنتج بنجاح');
            }
            setModalInputValue('');
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            setIsModalSaving(false);
        }
    };

    const handleDeleteLookupItem = async (
        type: 'brand' | 'category' | 'product_type',
        id: string,
        deletedName: string
    ) => {
        try {
            if (type === 'brand') {
                await ProductRepository.deleteBrand(id);
                setLocalBrands((prev) => prev.filter((x) => x.id !== id));
                if (brandId === id) setBrandId('none');
                toast.info(`تم حذف"${deletedName}"`);
            } else if (type === 'category') {
                await ProductRepository.deleteCategory(id);
                setLocalCategories((prev) => prev.filter((x) => x.id !== id));
                if (categoryId === id) setCategoryId('none');
                toast.info(`تم حذف"${deletedName}"`);
            } else if (type === 'product_type') {
                await ProductRepository.deleteProductType(id);
                setLocalProductTypes((prev) => prev.filter((x) => x.id !== id));
                if (productType === deletedName) setProductType('none');
                toast.info(`تم حذف"${deletedName}"`);
            }
        } catch (err) {
            console.error(err);
            toast.error('تعذر حذف العنصر');
        }
    };

    return {
        uniqueBrands,
        uniqueCategories,
        uniqueProductTypes,
        activeModal,
        setActiveModal,
        modalInputValue,
        setModalInputValue,
        isModalSaving,
        handleModalSave,
        handleDeleteLookupItem,
    };
}
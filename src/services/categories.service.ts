import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from '@/config/categories-seed';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { CategoryRecord, SubcategoryRecord } from '@/types/domain';

export interface CategoriesSnapshot {
  categories: CategoryRecord[];
  subcategories: SubcategoryRecord[];
  source: 'firestore' | 'seed_fallback';
}

export async function fetchActiveCategoriesAndSubcategories(): Promise<CategoriesSnapshot> {
  const services = getFirebaseServices();
  if (!services) {
    return {
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
      source: 'seed_fallback',
    };
  }

  try {
    const catSnap = await getDocs(
      query(
        collection(services.db, 'categories'),
        where('active', '==', true),
        orderBy('sortOrder', 'asc')
      )
    );
    const subSnap = await getDocs(
      query(
        collection(services.db, 'subcategories'),
        where('active', '==', true),
        orderBy('sortOrder', 'asc')
      )
    );

    if (catSnap.empty) {
      return {
        categories: INITIAL_CATEGORIES,
        subcategories: INITIAL_SUBCATEGORIES,
        source: 'seed_fallback',
      };
    }

    const categories = catSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CategoryRecord, 'id'>) }));
    const subcategories = subSnap.empty
      ? INITIAL_SUBCATEGORIES
      : subSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubcategoryRecord, 'id'>) }));

    return {
      categories,
      subcategories,
      source: 'firestore',
    };
  } catch {
    return {
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
      source: 'seed_fallback',
    };
  }
}

export async function fetchAllCategoriesForAdmin(): Promise<{
  categories: CategoryRecord[];
  subcategories: SubcategoryRecord[];
}> {
  const services = getFirebaseServices();
  if (!services) {
    return { categories: [], subcategories: [] };
  }

  const [catSnap, subSnap] = await Promise.all([
    getDocs(query(collection(services.db, 'categories'), orderBy('sortOrder', 'asc'))),
    getDocs(query(collection(services.db, 'subcategories'), orderBy('sortOrder', 'asc'))),
  ]);

  return {
    categories: catSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CategoryRecord, 'id'>) })),
    subcategories: subSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubcategoryRecord, 'id'>) })),
  };
}

export async function saveCategoryAdmin(category: CategoryRecord): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await setDoc(doc(services.db, 'categories', category.id), category, { merge: true });
}

export async function saveSubcategoryAdmin(subcategory: SubcategoryRecord): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await setDoc(doc(services.db, 'subcategories', subcategory.id), subcategory, { merge: true });
}

export async function toggleCategoryStatusAdmin(categoryId: string, active: boolean): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'categories', categoryId), {
    active,
    updatedAt: new Date().toISOString(),
  });
}

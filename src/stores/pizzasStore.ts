import { create } from 'zustand';
import { productsService, categoriesService, extrasService } from '../services/supabaseService';
import type { Product, Category, Extra } from '../types';

interface ProductsState {
  pizzas: Product[];
  allPizzas: Product[];
  categories: Category[];
  extras: Extra[];
  allExtras: Extra[];
  loading: boolean;
  initialized: boolean;
  initPizzasStore: () => () => void;
}

export const usePizzasStore = create<ProductsState>((set, get) => ({
  pizzas: [],
  allPizzas: [],
  categories: [],
  extras: [],
  allExtras: [],
  loading: true,
  initialized: false,

  initPizzasStore: () => {
    if (get().initialized) return () => {};
    set({ initialized: true });

    const unsubActiveProducts = productsService.subscribeToActiveProducts((products) => {
      set({ pizzas: products, loading: false });
    });

    const unsubAllProducts = productsService.subscribeToAllProducts((allProducts) => {
      set({ allPizzas: allProducts });
    });

    const unsubCategories = categoriesService.subscribeToCategories((categories) => {
      set({ categories });
    });

    const unsubActiveExtras = extrasService.subscribeToActiveExtras((extras) => {
      set({ extras });
    });

    const unsubAllExtras = extrasService.subscribeToAllExtras((allExtras) => {
      set({ allExtras });
    });

    return () => {
      unsubActiveProducts();
      unsubAllProducts();
      unsubCategories();
      unsubActiveExtras();
      unsubAllExtras();
      set({ initialized: false });
    };
  }
}));

// Alias pour rétrocompatibilité
export const useProductsStore = usePizzasStore;

import { create } from 'zustand';
import { productsService, categoriesService } from '../services/supabaseService';
import type { Product, Category } from '../types';

interface ProductsState {
  pizzas: Product[];
  allPizzas: Product[];
  categories: Category[];
  loading: boolean;
  initialized: boolean;
  initPizzasStore: () => () => void;
}

export const usePizzasStore = create<ProductsState>((set, get) => ({
  pizzas: [],
  allPizzas: [],
  categories: [],
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

    return () => {
      unsubActiveProducts();
      unsubAllProducts();
      unsubCategories();
      set({ initialized: false });
    };
  }
}));

// Alias pour rétrocompatibilité
export const useProductsStore = usePizzasStore;

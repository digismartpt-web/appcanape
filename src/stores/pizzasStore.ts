import { create } from 'zustand';
import { productsService, categoriesService, productImagesService } from '../services/supabaseService';
import type { Product, Category, ProductImage } from '../types';

interface ProductsState {
  pizzas: Product[];
  allPizzas: Product[];
  categories: Category[];
  productImages: Record<string, ProductImage[]>;
  loading: boolean;
  initialized: boolean;
  refreshProductImages: () => Promise<void>;
  initPizzasStore: () => () => void;
}

export const usePizzasStore = create<ProductsState>((set, get) => ({
  pizzas: [],
  allPizzas: [],
  categories: [],
  productImages: {},
  loading: true,
  initialized: false,

  refreshProductImages: async () => {
    try {
      const all = await productImagesService.getAllProductImages();
      const map: Record<string, ProductImage[]> = {};
      for (const img of all) {
        if (!map[img.product_id]) map[img.product_id] = [];
        map[img.product_id].push(img);
      }
      set({ productImages: map });
    } catch (err) {
      console.warn('[PizzasStore] refreshProductImages failed:', err);
    }
  },

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

    get().refreshProductImages();

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

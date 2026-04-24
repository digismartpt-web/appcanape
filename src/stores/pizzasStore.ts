import { create } from 'zustand';
import { pizzasService, categoriesService, extrasService } from '../services/supabaseService';
import type { Pizza, Category, Extra } from '../types';

interface PizzasState {
  pizzas: Pizza[];      // Pizzas ativas para o público
  allPizzas: Pizza[];   // Todas as pizzas para administração
  categories: Category[];
  extras: Extra[];      // Extras ativos para o público
  allExtras: Extra[];   // Todos os extras para administração
  loading: boolean;
  initialized: boolean;
  initPizzasStore: () => () => void;
}

export const usePizzasStore = create<PizzasState>((set, get) => ({
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

    console.log('🔄 [PizzasStore] Inicializando ouvintes globais do catálogo...');

    const unsubActivePizzas = pizzasService.subscribeToActivePizzas((pizzas) => {
      set({ pizzas, loading: false });
    });

    const unsubAllPizzas = pizzasService.subscribeToAllPizzas((allPizzas) => {
      set({ allPizzas });
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
      console.log('🔌 [PizzasStore] Desconectando ouvintes globais do catálogo...');
      unsubActivePizzas();
      unsubAllPizzas();
      unsubCategories();
      unsubActiveExtras();
      unsubAllExtras();
      set({ initialized: false }); // Reset so it can be re-initialized if needed
    };
  }
}));

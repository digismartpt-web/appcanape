import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, PromotionRule } from '../types';
import { promotionsService } from '../services/supabaseService';

interface CartItem {
  id: string;
  customizationId: string;
  product: Product;
  sizeCode: string;
  sizeLabel: string;
  selectedOption?: string;
  quantity: number;
  price: number;
  discount?: number;
  isFree?: boolean;
}

export type DeliveryType = 'delivery' | 'pickup';

interface CartStore {
  items: CartItem[];
  promotions: PromotionRule[];
  deliveryType: DeliveryType;
  deliveryAddress: string;
  addItem: (item: { product: Product; sizeCode: string; sizeLabel: string; selectedOption?: string; quantity: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setDeliveryType: (type: DeliveryType) => void;
  setDeliveryAddress: (address: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  fetchPromotions: () => Promise<void>;
  initPromotionsListener: () => () => void;
  applyPromotions: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promotions: [],
      deliveryType: 'pickup',
      deliveryAddress: '',

      fetchPromotions: async () => {
        try {
          const promos = await promotionsService.getActivePromotions();
          set({ promotions: promos });
          get().applyPromotions();
        } catch (error) {
          console.error('Erreur chargement promotions:', error);
        }
      },

      initPromotionsListener: () => {
        return promotionsService.subscribeToActivePromotions((promos) => {
          set({ promotions: promos });
          get().applyPromotions();
        });
      },

      applyPromotions: () => {
        const { items, promotions } = get();
        if (promotions.length === 0) {
          if (items.some(item => (item.discount || 0) > 0 || item.isFree)) {
            set({ items: items.map(item => ({ ...item, discount: 0, isFree: false })) });
          }
          return;
        }

        let updatedItems = items.map(item => ({ ...item, discount: 0, isFree: false }));

        promotions.forEach(promo => {
          if (!promo.active) return;
          if (promo.type === 'buy_x_get_y_free') {
            const buyCount = promo.buyCondition.count;
            const rewardCount = promo.reward.count;

            const buyMatchingItems = updatedItems.filter(item => {
              if (promo.buyCondition.productIds && !promo.buyCondition.productIds.includes(item.product.id)) return false;
              if (promo.buyCondition.size && item.sizeCode !== promo.buyCondition.size) return false;
              return true;
            });

            const rewardMatchingItems = updatedItems.filter(item => {
              if (promo.reward.productId && item.product.id !== promo.reward.productId) return false;
              if (promo.reward.size && item.sizeCode !== promo.reward.size) return false;
              return true;
            });

            const totalBuyQty = buyMatchingItems.reduce((s, i) => s + i.quantity, 0);
            const occurrences = Math.floor(totalBuyQty / buyCount);

            if (occurrences > 0) {
              let remainingFree = occurrences * rewardCount;
              const sortedRewards = [...rewardMatchingItems].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity));
              for (const reward of sortedRewards) {
                if (remainingFree <= 0) break;
                const itemIdx = updatedItems.findIndex(i => i.id === reward.id);
                if (itemIdx !== -1) {
                  const item = updatedItems[itemIdx];
                  const unitPrice = item.price / item.quantity;
                  const freeInThisItem = Math.min(item.quantity, remainingFree);
                  updatedItems[itemIdx] = {
                    ...item,
                    discount: (item.discount || 0) + unitPrice * freeInThisItem,
                    isFree: freeInThisItem === item.quantity && item.quantity === 1
                  };
                  remainingFree -= freeInThisItem;
                }
              }
            }
          }
        });

        set({ items: updatedItems });
      },

      addItem: ({ product, sizeCode, sizeLabel, selectedOption, quantity }) => {
        const state = get();
        const size = product.sizes.find(s => s.code === sizeCode);
        const unitPrice = size?.price || 0;
        const totalLinePrice = unitPrice * quantity;

        const customizationId = `${product.id}-${sizeCode}-${selectedOption || ''}`;
        const existingItem = state.items.find(item => item.customizationId === customizationId);

        if (existingItem) {
          set({
            items: state.items.map(item =>
              item.customizationId === customizationId
                ? { ...item, quantity: item.quantity + quantity, price: item.price + totalLinePrice }
                : item
            )
          });
        } else {
          const newItem: CartItem = {
            id: `${Date.now()}-${Math.random()}`,
            customizationId,
            product,
            sizeCode,
            sizeLabel,
            selectedOption,
            quantity,
            price: totalLinePrice
          };
          set({ items: [...state.items, newItem] });
        }
        get().applyPromotions();
      },

      removeItem: (id: string) => {
        set(state => ({ items: state.items.filter(item => item.id !== id) }));
        get().applyPromotions();
      },

      updateQuantity: (id: string, quantity: number) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;
        if (quantity <= 0) { get().removeItem(id); return; }
        const unitPrice = item.price / item.quantity;
        set({ items: state.items.map(i => i.id === id ? { ...i, quantity, price: unitPrice * quantity } : i) });
        get().applyPromotions();
      },

      setDeliveryType: (type: DeliveryType) => {
        set({ deliveryType: type });
        if (type === 'pickup') set({ deliveryAddress: '' });
      },

      setDeliveryAddress: (address: string) => set({ deliveryAddress: address }),

      clearCart: () => set({ items: [], deliveryType: 'pickup', deliveryAddress: '' }),

      getTotal: () => {
        const state = get();
        const subtotal = state.items.reduce((total, item) => total + item.price, 0);
        const totalDiscount = state.items.reduce((total, item) => total + (item.discount || 0), 0);
        return Math.max(0, subtotal - totalDiscount);
      },

      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0)
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        deliveryType: state.deliveryType,
        deliveryAddress: state.deliveryAddress
      })
    }
  )
);

import { create } from 'zustand';
import { ordersService } from '../services/firebaseService';
import type { Order, OrderStatus } from '../types';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchUserOrders: (userId: string) => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  subscribeToUserOrders: (userId: string) => () => void;
  subscribeToAllOrders: () => () => void;
  subscribeToOrdersByStatus: (status: OrderStatus) => () => void;
}


export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchUserOrders: async (userId: string) => {
    set({ loading: true });
    try {
      const orders = await ordersService.getUserOrders(userId);
      set({
        orders,
        loading: false,
        error: null
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors du chargement des commandes',
        loading: false
      });
    }
  },

  fetchAllOrders: async () => {
    set({ loading: true });
    try {
      const orders = await ordersService.getAllOrders();
      set({
        orders,
        loading: false,
        error: null
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors du chargement des commandes',
        loading: false
      });
    }
  },

  addOrder: (order: Order) => {
    set(state => ({
      orders: [order, ...state.orders]
    }));
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    try {
      await ordersService.updateOrderStatus(orderId, status);
      set(state => ({
        orders: state.orders.map(order =>
          order.id === orderId
            ? { ...order, status }
            : order
        )
      }));
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la mise à jour du statut'
      });
    }
  },

  subscribeToUserOrders: (userId: string) => {
    return ordersService.subscribeToUserOrders(userId, (orders) => {
      set({ orders, loading: false, error: null });
    });
  },

  subscribeToAllOrders: () => {
    return ordersService.subscribeToAllOrders((orders) => {
      set({ orders, loading: false, error: null });
    });
  },

  subscribeToOrdersByStatus: (status: OrderStatus) => {
    return ordersService.subscribeToOrdersByStatus(status, (orders) => {
      set({ orders, loading: false, error: null });
    });
  }
}));
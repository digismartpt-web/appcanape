import create from 'zustand';
import { Reservation } from '../types';

interface AppState {
  reservations: Reservation[];
  isLoading: boolean;
  error: string | null;
  setReservations: (data: Reservation[]) => void;
  addReservation: (res: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;
  setLoading: (bool: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useAppCanapeStore = create<AppState>((set) => ({
  reservations: [],
  isLoading: false,
  error: null,
  setReservations: (data) => set({ reservations: data }),
  addReservation: (res) => set((state) => ({ reservations: [...state.reservations, res] })),
  updateReservation: (id, updates) =>
    set((state) => ({
      reservations: state.reservations.map((res) => (res.id === id ? { ...res, ...updates } : res)),
    }),
  removeReservation: (id) => set((state) => ({ reservations: state.reservations.filter((res) => res.id !== id) })),
  setLoading: (bool) => set({ isLoading: bool }),
  setError: (msg) => set({ error: msg }),
}));

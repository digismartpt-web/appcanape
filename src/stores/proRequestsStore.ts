import { create } from 'zustand';
import { proRequestsService } from '../services/supabaseService';
import type { ProRequest, ProRequestStatus } from '../types';
import toast from 'react-hot-toast';

const isTestUser = () => sessionStorage.getItem('dev_test_user') !== null;

interface ProRequestsState {
  requests: ProRequest[];
  loading: boolean;
  error: string | null;
  fetchRequests: (status?: ProRequestStatus) => Promise<void>;
  submitRequest: (data: {
    user_id?: string;
    company_name: string;
    nif: string;
    email: string;
    phone?: string;
    address?: string;
    activity_sector?: string;
    message?: string;
  }) => Promise<string>;
  approveRequest: (requestId: string, userId: string, discountPercent: number, reviewedBy?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string, reviewedBy?: string) => Promise<void>;
}

export const useProRequestsStore = create<ProRequestsState>((set, get) => ({
  requests: [],
  loading: false,
  error: null,

  fetchRequests: async (status?) => {
    set({ loading: true, error: null });
    try {
      if (isTestUser()) {
        set({ requests: [], loading: false });
        return;
      }
      const data = await proRequestsService.fetchProRequests(status);
      set({ requests: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  submitRequest: async (data) => {
    if (isTestUser()) return crypto.randomUUID();
    try {
      const id = await proRequestsService.submitProRequest(data);
      return id;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  },

  approveRequest: async (requestId, userId, discountPercent, reviewedBy) => {
    if (isTestUser()) return;
    try {
      await proRequestsService.approveProRequest(requestId, userId, discountPercent, reviewedBy);
      set(state => ({
        requests: state.requests.map(r =>
          r.id === requestId ? { ...r, status: 'approved' as ProRequestStatus } : r
        )
      }));
      toast.success('Pedido aprovado com sucesso');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  },

  rejectRequest: async (requestId, reason, reviewedBy) => {
    if (isTestUser()) return;
    try {
      await proRequestsService.rejectProRequest(requestId, reason, reviewedBy);
      set(state => ({
        requests: state.requests.map(r =>
          r.id === requestId ? { ...r, status: 'rejected' as ProRequestStatus } : r
        )
      }));
      toast.success('Pedido rejeitado');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  }
}));

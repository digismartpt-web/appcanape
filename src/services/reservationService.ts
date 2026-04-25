import { supabase, TABLE_PREFIX } from '../lib/supabase';
import { Reservation } from '../types';

export const fetchReservations = async () => {
  try {
    const { data, error } = await supabase.from<Reservation>(`${TABLE_PREFIX}reservations`).select('*');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createReservation = async (data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
  try {
    const { data: insertedData, error } = await supabase.from<Reservation>(`${TABLE_PREFIX}reservations`).insert([data]).select().single();
    if (error) throw error;
    return { data: insertedData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateReservation = async (id: string, updates: Partial<Reservation>) => {
  try {
    const { data: updatedData, error } = await supabase.from<Reservation>(`${TABLE_PREFIX}reservations`).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return { data: updatedData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteReservation = async (id: string) => {
  try {
    const { data, error } = await supabase.from<Reservation>(`${TABLE_PREFIX}reservations`).delete().eq('id', id);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

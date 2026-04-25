import { useEffect } from 'react';
import { useAppCanapeStore } from '../stores/useAppCanapeStore';
import { fetchReservations, createReservation, updateReservation, deleteReservation } from '../services/reservationService';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export const useReservations = () => {
  const { reservations, setReservations, setLoading, setError, addReservation } = useAppCanapeStore();

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await fetchReservations();
        if (error) throw error;
        setReservations(data);
      } catch (error) {
        setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    loadReservations();
  }, [setReservations, setLoading, setError]);

  const submitReservation = async (data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const { data: insertedData, error } = await createReservation(data);
      if (error) throw error;
      if (insertedData) {
        addReservation(insertedData);
        toast.success('Réservation ajoutée avec succès !');
      }
    } catch (error) {
      setError(String(error));
      toast.error('Échec de la réservation.');
    } finally {
      setLoading(false);
    }
  };

  return { reservations, isLoading, error, submitReservation };
};

export const useUpdateReservation = () => {
  const { updateReservation } = useAppCanapeStore();

  const updateResa = async (id: string, updates: Partial<Reservation>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await updateReservation(id, updates);
      if (error) throw error;
      if (data) {
        updateReservation(data.id, data);
        toast.success('Réservation mise à jour avec succès !');
      }
    } catch (error) {
      setError(String(error));
      toast.error('Échec de la mise à jour de la réservation.');
    } finally {
      setLoading(false);
    }
  };

  return { reservations, isLoading, error, submitReservation, updateResa };
};

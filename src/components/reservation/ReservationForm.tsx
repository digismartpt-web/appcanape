import { useForm, SubmitHandler, zodResolver } from 'react-hook-form';
import { z } from 'zod';
import { reservationSchema } from '../../lib/schema';
import { useReservations } from '../../hooks/useReservations';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

interface ReservationFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
}

export const ReservationForm: React.FC = () => {
  const { submitReservation, isLoading } = useReservations();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReservationFormData>({ resolver: zodResolver(reservationSchema) });

  const onSubmit: SubmitHandler<ReservationFormData> = (data) => {
    submitReservation(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
          Nom du client
        </label>
        <input
          {...register('clientName')}
          id="clientName"
          type="text"
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.clientName && 'border-red-500')}
        />
        {errors.clientName && <p className="text-red-500 text-sm mt-1">{errors.clientName.message}</p>}
      </div>
      <div>
        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
          Email du client
        </label>
        <input
          {...register('clientEmail')}
          id="clientEmail"
          type="email"
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.clientEmail && 'border-red-500')}
        />
        {errors.clientEmail && <p className="text-red-500 text-sm mt-1">{errors.clientEmail.message}</p>}
      </div>
      <div>
        <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">
          Téléphone du client
        </label>
        <input
          {...register('clientPhone')}
          id="clientPhone"
          type="tel"
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.clientPhone && 'border-red-500')}
        />
        {errors.clientPhone && <p className="text-red-500 text-sm mt-1">{errors.clientPhone.message}</p>}
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date de la réservation
        </label>
        <input
          {...register('date')}
          id="date"
          type="date"
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.date && 'border-red-500')}
        />
        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
      </div>
      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-700">
          Heure de la réservation
        </label>
        <input
          {...register('time')}
          id="time"
          type="time"
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.time && 'border-red-500')}
        />
        {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
      </div>
      <div>
        <label htmlFor="guests" className="block text-sm font-medium text-gray-700">
          Nombre d'invités
        </label>
        <input
          {...register('guests', { valueAsNumber: true })}
          id="guests"
          type="number"
          min={1}
          max={50}
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.guests && 'border-red-500')}
        />
        {errors.guests && <p className="text-red-500 text-sm mt-1">{errors.guests.message}</p>}
      </div>
      <div className="md:col-span-2">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes supplémentaires
        </label>
        <textarea
          {...register('notes')}
          id="notes"
          rows={4}
          className={clsx('mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500', errors.notes && 'border-red-500')}
        />
        {errors.notes && <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>}
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          className={`w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600 ${isLoading ? 'disabled:bg-gray-300' : ''}`}
          disabled={isLoading || Object.keys(errors).length > 0}
        >
          {isLoading ? 'Chargement...' : 'Réserver'}
        </button>
      </div>
    </form>
  );
};

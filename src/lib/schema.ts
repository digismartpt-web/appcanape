import { z } from 'zod';

export const reservationSchema = z.object({
  id: z.string(),
  clientName: z.string().min(1, { message: 'Nom du client est requis' }),
  clientEmail: z.string().email({ message: 'Email invalide' }),
  clientPhone: z.string().refine(val => /^[0-9]+$/.test(val), { message: 'Téléphone doit être numérique' }),
  date: z.string().nonempty({ message: 'Date est requise' }),
  time: z.string().nonempty({ message: 'Heure est requise' }),
  guests: z.number().min(1, { message: 'Au moins 1 invité est requis' }).max(50, { message: 'Maximum 50 invités autorisés' }),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  notes: z.string(),
  createdAt: z.string(),
});

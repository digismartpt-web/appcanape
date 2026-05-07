import { useSettingsStore } from '../stores/settingsStore';

export interface PizzariaSettings {
  id?: string;
  logo_url: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_open: boolean;
  estimated_delivery_days?: number;
  notification_sound?: string;
  preparation_time?: number;
  banner_active?: boolean;
  available_banner_images?: string[];
  opening_hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  // UI-only fields (not persisted to DB)
  delivery_fee?: number;
  min_delivery_amount?: number;
  cutoff_minutes_before_closing?: number;
}

export function usePizzariaSettings() {
  const { settings, loading, updateSettings } = useSettingsStore();

  return { settings, loading, updateSettings };
}
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { PizzariaSettings } from '../hooks/usePizzariaSettings';
import toast from 'react-hot-toast';

interface SettingsState {
  settings: PizzariaSettings;
  loading: boolean;
  initialized: boolean;
  fetchSettings: () => Promise<void>;
  initSettings: () => () => void;
  updateSettings: (newSettings: Partial<PizzariaSettings>) => Promise<boolean>;
}

// Columns that exist in canape_module.settings — never send anything outside this list
const DB_COLUMNS = new Set([
  'address', 'available_banner_images', 'banner_active', 'banner_image_url', 'banner_interval',
  'closing_message', 'currency', 'cutoff_minutes_before_closing', 'delivery_enabled', 'delivery_fee',
  'email', 'estimated_delivery_days', 'free_delivery_threshold',
  'is_open', 'logo_url', 'maintenance_mode', 'max_delivery_distance', 'min_order_amount', 'name',
  'notification_sound', 'opening_hours', 'opening_message', 'phone', 'pickup_enabled', 'preparation_time',
  'primary_color', 'secondary_color', 'social_facebook', 'social_instagram',
  'social_linkedin', 'social_tiktok', 'stripe_account_id'
]);

const defaultSettings: PizzariaSettings = {
  logo_url: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  is_open: true,
  estimated_delivery_days: 14,
  notification_sound: '',
  preparation_time: 10,
  banner_active: false,
  banner_image_url: '',
  available_banner_images: [],
  delivery_fee: 0,
  min_order_amount: 0,
  cutoff_minutes_before_closing: 30,
  opening_hours: {
    monday: '11h30-22h30',
    tuesday: '11h30-22h30',
    wednesday: '11h30-22h30',
    thursday: '11h30-22h30',
    friday: '11h30-23h30',
    saturday: '11h30-23h30',
    sunday: '12h00-22h00'
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: (() => {
    try {
      const cached = localStorage.getItem('boutique_settings_cache');
      return cached ? JSON.parse(cached) : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  })(),
  loading: true,
  initialized: false,

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      
      if (error) throw error;
      if (data) {
        const merged = { ...defaultSettings, ...data };
        set({ settings: merged, initialized: true });
        try {
          localStorage.setItem('boutique_settings_cache', JSON.stringify(merged));
        } catch (e) {
          // Navigation privée bloque parfois l'écriture
        }
      }
    } catch (error) {
      console.warn('⚠️ [SettingsStore] Fallback to cache or defaults:', error);
      try {
        const cache = localStorage.getItem('boutique_settings_cache');
        if (cache) {
          set({ settings: JSON.parse(cache), initialized: true });
        }
      } catch (e) {}
    } finally {
      set({ loading: false });
    }
  },

  initSettings: () => {
    console.log('🔄 [SettingsStore] Inicializando ouvintes em tempo real...');
    set({ initialized: true });
    get().fetchSettings();

    const channelId = 'public:settings';
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings' 
      }, (payload: any) => {
        console.log('⚡ [SettingsStore] Mudança Realtime detectada:', payload.eventType);
        if (payload.new) {
          const data = payload.new as any;
          // On merge avec les valeurs par défaut pour éviter les champs manquants
          const merged = { ...get().settings, ...data };
          set({ settings: merged });
          try {
            localStorage.setItem('boutique_settings_cache', JSON.stringify(merged));
          } catch (e) {}
          window.dispatchEvent(new Event('settings_updated'));
        }
      })
      .subscribe((status: string) => {
        console.log(`📡 [SettingsStore] Status da subscrição ${channelId}:`, status);
      });

    return () => {
      console.log('🔌 [SettingsStore] Desconectando Realtime...');
      supabase.removeChannel(channel);
      set({ initialized: false });
    };
  },

  updateSettings: async (newSettings) => {
    if (!newSettings) return false;
    try {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };

      // Update local state immediately (Optimistic)
      set({ settings: updatedSettings });
      localStorage.setItem('boutique_settings_cache', JSON.stringify(updatedSettings));

      // TODO: REMOVE BEFORE PRODUCTION — skip Supabase write for test accounts
      if (sessionStorage.getItem('dev_test_user')) return true;
      // END TODO

      // Strip fields that don't exist in canape_module.settings
      const dbPayload = Object.fromEntries(
        Object.entries(newSettings).filter(([key]) => DB_COLUMNS.has(key))
      );

      const { error } = await supabase
        .from('settings')
        .update(dbPayload)
        .eq('id', currentSettings.id);

      if (error) {
        console.error('❌ [SettingsStore] Erro ao atualizar Supabase:', error.message, error.details);
        console.trace('Stack trace de updateSettings');
        toast.error(`Erro ao guardar: ${error.message}`);
        throw error;
      }
      return true;
    } catch (error: any) {
      console.error('❌ [SettingsStore] Erro ao gravar:', error);
      return false;
    }
  }
}));

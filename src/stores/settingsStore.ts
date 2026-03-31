import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { PizzariaSettings } from '../hooks/usePizzariaSettings';

interface SettingsState {
  settings: PizzariaSettings;
  loading: boolean;
  initialized: boolean;
  fetchSettings: () => Promise<void>;
  initSettings: () => () => void;
  updateSettings: (newSettings: Partial<PizzariaSettings>) => Promise<boolean>;
}

const SETTINGS_ROW_ID = 'global-settings';

const defaultSettings: PizzariaSettings = {
  logo_url: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  is_open: true,
  delivery_fee: 0,
  min_delivery_amount: 10,
  default_preparation_time: 10,
  default_delivery_time: 30,
  cutoff_minutes_before_closing: 30,
  banner_active: false,
  banner_image_url: '',
  available_banner_images: [],
  service_fee_percentage: 10,
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
      const cached = localStorage.getItem('pizzaria_settings_cache');
      return cached ? JSON.parse(cached) : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  })(),
  loading: true,
  initialized: false,

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', SETTINGS_ROW_ID).maybeSingle();
      
      if (error) throw error;
      if (data) {
        const merged = { ...defaultSettings, ...data };
        set({ settings: merged, initialized: true });
        try {
          localStorage.setItem('pizzaria_settings_cache', JSON.stringify(merged));
        } catch (e) {
          // Navigation privée bloque parfois l'écriture
        }
      }
    } catch (error) {
      console.warn('⚠️ [SettingsStore] Fallback to cache or defaults:', error);
      try {
        const cache = localStorage.getItem('pizzaria_settings_cache');
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
        if (payload.new && (payload.new as any).id === SETTINGS_ROW_ID) {
          const data = payload.new as any;
          // On merge avec les valeurs par défaut pour éviter les champs manquants
          const merged = { ...get().settings, ...data };
          set({ settings: merged });
          try {
            localStorage.setItem('pizzaria_settings_cache', JSON.stringify(merged));
          } catch (e) {}
          window.dispatchEvent(new Event('settings_updated'));
        }
      })
      .subscribe((status: string) => {
        console.log(`📡 [SettingsStore] Status da subscrição ${channelId}:`, status);
      });

    const pollingInterval = setInterval(() => {
      get().fetchSettings();
    }, 15000); // 15s polling for open/closed status fallback

    return () => {
      console.log('🔌 [SettingsStore] Desconectando Realtime...');
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      set({ initialized: false });
    };
  },

  updateSettings: async (newSettings) => {
    try {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      // Update local state immediately (Optimistic)
      set({ settings: updatedSettings });
      localStorage.setItem('pizzaria_settings_cache', JSON.stringify(updatedSettings));

      const { error } = await supabase
        .from('settings')
        .upsert({ id: SETTINGS_ROW_ID, ...newSettings });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ [SettingsStore] Erro ao gravar:', error);
      return false;
    }
  }
}));

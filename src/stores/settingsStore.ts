import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { PizzariaSettings } from '../hooks/usePizzariaSettings';

interface SettingsState {
  settings: PizzariaSettings;
  loading: boolean;
  initialized: boolean;
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

  initSettings: () => {
    if (get().initialized) return () => {};

    console.log('🔄 [SettingsStore] Inicializando ouvintes em tempo real...');

    // Carga inicial
    supabase.from('settings').select('*').eq('id', SETTINGS_ROW_ID).maybeSingle().then(({ data, error }) => {
      if (!error && data) {
          const merged = { ...defaultSettings, ...data };
          set({ settings: merged, loading: false, initialized: true });
          localStorage.setItem('pizzaria_settings_cache', JSON.stringify(merged));
      } else if (!data && !error) {
          // Criar se não existir
          supabase.from('settings').insert({ id: SETTINGS_ROW_ID, ...defaultSettings }).then(() => {
              set({ settings: defaultSettings, loading: false, initialized: true });
          });
      } else {
          set({ loading: false });
      }
    });

    // Inscrição em Tempo Real para TODAS as mudanças na tabela settings
    // Removendo o filtro de ID para garantir que as atualizações cheguem
    const channel = supabase
      .channel('public:settings')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings' 
      }, (payload) => {
        console.log('⚡ [SettingsStore] Mudança Realtime detectada:', payload);
        if (payload.new && (payload.new as any).id === SETTINGS_ROW_ID) {
          const data = payload.new as any;
          const merged = { ...defaultSettings, ...data };
          set({ settings: merged });
          localStorage.setItem('pizzaria_settings_cache', JSON.stringify(merged));
          // Emitir evento para componentes legados se necessário
          window.dispatchEvent(new Event('settings_updated'));
        }
      })
      .subscribe((status) => {
        console.log('📡 [SettingsStore] Status da subscrição Realtime:', status);
      });

    return () => {
      console.log('🔌 [SettingsStore] Desconectando Realtime...');
      supabase.removeChannel(channel);
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

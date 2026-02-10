import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface PizzeriaSettings {
  logo_url: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  delete_password: string;
  is_open: boolean;
  max_delivery_distance?: number;
  delivery_fee?: number;
  default_preparation_time?: number;
  default_delivery_time?: number;
  cutoff_minutes_before_closing?: number;
  banner_active?: boolean;
  banner_image_url?: string;
  available_banner_images?: string[];
  service_fee_percentage?: number;
  opening_hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

const defaultSettings: PizzeriaSettings = {
  logo_url: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  delete_password: 'delete123',
  is_open: true,
  delivery_fee: 0,
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

const SETTINGS_DOC_ID = 'global-settings';

export function usePizzeriaSettings() {
  const [settings, setSettings] = useState<PizzeriaSettings>(() => {
    try {
      const cached = localStorage.getItem('pizzeria_settings_cache');
      return cached ? JSON.parse(cached) : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  });
  const [loading, setLoading] = useState(() => settings === defaultSettings);

  useEffect(() => {
    if (!db) {
      console.warn('Firebase non disponible');
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);

    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<PizzeriaSettings>;

          // Merge intelligent pour éviter les nulls sur les objets imbriqués
          const mergedSettings: PizzeriaSettings = {
            ...defaultSettings,
            ...data,
            opening_hours: {
              ...defaultSettings.opening_hours,
              ...(data.opening_hours || {})
            }
          };

          setSettings(mergedSettings);
          // Sauvegarder dans le cache local pour le shell 0ms
          try {
            localStorage.setItem('pizzeria_settings_cache', JSON.stringify(mergedSettings));
          } catch (e) {
            console.warn('⚠️ [Cache] Settings save failed');
          }
          console.log('✅ Paramètres chargés depuis Firestore:', mergedSettings);
        } else {
          setSettings(defaultSettings);
          setDoc(settingsRef, defaultSettings)
            .then(() => console.log('✅ Paramètres par défaut créés dans Firestore'))
            .catch((err) => console.error('Erreur création paramètres:', err));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erreur chargement paramètres:', error);
        setSettings(defaultSettings);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<PizzeriaSettings>) => {
    if (!db) {
      console.error('Firebase non disponible');
      return false;
    }

    try {
      console.log('🔄 Début de sauvegarde des paramètres...');
      console.log('📝 Nouvelles données:', newSettings);

      const updatedSettings = { ...settings, ...newSettings };
      const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);

      console.log('💾 Tentative de sauvegarde dans Firestore...');
      await setDoc(settingsRef, updatedSettings);

      console.log('✅ Paramètres sauvegardés dans Firestore');
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message:', error.message);
      return false;
    }
  }, [settings]);

  return {
    settings,
    loading,
    updateSettings
  };
}
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PizzariaSidebar } from './PizzariaSidebar';
import { PizzariaDashboard } from './PizzariaDashboard';
import { PizzariaOrders } from './PizzariaOrders';
import { PizzariaMenu } from './PizzariaMenu';
import { PizzariaCategories } from './PizzariaCategories';
import { PizzariaPromotions } from './PizzariaPromotions';
import { PizzariaSettings } from './PizzariaSettings';
import { audioNotificationService } from '../../services/audioNotificationService';
import { useSettingsStore } from '../../stores/settingsStore';

export function Pizzaria() {
  const { settings } = useSettingsStore();

  // Déverrouiller l'audio au premier clic de l'utilisateur (obligation navigateur)
  useEffect(() => {
    const unlock = () => {
      audioNotificationService.unlockAudio();
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  // Synchroniser l'URL du son custom depuis les settings
  useEffect(() => {
    if (settings?.notification_sound_url) {
      audioNotificationService.setCustomSoundUrl(settings.notification_sound_url);
    }
  }, [settings?.notification_sound_url]);

  // Demander la permission de notifications push au premier chargement
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✅ Permission de notifications accordée');
        }
      });
    }
  }, []);

  return (
    <div className="flex h-full min-h-screen">
      <PizzariaSidebar />
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/pizzaria/commandes" replace />} />
          <Route path="commandes" element={<PizzariaOrders />} />
          <Route path="menu" element={<PizzariaMenu />} />
          <Route path="categorias" element={<PizzariaCategories />} />
          <Route path="promocoes" element={<PizzariaPromotions />} />
          <Route path="configuracoes" element={<PizzariaSettings />} />
        </Routes>
      </div>
    </div>
  );
}

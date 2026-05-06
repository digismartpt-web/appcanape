import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BoutiqueSidebar } from './BoutiqueSidebar';
import { BoutiqueOrders } from './BoutiqueOrders';
import { BoutiqueMenu } from './BoutiqueMenu';
import { BoutiqueCategories } from './BoutiqueCategories';
import { BoutiquePromotions } from './BoutiquePromotions';
import { BoutiqueSettings } from './BoutiqueSettings';
import { BoutiquePro } from './BoutiquePro';
import { audioNotificationService } from '../../services/audioNotificationService';
import { useSettingsStore } from '../../stores/settingsStore';

export function Boutique() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const unlock = () => {
      audioNotificationService.unlockAudio();
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  useEffect(() => {
    if (settings?.notification_sound_url) {
      audioNotificationService.setCustomSoundUrl(settings.notification_sound_url);
    }
  }, [settings?.notification_sound_url]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex h-full min-h-screen">
      <BoutiqueSidebar />
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/boutique/commandes" replace />} />
          <Route path="commandes" element={<BoutiqueOrders />} />
          <Route path="catalogue" element={<BoutiqueMenu />} />
          <Route path="categories" element={<BoutiqueCategories />} />
          <Route path="promotions" element={<BoutiquePromotions />} />
          <Route path="pro" element={<BoutiquePro />} />
          <Route path="parametres" element={<BoutiqueSettings />} />
        </Routes>
      </div>
    </div>
  );
}

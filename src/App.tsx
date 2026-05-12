import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BrandingFooter } from './components/BrandingFooter';
import { CartModal } from './components/CartModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import MesCommandes from './pages/MesCommandes';
import { Privacy } from './pages/Privacy';
import { Admin } from './pages/Admin';
import { Boutique } from './pages/Boutique';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PedidoPro } from './pages/PedidoPro';

function MainContent() {
  const location = useLocation();
  const isAdminOrPizzaria = location.pathname.startsWith('/admin') || location.pathname.startsWith('/boutique');

  return (
    <main className={`flex-1 ${isAdminOrPizzaria ? 'w-full' : 'container mx-auto px-4 py-8'}`}>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/contact" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/mes-commandes" element={
          <ProtectedRoute roles={['client', 'pro']}>
            <MesCommandes />
          </ProtectedRoute>
        } />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/boutique/*" element={
          <ProtectedRoute roles={['boutique', 'admin']}>
            <Boutique />
          </ProtectedRoute>
        } />
        <Route path="/acesso-profissional" element={<PedidoPro />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
      </Routes>
    </main>
  );
}

import { useAuth } from './hooks/useAuth';
import { useCartStore } from './stores/cartStore';
import { useSettingsStore } from './stores/settingsStore';
import { usePizzasStore } from './stores/pizzasStore';
import { usePromotionsStore } from './stores/promotionsStore';
import { useOrderStore } from './stores/orderStore';
import { supabase } from './lib/supabase';
import { audioNotificationService } from './services/audioNotificationService';

async function showBoutiquePushNotification(logoUrl?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const icon = logoUrl || '/imagem.png';
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: 'Nova encomenda!',
          body: 'Foi recebida uma nova encomenda.',
          icon
        });
      } else {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('Nova encomenda!', {
          body: 'Foi recebida uma nova encomenda.',
          icon,
          badge: '/imagem.png',
          vibrate: [300, 100, 300],
          requireInteraction: true,
          tag: 'nova-encomenda'
        } as NotificationOptions);
      }
    } else {
      new Notification('Nova encomenda!', { body: 'Foi recebida uma nova encomenda.', icon });
    }
  } catch (error) {
    console.warn('⚠️ Erro notificação push:', error);
  }
}

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const { initPromotionsListener } = useCartStore();
  const { settings, initSettings } = useSettingsStore();
  const { initPizzasStore } = usePizzasStore();
  const { initPromotionsStore } = usePromotionsStore();
  const { initAdminOrdersListener } = useOrderStore();

  // Subscription INSERT active sur toutes les pages pour l'utilisateur boutique
  useEffect(() => {
    if (user?.role !== 'boutique') return;
    // TODO: REMOVE BEFORE PRODUCTION — skip realtime for test accounts
    if (sessionStorage.getItem('dev_test_user')) return;
    // END TODO

    const channelId = `boutique_notifications_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as any;
          if (newOrder?.status === 'em_espera') {
            audioNotificationService.playNotification();
            if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
            showBoutiquePushNotification(settings?.logo_url);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.role]);

  useEffect(() => {
    const unsubPromosLegacy = initPromotionsListener(); // Keep for cart logic synchronization if needed
    const unsubSettings = initSettings();
    const unsubPizzas = initPizzasStore();
    const unsubPromosGlobal = initPromotionsStore();
    
    // Only subscribe to all orders if user is admin or boutique
    let unsubOrders = () => {};
    if (user?.role === 'admin' || user?.role === 'boutique') {
      unsubOrders = initAdminOrdersListener(); // Auto re-init on role change via cleanup logic
    }
    
    return () => {
      unsubPromosLegacy();
      unsubSettings();
      unsubPizzas();
      unsubPromosGlobal();
      unsubOrders();
    };
  }, [initPromotionsListener, initSettings, initPizzasStore, initPromotionsStore, initAdminOrdersListener, user?.role]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen h-full bg-[#111111] flex flex-col">
        <Toaster position="top-center" />
        <Navbar onCartClick={() => setIsCartOpen(true)} />
        <MainContent />
        <Footer />
        <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <BrandingFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;
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
import { Pizzeria } from './pages/Pizzeria';

function MainContent() {
  const location = useLocation();
  const isAdminOrPizzeria = location.pathname.startsWith('/admin') || location.pathname.startsWith('/pizzeria');

  return (
    <main className={`flex-1 ${isAdminOrPizzeria ? 'w-full' : 'container mx-auto px-4 py-8'}`}>
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
          <ProtectedRoute role="client">
            <MesCommandes />
          </ProtectedRoute>
        } />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin/*" element={
          <ProtectedRoute role="admin">
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/pizzeria/*" element={
          <ProtectedRoute role="pizzeria">
            <Pizzeria />
          </ProtectedRoute>
        } />
      </Routes>
    </main>
  );
}

import { useCartStore } from './stores/cartStore';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { initPromotionsListener, initExtrasListener } = useCartStore();

  useEffect(() => {
    const unsubPromos = initPromotionsListener();
    const unsubExtras = initExtrasListener();
    
    return () => {
      unsubPromos();
      unsubExtras();
    };
  }, [initPromotionsListener, initExtrasListener]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen h-full bg-primary-50 flex flex-col">
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
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useAuth } from './hooks/useAuth';
import App from './App.tsx';
import './index.css';

import { initGoogleMaps } from './lib/googleMaps';

// Initialize auth state
const { initializeAuth } = useAuth.getState();
initializeAuth();

// Initialize Google Maps
initGoogleMaps();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for 0ms image loading
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

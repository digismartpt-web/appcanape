import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PizzeriaSidebar } from './PizzeriaSidebar';
import { PizzeriaDashboard } from './PizzeriaDashboard';
import { PizzeriaOrders } from './PizzeriaOrders';
import { PizzeriaMenu } from './PizzeriaMenu';
import { PizzeriaCategories } from './PizzeriaCategories';
import { PizzeriaPromotions } from './PizzeriaPromotions';
import { PizzeriaSettings } from './PizzeriaSettings';
import { audioNotificationService } from '../../services/audioNotificationService';
import { ordersService } from '../../services/firebaseService';
import toast from 'react-hot-toast';

export function Pizzeria() {
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // S'abonner aux commandes dès l'arrivée sur l'interface pizzeria
    const unsubscribe = ordersService.subscribeToAllOrders((newOrders) => {
      const currentOrderIds = previousOrderIdsRef.current;

      // Détecter les nouvelles commandes en attente
      const hasNewOrders = newOrders.some(order =>
        !currentOrderIds.has(order.id) && order.status === 'en_attente'
      );

      // Jouer le som e notification para novas encomendas
      if (hasNewOrders && currentOrderIds.size > 0) {
        audioNotificationService.playNotification();
        toast.success('Nova encomenda recebida!', {
          duration: 4000,
        });
      }

      // Atualizar a lista de IDs
      previousOrderIdsRef.current = new Set(newOrders.map(o => o.id));
    });

    return unsubscribe;
  }, []);

  return (
    <div className="flex h-full min-h-screen">
      <PizzeriaSidebar />
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/pizzeria/commandes" replace />} />
          <Route path="commandes" element={<PizzeriaOrders />} />
          <Route path="menu" element={<PizzeriaMenu />} />
          <Route path="categorias" element={<PizzeriaCategories />} />
          <Route path="promocoes" element={<PizzeriaPromotions />} />
          <Route path="configuracoes" element={<PizzeriaSettings />} />
        </Routes>
      </div>
    </div>
  );
}
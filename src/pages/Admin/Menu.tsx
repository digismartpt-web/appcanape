import { useState } from 'react';
import { BarChart3, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export function Menu() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-800">Statistiques Menu</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-primary-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary-800 mb-2">
            Statistiques du menu
          </h2>
          <p className="text-primary-600 mb-6">
            Cette section affichera les statistiques détaillées sur les performances de votre menu.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-primary-50 p-4 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-primary-800">Tendances</h3>
              <p className="text-sm text-primary-600">Produtos mais populares</p>
            </div>
            <div className="bg-primary-50 p-4 rounded-lg">
              <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-primary-800">Préférences</h3>
              <p className="text-sm text-primary-600">Goûts des clients</p>
            </div>
            <div className="bg-primary-50 p-4 rounded-lg">
              <ShoppingBag className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-primary-800">Performance</h3>
              <p className="text-sm text-primary-600">Chiffre d'affaires par produto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import type { OrderStatus } from '../../types';

const STATUS_COLORS = {
  en_attente: 'bg-red-100 text-red-800',
  confirmee: 'bg-orange-100 text-orange-800',
  en_preparation: 'bg-orange-100 text-orange-800',
  prete: 'bg-green-100 text-green-800',
  recuperee: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee: 'Récupérée'
};

export function Orders() {
  const { orders, subscribeToAllOrders, updateOrderStatus } = useOrderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllOrders();
    setUnsubscribe(() => unsub);
    
    return () => {
      if (unsub) unsub();
    };
  }, [subscribeToAllOrders]);

  const filteredOrders = orders
    .filter(order =>
      order.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toString().includes(searchTerm)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-800">Gestion des commandes</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Rechercher par nom ou numéro de commande..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Numéro</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Client</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Articles</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Total</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-primary-600">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-primary-50">
                    <td className="px-6 py-4 text-sm text-primary-800">#{order.order_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-primary-800">{order.user.full_name}</div>
                      <div className="text-sm text-primary-600">{order.user.phone}</div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.user.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {order.user.address}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm text-primary-600">
                          {item.quantity}x {item.pizza_name} ({item.size})
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary-800">
                      {order.total.toFixed(2)}€
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id.toString(), e.target.value as OrderStatus)}
                        className="text-sm border border-primary-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
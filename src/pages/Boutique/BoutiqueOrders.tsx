import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Package, Truck, Phone, Mail, MapPin, Eye, Trash2, Store, Calendar } from 'lucide-react';
import { ordersService, productsService } from '../../services/supabaseService';
import { useOrderStore } from '../../stores/orderStore';
import { usePizzariaSettings } from '../../hooks/usePizzariaSettings';
import { audioNotificationService } from '../../services/audioNotificationService';
import toast from 'react-hot-toast';
import type { Order } from '../../types';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:            { label: 'Pagamento pendente',   color: 'bg-gray-100 text-gray-700',     icon: Clock },
  pendente_pagamento: { label: 'Pagamento pendente',   color: 'bg-gray-100 text-gray-700',     icon: Clock },
  em_espera:          { label: 'Pendente',             color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed:          { label: 'Confirmada',           color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
  confirmee:          { label: 'Confirmada',           color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
  preparing:          { label: 'Em preparação',        color: 'bg-orange-100 text-orange-800', icon: Package },
  en_preparation:     { label: 'Em preparação',        color: 'bg-orange-100 text-orange-800', icon: Package },
  prete:              { label: 'Pronta / Disponível',  color: 'bg-teal-100 text-teal-800',     icon: CheckCircle },
  shipped:            { label: 'Enviada',              color: 'bg-purple-100 text-purple-800', icon: Truck },
  em_entrega:         { label: 'Enviada',              color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered:          { label: 'Entregue / Levantada', color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  recuperee:          { label: 'Entregue / Levantada', color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  cancelled:          { label: 'Cancelada',            color: 'bg-red-100 text-red-800',       icon: XCircle },
};

const HIDDEN_STATUSES = new Set(['pending', 'pendente_pagamento']);

function addWorkingDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function BoutiqueOrders() {
  const { orders, loading, initAdminOrdersListener } = useOrderStore();
  const { settings } = usePizzariaSettings();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [editingDeliveryOrder, setEditingDeliveryOrder] = useState<Order | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    const unlock = () => {
      audioNotificationService.unlockAudio();
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  useEffect(() => {
    const unsubscribe = initAdminOrdersListener();
    return () => unsubscribe();
  }, [initAdminOrdersListener]);

  useEffect(() => { setCurrentPage(1); window.scrollTo(0, 0); }, [selectedStatus]);
  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  const filteredOrders = orders.filter(order => {
    if (order.boutique_hidden || HIDDEN_STATUSES.has(order.status)) return false;
    if (selectedStatus === 'all') return true;
    return order.status === selectedStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const currentOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price);

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));

  const formatShortDate = (dateString: string) =>
    new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(dateString));

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === 'cancelled') {
      setOrderToCancel(orderId);
      setShowCancellationModal(true);
      return;
    }
    if (newStatus === 'confirmed' || newStatus === 'confirmee') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setPendingStatus(newStatus);
        setEditingDeliveryOrder(order);
        const workingDays = settings?.estimated_delivery_days ?? 14;
        const d = addWorkingDays(new Date(), workingDays);
        setDeliveryDate(d.toISOString().split('T')[0]);
        setShowDeliveryDateModal(true);
        return;
      }
    }
    try {
      await ordersService.updateOrderStatus(orderId, newStatus as any);
      toast.success('Estado atualizado');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleConfirmDeliveryDate = async () => {
    if (!editingDeliveryOrder || !pendingStatus) return;
    try {
      if (deliveryDate) {
        await ordersService.updateOrderDeliveryDate(editingDeliveryOrder.id, deliveryDate);
      }
      await ordersService.updateOrderStatus(editingDeliveryOrder.id, pendingStatus as any);
      // Decrement stock for tracked products
      try {
        await productsService.decrementStockForOrder(
          editingDeliveryOrder.items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
        );
      } catch (stockErr) {
        console.warn('Aviso: erro ao decrementar stock', stockErr);
      }
      toast.success('Encomenda confirmada' + (deliveryDate ? ` — entrega prevista para ${formatShortDate(deliveryDate)}` : ''));
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setShowDeliveryDateModal(false);
      setEditingDeliveryOrder(null);
      setPendingStatus(null);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!orderToCancel) return;
    try {
      await ordersService.updateOrderStatus(orderToCancel, 'cancelled', cancellationReason || undefined);
      toast.success('Encomenda cancelada');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setShowCancellationModal(false);
      setOrderToCancel(null);
      setCancellationReason('');
    }
  };

  const handleDeleteAll = async () => {
    if (deletePassword !== (settings?.delete_password || '')) {
      toast.error('Palavra-passe incorreta');
      return;
    }
    setIsDeleting(true);
    try {
      await ordersService.deleteAllOrders();
      toast.success('Todas as encomendas foram eliminadas');
      setShowDeleteModal(false);
      setDeletePassword('');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de encomendas</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none">
            <option value="all">Todos os estados</option>
            <option value="em_espera">Pendente</option>
            <option value="confirmed">Confirmada</option>
            <option value="preparing">Em preparação</option>
            <option value="prete">Pronta / Disponível</option>
            <option value="shipped">Enviada</option>
            <option value="delivered">Entregue / Levantada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <button onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm transition">
            <Trash2 className="h-4 w-4" /> Eliminar tudo
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma encomenda{selectedStatus !== 'all' ? ' com este estado' : ''}.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {totalPages > 1 && (
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {(currentPage - 1) * ordersPerPage + 1}–{Math.min(currentPage * ordersPerPage, filteredOrders.length)} de {filteredOrders.length}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">← Ant.</button>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Seg. →</button>
              </div>
            </div>
          )}

          {/* Mobile */}
          <div className="sm:hidden divide-y">
            {currentOrders.map(order => {
              const cfg = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700', icon: Clock };
              const StatusIcon = cfg.icon;
              return (
                <div key={order.id} className={`p-4 ${order.status === 'em_espera' ? 'bg-yellow-50' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">#{order.order_number}</span>
                      {order.delivery_type === 'delivery'
                        ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full"><Truck className="h-3 w-3" /></span>
                        : <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full"><Store className="h-3 w-3" /></span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-sm font-medium">{order.user.full_name}</p>
                  <p className="text-sm text-gray-500">{formatPrice(order.total)} · {formatDate(order.created_at)}</p>
                  {order.estimated_delivery_date && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Entrega prevista: {formatShortDate(order.estimated_delivery_date)}
                    </p>
                  )}
                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-1">Anulação: {order.cancellation_reason}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="flex-1 text-sm border rounded px-2 py-1.5 focus:ring-2 focus:ring-accent-500 focus:outline-none">
                      <option value="em_espera">Pendente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="preparing">Em preparação</option>
                      <option value="prete">Pronta / Disponível</option>
                      {order.delivery_type === 'delivery' && <option value="shipped">Enviada</option>}
                      <option value="delivered">Entregue / Levantada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                    <button onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <ul className="hidden sm:block divide-y">
            {currentOrders.map(order => {
              const cfg = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700', icon: Clock };
              const StatusIcon = cfg.icon;
              return (
                <li key={order.id} className={`px-6 py-4 ${order.status === 'em_espera' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">Encomenda #{order.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                          {order.delivery_type === 'delivery'
                            ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><Truck className="h-3 w-3" /> Entrega</span>
                            : <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><Store className="h-3 w-3" /> Levantamento</span>}
                          {order.estimated_delivery_date && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatShortDate(order.estimated_delivery_date)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-3">
                          <span>{formatDate(order.created_at)}</span>
                          <span>{formatPrice(order.total)}</span>
                          <span>{order.user.full_name}</span>
                        </div>
                        {order.status === 'cancelled' && order.cancellation_reason && (
                          <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {order.cancellation_reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-accent-500 focus:outline-none">
                        <option value="em_espera">Pendente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="preparing">Em preparação</option>
                        <option value="prete">Pronta / Disponível</option>
                        {order.delivery_type === 'delivery' && <option value="shipped">Enviada</option>}
                        <option value="delivered">Entregue / Levantada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                      <button onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1 px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-50">
                        <Eye className="h-4 w-4" /> Detalhes
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-sm">
              <span className="text-gray-600">{currentPage}/{totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">← Anterior</button>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Seguinte →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Detalhes */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-bold">Encomenda #{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Cliente</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p className="font-medium">{selectedOrder.user.full_name}</p>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{selectedOrder.user.phone}</div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{selectedOrder.user.email}</div>
                  {selectedOrder.user.address && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />{selectedOrder.user.address}</div>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${selectedOrder.delivery_type === 'delivery' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {selectedOrder.delivery_type === 'delivery'
                    ? <><Truck className="h-5 w-5 text-green-700" /><h4 className="font-medium text-green-900">Entrega ao domicílio</h4></>
                    : <><Store className="h-5 w-5 text-blue-700" /><h4 className="font-medium text-blue-900">Levantamento em loja</h4></>}
                </div>
                {selectedOrder.delivery_type === 'delivery' && selectedOrder.delivery_address && (
                  <p className="text-sm text-green-800 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />{selectedOrder.delivery_address}
                  </p>
                )}
                {selectedOrder.estimated_delivery_date && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Entrega estimada: <strong>{formatShortDate(selectedOrder.estimated_delivery_date)}</strong></span>
                  </div>
                )}
                {selectedOrder.shipped_at && (
                  <p className="text-xs text-purple-700 mt-1">Enviada em {formatDate(selectedOrder.shipped_at)}</p>
                )}
                {selectedOrder.delivered_at && (
                  <p className="text-xs text-green-700 mt-1">Entregue em {formatDate(selectedOrder.delivered_at)}</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Artigos</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.size_label || item.size}
                          {item.selected_option && ` · ${item.selected_option}`}
                          {' · '}×{item.quantity}
                        </p>
                      </div>
                      <span className="font-medium text-sm">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                {selectedOrder.delivery_fee ? (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Taxa de entrega</span>
                    <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total pago</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.status === 'cancelled' && selectedOrder.cancellation_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-900">Motivo de anulação:</p>
                  <p className="text-sm text-red-800">{selectedOrder.cancellation_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Data de Entrega */}
      {showDeliveryDateModal && editingDeliveryOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">Confirmar encomenda #{editingDeliveryOrder.order_number}</h3>
            <p className="text-sm text-gray-500 mb-4">Indique a data de entrega estimada (opcional).</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Data de entrega estimada
              </label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
              <p className="text-xs text-gray-400 mt-1">Prazo configurado: {settings?.estimated_delivery_days ?? 14} dias úteis.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeliveryDateModal(false); setPendingStatus(null); setEditingDeliveryOrder(null); }}
                className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleConfirmDeliveryDate}
                className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelamento */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-2">Cancelar a encomenda</h3>
            <p className="text-sm text-gray-500 mb-4">Este motivo será visível pelo cliente.</p>
            <textarea value={cancellationReason} onChange={e => setCancellationReason(e.target.value)}
              rows={3} placeholder="Ex: Produto esgotado…"
              className="w-full px-3 py-2 border rounded-md mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setShowCancellationModal(false); setOrderToCancel(null); setCancellationReason(''); }}
                className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Voltar</button>
              <button onClick={handleConfirmCancellation}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirmar cancelamento</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Tudo */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Eliminar todas as encomendas</h3>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded mb-4">
              Ação irreversível. Introduza a palavra-passe de administrador para confirmar.
            </p>
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              placeholder="Palavra-passe…"
              className="w-full px-3 py-2 border rounded-md mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none" />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDeleteAll} disabled={isDeleting || !deletePassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isDeleting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />A eliminar…</> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

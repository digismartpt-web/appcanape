import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, CheckCircle, XCircle, Eye, Phone, Mail, MapPin, Truck, Store, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';
import { ordersService, proRequestsService } from '../services/supabaseService';
import { checkOpeningHours } from '../services/openingHoursService';
import type { Order, ProRequest } from '../types';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:             { label: 'Pagamento pendente',      color: 'bg-gray-100 text-gray-800',     icon: Clock },
  pendente_pagamento:  { label: 'Pagamento pendente',      color: 'bg-gray-100 text-gray-800',     icon: Clock },
  em_espera:           { label: 'Pendente',                color: 'bg-yellow-100 text-yellow-800',  icon: Clock },
  confirmed:           { label: 'Confirmada',              color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
  confirmee:           { label: 'Confirmada',              color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
  preparing:           { label: 'Em preparação',           color: 'bg-orange-100 text-orange-800', icon: Package },
  en_preparation:      { label: 'Em preparação',           color: 'bg-orange-100 text-orange-800', icon: Package },
  prete:               { label: 'Pronta / Disponível',     color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  shipped:             { label: 'Enviada',                 color: 'bg-purple-100 text-purple-800', icon: Truck },
  em_entrega:          { label: 'Enviada',                 color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered:           { label: 'Entregue',                color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  recuperee:           { label: 'Levantada',               color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  cancelled:           { label: 'Cancelada',               color: 'bg-red-100 text-red-800',       icon: XCircle },
};

export default function MesCommandes() {
  const { user } = useAuth();
  const { settings } = usePizzariaSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [proRequest, setProRequest] = useState<ProRequest | null | undefined>(undefined);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = ordersService.subscribeToUserOrders(user.id, (userOrders) => {
      setOrders(userOrders);
      setLoading(false);
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    proRequestsService.fetchMyProRequest(user.id)
      .then(req => setProRequest(req))
      .catch(() => setProRequest(null));
  }, [user?.id]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatPrice = (price: number) => `${price.toFixed(2)} €`;

  const handlePayNow = async (order: Order) => {
    let openingHoursCheck: any = { isOpen: false, message: 'Horário não configurado' };
    try {
      if (settings?.opening_hours) {
        openingHoursCheck = checkOpeningHours(settings.opening_hours, settings.cutoff_minutes_before_closing);
      }
    } catch { /* ignore */ }

    const canOrder = settings?.is_open && openingHoursCheck.isOpen;
    if (!canOrder) {
      if (settings && !settings.is_open) {
        alert('⚠️ A loja está fechada neste momento. Não é possível processar o seu pagamento.');
      } else {
        alert(`⚠️ ${(openingHoursCheck as any).message || 'A loja está fechada neste momento.'}`);
      }
      return;
    }

    setIsProcessingPayment(order.id);
    try {
      const stripeItems = [...order.items];
      if (order.delivery_type === 'delivery' && order.delivery_fee && order.delivery_fee > 0) {
        stripeItems.push({
          product_id: 'frais-livraison',
          product_name: 'Custos de entrega',
          size: 'unique',
          quantity: 1,
          price: order.delivery_fee,
        } as any);
      }
      const sessionData = await ordersService.createStripeSession(order.id, stripeItems, order.user.email);
      if (sessionData?.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error('Impossível gerar o link de pagamento');
      }
    } catch (error: any) {
      alert(`Erro no pagamento: ${error.message || 'Por favor tente novamente mais tarde'}`);
    } finally {
      setIsProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4" />
          <p className="text-gray-600">A carregar as suas encomendas…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">As Minhas Encomendas</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Acompanhe o estado das suas encomendas em tempo real</p>
        </div>

        {/* Pro access status banners */}
        {proRequest !== undefined && (
          <>
            {user?.pro_validated && proRequest?.status === 'approved' && (
              <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Acesso profissional ativo</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    O seu pedido de acesso profissional foi aprovado! Já tem acesso aos preços profissionais
                    {user.pro_discount_percent ? ` com ${user.pro_discount_percent}% de desconto` : ''}.
                  </p>
                </div>
              </div>
            )}

            {proRequest?.status === 'pending' && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pedido em análise</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    O seu pedido de acesso profissional está em análise. Entraremos em contacto em breve.
                  </p>
                </div>
              </div>
            )}

            {proRequest?.status === 'rejected' && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Pedido rejeitado</p>
                  {proRequest.rejection_reason && (
                    <p className="text-sm text-red-700 mt-0.5">
                      <strong>Motivo:</strong> {proRequest.rejection_reason}
                    </p>
                  )}
                  <Link
                    to="/acesso-profissional"
                    className="inline-block mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
                  >
                    Submeter um novo pedido
                  </Link>
                </div>
              </div>
            )}

            {!proRequest && !user?.pro_validated && (
              <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    Ainda não pediu acesso profissional.{' '}
                    <Link to="/acesso-profissional" className="font-semibold underline hover:text-blue-900">
                      Solicitar agora
                    </Link>
                    {' '}e aceda a preços exclusivos.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma encomenda</h3>
            <p className="text-gray-600">Ainda não fez nenhuma encomenda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status?.icon || Clock;

              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Encomenda #{order.order_number}</h3>
                          <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status?.color || 'bg-gray-100 text-gray-800'}`}>
                          {status?.label || order.status}
                        </span>
                        {(order.status === 'pendente_pagamento' || order.status === 'pending') && (
                          <button onClick={() => handlePayNow(order)} disabled={isProcessingPayment === order.id}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 touch-manipulation">
                            {isProcessingPayment === order.id
                              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              : <CreditCard className="w-4 h-4 mr-2" />}
                            Pagar agora
                          </button>
                        )}
                        <button onClick={() => setSelectedOrder(order)}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 touch-manipulation">
                          <Eye className="w-4 h-4 mr-2" />
                          Detalhes
                        </button>
                      </div>
                    </div>

                    {order.status === 'cancelled' && order.cancellation_reason && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start">
                          <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-red-900 mb-1">Motivo de cancelamento:</p>
                            <p className="text-sm text-red-800">{order.cancellation_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {order.estimated_delivery_date && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-800">
                        <Truck className="w-4 h-4 flex-shrink-0" />
                        Entrega estimada a {new Date(order.estimated_delivery_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                      <p className="text-sm text-gray-600">{order.items.length} artigo{order.items.length > 1 ? 's' : ''}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de detalhes */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Encomenda #{selectedOrder.order_number}
                  </h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Estado */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Estado</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                    </span>
                  </div>

                  {/* Seguimento */}
                  {(selectedOrder.estimated_delivery_date || (selectedOrder as any).shipped_at || (selectedOrder as any).delivered_at) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Seguimento</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {selectedOrder.estimated_delivery_date && (
                          <p>Entrega estimada: <strong>{new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p>
                        )}
                        {(selectedOrder as any).shipped_at && (
                          <p>Enviada a: <strong>{formatDate((selectedOrder as any).shipped_at)}</strong></p>
                        )}
                        {(selectedOrder as any).delivered_at && (
                          <p>Entregue a: <strong>{formatDate((selectedOrder as any).delivered_at)}</strong></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contactos do cliente */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Os seus contactos</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />{selectedOrder.user.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />{selectedOrder.user.email}
                      </div>
                    </div>
                  </div>

                  {/* Modo de entrega */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Modo de entrega</h4>
                    <div className={`p-4 rounded-lg ${selectedOrder.delivery_type === 'delivery' ? 'bg-green-50' : 'bg-blue-50'}`}>
                      <div className="flex items-center mb-2">
                        {selectedOrder.delivery_type === 'delivery' ? (
                          <>
                            <Truck className="w-5 h-5 mr-2 text-green-700" />
                            <span className="font-medium text-green-900">Entrega ao domicílio</span>
                          </>
                        ) : (
                          <>
                            <Store className="w-5 h-5 mr-2 text-blue-700" />
                            <span className="font-medium text-blue-900">Recolha em loja</span>
                          </>
                        )}
                      </div>
                      {selectedOrder.delivery_type === 'delivery' && selectedOrder.delivery_address ? (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-green-900 mb-1">Morada de entrega:</p>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.delivery_address)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-sm text-green-800 hover:underline flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />{selectedOrder.delivery_address}
                          </a>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-blue-900 mb-1">Morada de recolha:</p>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.pickup_address || settings.address)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-800 hover:underline flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />{selectedOrder.pickup_address || settings.address}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motivo de cancelamento */}
                  {selectedOrder.status === 'cancelled' && selectedOrder.cancellation_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-red-900 mb-1">Encomenda cancelada</h4>
                          <p className="text-sm text-red-800"><strong>Motivo:</strong> {selectedOrder.cancellation_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Artigos */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Artigos encomendados</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-medium text-gray-900">{item.product_name}</h5>
                            <span className="text-sm font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Qtd: {item.quantity} × {formatPrice(item.price)}
                          </p>
                          {item.size_label && item.size_label.toLowerCase() !== 'unique' && item.size_label.toLowerCase() !== 'único' && (
                            <p className="text-sm text-gray-600">Tamanho: {item.size_label}</p>
                          )}
                          {item.selected_option && (
                            <p className="text-sm text-gray-600">Opção: {item.selected_option}</p>
                          )}
                          {item.product_category && (
                            <p className="text-sm text-primary-600">Categoria: {item.product_category}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 space-y-2">
                    {selectedOrder.delivery_type === 'delivery' && selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Custos de entrega</span>
                        <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total</span>
                      <span className="text-lg font-semibold text-gray-900">{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <strong>Encomendado a:</strong> {formatDate(selectedOrder.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

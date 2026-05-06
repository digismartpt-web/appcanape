import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, Truck, Store, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuth } from '../hooks/useAuth';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';
import { ordersService, getProPrice } from '../services/supabaseService';
import type { OrderItem, DeliveryType } from '../types';
import toast from 'react-hot-toast';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose }) => {
  const {
    items, updateQuantity, removeItem, getTotal,
    deliveryType, deliveryAddress, setDeliveryType, setDeliveryAddress, promotions
  } = useCartStore();
  const { user } = useAuth();
  const { settings } = usePizzariaSettings();
  const navigate = useNavigate();
  const [localDeliveryType, setLocalDeliveryType] = useState<DeliveryType>(deliveryType);
  const [localDeliveryAddress, setLocalDeliveryAddress] = useState(user?.address || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStoreOpen = settings?.is_open !== false;
  const isProUser = user?.pro_validated === true;
  const proDiscount = user?.pro_discount_percent ?? 0;

  const getItemEffectiveUnitPrice = (item: typeof items[number]) => {
    if (isProUser) return getProPrice(item.product, item.sizeCode, proDiscount);
    return (item.price - (item.discount || 0)) / item.quantity;
  };

  const getProTotal = () =>
    items.reduce((sum, item) => sum + getItemEffectiveUnitPrice(item) * item.quantity, 0);

  useEffect(() => {
    if (isOpen) {
      setLocalDeliveryType(deliveryType);
      setLocalDeliveryAddress(deliveryAddress || user?.address || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      alert('⚠️ Tem de ter sessão iniciada para fazer uma encomenda.');
      onClose();
      navigate('/auth');
      return;
    }
    if (!isStoreOpen) {
      alert('⚠️ A loja está fechada neste momento. Volte em breve!');
      return;
    }
    if (localDeliveryType === 'delivery' && !localDeliveryAddress.trim()) {
      alert('⚠️ Por favor introduza a sua morada de entrega.');
      return;
    }

    setDeliveryType(localDeliveryType);
    setDeliveryAddress(localDeliveryAddress);
    setIsSubmitting(true);

    try {
      const orderItems: OrderItem[] = items.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.sizeCode,
        size_label: item.sizeLabel,
        selected_option: item.selectedOption,
        quantity: item.quantity,
        price: getItemEffectiveUnitPrice(item)
      }));

      const deliveryFee = localDeliveryType === 'delivery' && settings?.delivery_fee ? settings.delivery_fee : 0;
      const itemsTotal = isProUser ? getProTotal() : getTotal();

      const orderData = {
        user_id: user.id,
        user: { full_name: user.full_name, phone: user.phone, address: user.address, email: user.email },
        pickup_address: settings?.address || '',
        delivery_type: localDeliveryType,
        delivery_address: localDeliveryType === 'delivery' ? localDeliveryAddress : undefined,
        items: orderItems,
        total: itemsTotal + deliveryFee,
        delivery_fee: deliveryFee || undefined,
        commission_total: 0,
        status: 'pendente_pagamento' as const
      };

      const orderId = await ordersService.createOrder(orderData);

      const stripeItems = [...orderItems];
      if (localDeliveryType === 'delivery' && deliveryFee > 0) {
        stripeItems.push({
          product_id: 'frais-livraison',
          product_name: 'Custos de entrega',
          size: 'unique',
          quantity: 1,
          price: deliveryFee
        } as OrderItem);
      }

      const session = await ordersService.createStripeSession(orderId, stripeItems, user.email);
      if (session?.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Impossível gerar o link de pagamento.');
      }
    } catch (error: any) {
      console.error('Erro encomenda:', error);
      alert(`Erro ao fazer a encomenda. Por favor tente novamente.\n\nDetalhes: ${error.message || 'Erro de rede'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBannerMessage = () => {
    if (promotions.length === 0) return null;
    let closestPromo: { missing: number; reward: string } | null = null;
    let minMissing = Infinity;

    for (const promo of promotions) {
      if (!promo.active) continue;
      const matchingItems = items.filter(item => {
        if (promo.buyCondition.productIds && !promo.buyCondition.productIds.includes(item.product.id)) return false;
        return true;
      });
      const currentQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
      const missing = promo.buyCondition.count - currentQty;
      if (missing > 0 && missing < minMissing) {
        minMissing = missing;
        closestPromo = { missing, reward: promo.description.split('e ganhe')[1] || promo.description.split('et gagnez')[1] || promo.name };
      }
    }

    if (closestPromo) {
      return (
        <div className="mb-4 p-4 bg-accent-50 border-l-4 border-accent-500 rounded-lg flex items-center gap-3">
          <Gift className="w-6 h-6 text-accent-600 shrink-0" />
          <p className="text-accent-800 font-medium">
            Mais <span className="font-bold text-accent-600">{closestPromo.missing}</span> artigo(s) para ganhar {closestPromo.reward}!
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" /> O Meu Carrinho
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Fechar">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {items.length === 0 && !isSubmitting ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">O seu carrinho está vazio</p>
              <p className="text-sm">Descubra os nossos produtos!</p>
            </div>
          ) : (
            <>
              {isSubmitting && (
                <div className="mb-4 p-4 bg-accent-50 border border-accent-200 rounded-lg flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-accent-800 font-bold">A redirecionar para pagamento seguro…</p>
                </div>
              )}
              {getBannerMessage()}

              {!isStoreOpen && (
                <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-900">LOJA FECHADA</p>
                  <p className="text-sm text-red-800 mt-1">As encomendas não são aceites neste momento.</p>
                </div>
              )}

              {/* Type de livraison */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Modo de entrega</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setLocalDeliveryType('pickup')}
                    className={`p-4 rounded-lg border-2 transition-all ${localDeliveryType === 'pickup' ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-gray-300 hover:border-gray-400'}`}>
                    <Store className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Recolha</p>
                    <p className="text-xs text-gray-600 mt-1">Na loja</p>
                  </button>
                  <button onClick={() => setLocalDeliveryType('delivery')}
                    className={`p-4 rounded-lg border-2 transition-all ${localDeliveryType === 'delivery' ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-gray-300 hover:border-gray-400'}`}>
                    <Truck className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Entrega</p>
                    <p className="text-xs text-gray-600 mt-1">Ao domicílio</p>
                  </button>
                </div>

                {/* Délai livraison */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  🚚 <strong>Entrega estimada em {settings?.estimated_delivery_days ?? 14} dias úteis</strong> após confirmação da encomenda.
                </div>

                {localDeliveryType === 'delivery' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Morada de entrega</label>
                    <input
                      type="text"
                      value={localDeliveryAddress}
                      onChange={(e) => setLocalDeliveryAddress(e.target.value)}
                      placeholder="Número, rua, código postal, localidade…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                )}
              </div>

              {/* Liste articles */}
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-lg">
                    {item.product.image_url && (
                      <img src={item.product.image_url} alt={item.product.name}
                        className="w-full sm:w-16 h-32 sm:h-16 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-lg truncate">{item.product.name}</h3>
                          <p className="text-gray-500 text-sm">
                            {item.sizeLabel}
                            {item.selectedOption && ` • ${item.selectedOption}`}
                          </p>
                        </div>
                        <div className="text-right">
                          {item.discount && item.discount > 0 ? (
                            <>
                              <p className="font-bold text-accent-600 text-lg">
                                {item.isFree ? 'OFERTA' : `${(item.price - item.discount).toFixed(2)}€`}
                              </p>
                              <p className="text-sm text-gray-400 line-through">{item.price.toFixed(2)}€</p>
                            </>
                          ) : (
                            <p className="font-bold text-lg">{item.price.toFixed(2)}€</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white rounded-full transition-shadow" title="Remover 1">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white rounded-full transition-shadow" title="Adicionar 1">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm font-medium hover:text-red-700">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 sm:p-6 flex-shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{items.reduce((s, i) => s + i.price, 0).toFixed(2)}€</span>
              </div>
              {items.some(i => (i.discount || 0) > 0) && (
                <div className="flex justify-between text-accent-600 font-bold">
                  <span className="flex items-center gap-1"><Gift className="w-4 h-4" /> Descontos:</span>
                  <span>-{items.reduce((s, i) => s + (i.discount || 0), 0).toFixed(2)}€</span>
                </div>
              )}
              {isProUser && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full">Preço Pro</span>
                  </span>
                  <span>{getProTotal().toFixed(2)}€</span>
                </div>
              )}
              {localDeliveryType === 'delivery' && settings?.delivery_fee && (
                <div className="flex justify-between text-gray-600">
                  <span>Custos de entrega:</span>
                  <span>{settings.delivery_fee.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-primary-900 pt-2 border-t">
                <span>Total:</span>
                <span>{((isProUser ? getProTotal() : getTotal()) + (localDeliveryType === 'delivery' && settings?.delivery_fee ? settings.delivery_fee : 0)).toFixed(2)}€</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={!isStoreOpen || isSubmitting || items.length === 0 || (localDeliveryType === 'delivery' && !localDeliveryAddress.trim())}
              className="w-full bg-accent-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />A processar…</>
              ) : !isStoreOpen ? 'Loja fechada' : 'Pagar online'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

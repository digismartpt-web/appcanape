import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, Truck, Store, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuth } from '../hooks/useAuth';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';
import { ordersService } from '../services/supabaseService';
import { calculateDeliveryTime } from '../services/deliveryTimeService';
import { checkOpeningHours } from '../services/openingHoursService';
import { AddressAutocomplete } from './AddressAutocomplete';
import { calculateCommissionAmount } from '../utils/priceUtils';
import type { OrderItem, DeliveryType } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose }) => {
  const {
    items,
    updateQuantity,
    removeItem,
    getTotal,
    clearCart,
    deliveryType,
    deliveryAddress,
    setDeliveryType,
    setDeliveryAddress,
    promotions
  } = useCartStore();
  const { user } = useAuth();
  const { settings } = usePizzariaSettings();
  const navigate = useNavigate();
  const [localDeliveryType, setLocalDeliveryType] = useState<DeliveryType>(deliveryType);
  const [localDeliveryAddress, setLocalDeliveryAddress] = useState(deliveryAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  let openingHoursCheck: { isOpen: boolean; message: string } = { isOpen: false, message: 'Horários não configurados' };
  try {
    const check = settings.opening_hours ? checkOpeningHours(settings.opening_hours, settings.cutoff_minutes_before_closing) : { isOpen: false, message: 'Horários não configurados' };
    openingHoursCheck = { isOpen: check.isOpen, message: check.message || '' };
  } catch (error) {
    console.error('Erro ao verificar os horários dans CartModal:', error);
  }
  const canOrder = settings.is_open && openingHoursCheck.isOpen;

  // Initialisation synchronisée une seule fois à l'ouverture du modal
  useEffect(() => {
    if (isOpen) {
      setLocalDeliveryType(deliveryType);
      setLocalDeliveryAddress(deliveryAddress);
    }
  }, [isOpen]); // On ne synchronise qu'à l'ouverture

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      alert('⚠️ Precisa fazer login para fazer um pedido!');
      onClose();
      navigate('/auth');
      return;
    }

    const minDeliveryAmount = settings.min_delivery_amount || 10;
    if (localDeliveryType === 'delivery' && getTotal() < minDeliveryAmount) {
      alert(`⚠️ O valor mínimo para entrega é de ${minDeliveryAmount.toFixed(2)}€.\n\nPor favor, adicione mais itens ao seu carrinho ou escolha a opção "Levantar no restaurante".`);
      return;
    }

    if (!canOrder) {
      if (!settings.is_open) {
        alert('⚠️ O restaurante está fechado no momento. Por favor, volte mais tarde!');
      } else if (!openingHoursCheck.isOpen) {
        alert(`⚠️ ${openingHoursCheck.message}`);
      }
      return;
    }

    if (localDeliveryType === 'delivery' && !localDeliveryAddress.trim()) {
      alert('⚠️ Por favor, insira a morada de entrega!');
      return;
    }

    // On synchronise les états finaux dans le store
    setDeliveryType(localDeliveryType);
    setDeliveryAddress(localDeliveryAddress);
    setIsSubmitting(true);

    try {
      console.log('🚀 Iniciando checkout...');
      const orderItems: OrderItem[] = items.map(item => ({
        pizza_id: item.pizza.id,
        pizza_name: item.pizza.name,
        pizza_category: item.pizza.category,
        size: item.size,
        quantity: item.quantity,
        price: (item.price - (item.discount || 0)) / item.quantity,
        removed_ingredients: item.removedIngredients,
        extras: item.extras,
        custom_ingredients: item.customIngredients
      }));

      let estimatedTime = 20;
      let deliveryDistance = undefined;

      if (localDeliveryType === 'delivery' && settings.address) {
        try {
          const estimate = await calculateDeliveryTime(
            settings.address,
            localDeliveryAddress
          );
          estimatedTime = estimate.duration;
          deliveryDistance = estimate.distance;

          if (settings.max_delivery_distance && settings.max_delivery_distance > 0 && deliveryDistance > settings.max_delivery_distance) {
            alert(`⚠️ Desculpe, não conseguimos entregar nesta morada!\n\nDistância: ${deliveryDistance.toFixed(1)} km\nDistância máxima: ${settings.max_delivery_distance} km\n\nNo entanto, pode vir levantar a sua encomenda ao nosso restaurante.`);
            setIsSubmitting(false); // On débloque le bouton
            return;
          }
        } catch (error) {
          console.error('Erro ao calcular tempo de entrega:', error);
          estimatedTime = 30;
        }
      }

      const commissionPercent = settings.service_fee_percentage || 10;
      const publicDeliveryFee = localDeliveryType === 'delivery' && settings.delivery_fee
        ? settings.delivery_fee
        : 0;

      // Cálculo da comissão total
      const itemsCommission = items.reduce((sum, item) => {
        const itemPriceAfterDiscount = item.price - (item.discount || 0);
        return sum + calculateCommissionAmount(itemPriceAfterDiscount, commissionPercent);
      }, 0);
      const deliveryCommission = calculateCommissionAmount(publicDeliveryFee, commissionPercent);
      const commissionTotal = itemsCommission + deliveryCommission;

      const orderData = {
        user_id: user.id,
        user: {
          full_name: user.full_name,
          phone: user.phone,
          address: user.address,
          email: user.email
        },
        pickup_address: settings.address,
        delivery_type: localDeliveryType,
        delivery_address: localDeliveryType === 'delivery' ? localDeliveryAddress : undefined,
        items: orderItems,
        total: getTotal() + publicDeliveryFee,
        delivery_fee: localDeliveryType === 'delivery' ? publicDeliveryFee : undefined,
        commission_total: commissionTotal,
        estimated_time: estimatedTime,
        delivery_distance: deliveryDistance,
        status: 'pendente_pagamento' as const
      };

      const orderId = await ordersService.createOrder(orderData);

      // Novo: Criar sessão do Stripe e redirecionar para pagamento
      const session = await ordersService.createStripeSession(orderId, orderItems, user.email);
      
      if (session && session.url) {
        clearCart();
        window.location.href = session.url;
      } else {
        throw new Error('Não foi possível gerar o link de pagamento');
      }

    } catch (error: any) {
      console.error('Erro na encomenda:', error);
      alert(`Erro ao fazer a encomenda. Por favor, tente novamente.\n\nDetalhes: ${error.message || 'Erro de rede'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    const minDeliveryAmount = settings.min_delivery_amount || 10;
    if (type === 'delivery' && getTotal() < minDeliveryAmount) {
      alert(`⚠️ Atenção: O valor mínimo do pedido para entrega ao domicílio é de ${minDeliveryAmount.toFixed(2)}€.\n\nAtualmente o seu carrinho é de ${getTotal().toFixed(2)}€.`);
      return;
    }
    
    setLocalDeliveryType(type);
    if (type === 'pickup') {
      setLocalDeliveryAddress('');
    }
  };

  const formatCustomizations = (item: any) => {
    const customizations = [];

    if (item.removedIngredients && item.removedIngredients.length > 0) {
      customizations.push(
        <div key="removed" className="text-red-600 text-sm">
          🚫 Sem: {item.removedIngredients.join(', ')}
        </div>
      );
    }

    if (item.extras && item.extras.length > 0) {
      customizations.push(
        <div key="extras" className="text-green-600 text-sm">
          ➕ Extras: {item.extras.map((extra: any) => `${extra.name} (+${extra.price.toFixed(2)}€)`).join(', ')}
        </div>
      );
    }

    if (item.customIngredients && item.customIngredients.length > 0) {
      customizations.push(
        <div key="custom" className="text-blue-600 text-sm font-medium">
          ✨ Ingredientes Extra: {item.customIngredients.join(', ')}
        </div>
      );
    }

    return customizations;
  };

  // Logic for Suggestive Promotion Banner
  const getBannerMessage = () => {
    if (promotions.length === 0) return null;

    let closestPromo: { missing: number; category: string; reward: string } | null = null;
    let minMissing = Infinity;

    for (const promo of promotions) {
      if (!promo.active) continue;

      const matchingItems = items.filter(item => {
        if (promo.buyCondition.category && item.pizza.category !== promo.buyCondition.category) return false;
        if (promo.buyCondition.productIds && !promo.buyCondition.productIds.includes(item.pizza.id)) return false;
        return true;
      });

      const currentQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
      const targetQty = promo.buyCondition.count;

      if (currentQty < targetQty) {
        const missing = targetQty - currentQty;
        if (missing < minMissing) {
          minMissing = missing;
          closestPromo = {
            missing,
            category: promo.buyCondition.category || 'produtos',
            reward: promo.description.split('e ganhe')[1] || promo.name
          };
        }
      }
    }

    if (closestPromo) {
      return (
        <div className="mb-6 p-4 bg-accent-50 border-l-4 border-accent-500 rounded-lg flex items-center gap-3 animate-pulse">
          <Gift className="w-6 h-6 text-accent-600 shrink-0" />
          <p className="text-accent-800 font-medium">
            Faltam apenas <span className="font-bold text-accent-600">{closestPromo.missing}</span> {closestPromo.category === 'produtos' ? 'itens' : closestPromo.category}(s) para você ganhar {closestPromo.reward}!
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            O Meu Carrinho
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            title="Fechar carrinho"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">O seu carrinho está vazio</p>
              <p className="text-sm">Adicione produtos deliciosos!</p>
            </div>
          ) : (
            <>
              {getBannerMessage()}

              {!canOrder && (
                <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl mr-2">🚫</span>
                    <p className="text-lg font-bold text-red-900">
                      {!settings.is_open ? 'RESTAURANTE FECHADO' : 'FORA DO HORÁRIO DE ATENDIMENTO'}
                    </p>
                  </div>
                  <p className="text-sm text-red-800 text-center">
                    {!settings.is_open
                      ? 'O restaurante está fechado no momento. Não é possível fazer novos pedidos. Por favor, volte mais tarde!'
                      : openingHoursCheck.message
                    }
                  </p>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Tipo de Entrega</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleDeliveryTypeChange('pickup')}
                    className={`p-4 rounded-lg border-2 transition-all ${localDeliveryType === 'pickup'
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <Store className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Levantar</p>
                    <p className="text-xs text-gray-600 mt-1">No restaurante</p>
                  </button>

                  <button
                    onClick={() => handleDeliveryTypeChange('delivery')}
                    className={`p-4 rounded-lg border-2 transition-all ${localDeliveryType === 'delivery'
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <Truck className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Entrega</p>
                    <p className="text-xs text-gray-600 mt-1">Na sua morada</p>
                  </button>
                </div>

                {localDeliveryType === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Morada de Entrega *
                    </label>
                    <AddressAutocomplete
                      value={localDeliveryAddress}
                      onChange={setLocalDeliveryAddress}
                      placeholder="Comece a escrever a sua morada..."
                    />
                    {getTotal() < (settings.min_delivery_amount || 10) && (
                      <p className="mt-2 text-xs font-bold text-red-600 animate-pulse">
                        ⚠️ O valor mínimo para entrega é de {(settings.min_delivery_amount || 10).toFixed(2)}€. Adicione mais { ((settings.min_delivery_amount || 10) - getTotal()).toFixed(2) }€ em produtos.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-lg">
                    <img
                      src={item.pizza.image_url}
                      alt={item.pizza.name}
                      className="w-full sm:w-16 h-32 sm:h-16 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-lg truncate">{item.pizza.name}</h3>
                          <p className="text-gray-500 text-sm">
                            {item.size} • {item.pizza.category}
                          </p>
                        </div>
                        <div className="text-right">
                          {item.discount && item.discount > 0 ? (
                            <>
                              <p className="font-bold text-accent-600 text-lg">
                                {item.isFree ? 'GRÁTIS' : `${(item.price - item.discount).toFixed(2)}€`}
                              </p>
                              <p className="text-sm text-gray-400 line-through">
                                {(item.price).toFixed(2)}€
                              </p>
                            </>
                          ) : (
                            <p className="font-bold text-lg">{(item.price).toFixed(2)}€</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {formatCustomizations(item)}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white rounded-full transition-shadow"
                            title="Remover 1"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white rounded-full transition-shadow"
                            title="Adicionar 1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 text-sm font-medium hover:text-red-700"
                        >
                          Remover
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
                <span>{items.reduce((sum, i) => sum + i.price, 0).toFixed(2)}€</span>
              </div>

              {items.some(i => (i.discount || 0) > 0) && (
                <div className="flex justify-between text-accent-600 font-bold italic">
                  <span className="flex items-center gap-1">
                    <Gift className="w-4 h-4" /> Promoções & Ofertas:
                  </span>
                  <span>-{items.reduce((sum, i) => sum + (i.discount || 0), 0).toFixed(2)}€</span>
                </div>
              )}

              {localDeliveryType === 'delivery' && settings.delivery_fee && (
                <div className="flex justify-between text-gray-600">
                  <span>Taxa de Entrega:</span>
                  <span>{settings.delivery_fee.toFixed(2)}€</span>
                </div>
              )}

              <div className="flex justify-between text-2xl font-black text-primary-900 pt-2 border-t">
                <span>Total:</span>
                <span>
                  {(getTotal() + (localDeliveryType === 'delivery' && settings.delivery_fee ? settings.delivery_fee : 0)).toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCheckout}
                disabled={!canOrder || isSubmitting}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-3 ${!canOrder || isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-accent-600 text-white hover:bg-accent-700'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    A processar...
                  </>
                ) : !canOrder ? (
                  'Restaurante Fechado'
                ) : (
                  'Pagar Online'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
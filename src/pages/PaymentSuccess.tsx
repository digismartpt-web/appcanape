import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { ordersService } from '../services/supabaseService';
import toast from 'react-hot-toast';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const confirmOrder = async () => {
      if (!orderId) {
        setStatus('error');
        return;
      }

      try {
        const success = await ordersService.confirmPayment(orderId);
        if (success) {
          setStatus('success');
          toast.success('Pagamento confirmado!');
          setTimeout(() => navigate('/mes-commandes'), 4000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Erro ao confirmar:', error);
        setStatus('error');
      }
    };

    confirmOrder();
  }, [orderId, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-16 h-16 text-accent-600 animate-spin mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Confirmando o seu pagamento...</h1>
        <p className="text-gray-600 mt-2">Por favor, não feche esta página.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">❌</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Algo correu mal</h1>
        <p className="text-lg text-gray-600 max-w-md mb-8">
          Não conseguimos confirmar o seu pagamento automaticamente. Por favor, contacte o restaurante com o número da sua encomenda.
        </p>
        <button
          onClick={() => navigate('/mes-commandes')}
          className="bg-accent-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-accent-700 transition-colors flex items-center gap-2"
        >
          Ver as minhas encomendas <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Pagamento Confirmado!</h1>
      <p className="text-lg text-gray-600 max-w-md mb-8">
        Obrigado pela sua encomenda. O restaurante já recebeu o seu pedido e começará a prepará-lo em breve.
      </p>
      <div className="space-y-4">
        <button
          onClick={() => navigate('/mes-commandes')}
          className="bg-accent-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-accent-700 transition-colors flex items-center gap-2 w-full justify-center"
        >
          Ver as minhas encomendas <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-sm text-gray-500">
          Será redirecionado automaticamente em alguns segundos...
        </p>
      </div>
    </div>
  );
};

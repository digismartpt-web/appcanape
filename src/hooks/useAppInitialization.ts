import { useState, useEffect } from 'react';
import { InitializationService } from '../services/initializationService';

interface InitializationState {
  loading: boolean;
  supabaseAvailable: boolean;
  pizzasInitialized: boolean;
  source: 'supabase' | 'mock';
  error: string | null;
}

export function useAppInitialization() {
  const [state, setState] = useState<InitializationState>({
    loading: true,
    supabaseAvailable: false,
    pizzasInitialized: false,
    source: 'mock',
    error: null
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const result = await InitializationService.autoInitialize();
        
        setState({
          loading: false,
          supabaseAvailable: result.supabaseAvailable,
          pizzasInitialized: result.pizzasInitialized,
          source: result.source as 'supabase' | 'mock',
          error: null
        });
      } catch (error: unknown) {
        setState({
          loading: false,
          supabaseAvailable: false,
          pizzasInitialized: false,
          source: 'mock',
          error: error.message || 'Erro na inicialização'
        });
      }
    };

    initialize();
  }, []);

  return state;
}
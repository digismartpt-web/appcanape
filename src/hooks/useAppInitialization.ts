import { useState, useEffect } from 'react';
import { InitializationService } from '../services/initializationService';

interface InitializationState {
  loading: boolean;
  firebaseAvailable: boolean;
  pizzasInitialized: boolean;
  source: 'firebase' | 'mock';
  error: string | null;
}

export function useAppInitialization() {
  const [state, setState] = useState<InitializationState>({
    loading: true,
    firebaseAvailable: false,
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
          firebaseAvailable: result.firebaseAvailable,
          pizzasInitialized: result.pizzasInitialized,
          source: result.source,
          error: null
        });
      } catch (error: any) {
        setState({
          loading: false,
          firebaseAvailable: false,
          pizzasInitialized: false,
          source: 'mock',
          error: error.message || 'Erreur lors de l\'initialisation'
        });
      }
    };

    initialize();
  }, []);

  return state;
}
import { supabase } from '../lib/supabase';
import { MOCK_PIZZAS } from '../data/mockData';

export class InitializationService {
  /**
   * Check if Supabase is available
   */
  static isSupabaseAvailable(): boolean {
    return !!supabase;
  }

  /**
   * Check if the pizzas table is empty
   */
  static async isPizzaCollectionEmpty(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('pizzas')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn('⚠️ Error checking pizzas table:', error.message);
        return true;
      }
      return (count ?? 0) === 0;
    } catch (error) {
      console.error('Erro ao verificar a tabela de pizzas:', error);
      return true;
    }
  }

  /**
   * Initialize Supabase with default pizzas
   */
  static async initializePizzasInSupabase(): Promise<boolean> {
    try {
      console.log('🍕 Inserting default pizzas in Supabase...');
      const rows = MOCK_PIZZAS.map((pizza: any) => ({
        name: pizza.name,
        description: pizza.description || '',
        category: pizza.category || '',
        image_url: pizza.image_url || '',
        ingredients: pizza.ingredients || [],
        has_unique_price: pizza.has_unique_price ?? false,
        price_small: pizza.prices?.small ?? 0,
        price_medium: pizza.prices?.medium ?? 0,
        price_large: pizza.prices?.large ?? 0,
        customizable: pizza.customizable ?? false,
        max_custom_ingredients: pizza.max_custom_ingredients ?? 3,
        custom_ingredients: pizza.custom_ingredients || [],
        active: true
      }));

      const { error } = await supabase.from('pizzas').insert(rows);
      if (error) throw error;

      console.log(`✅ ${MOCK_PIZZAS.length} pizzas added to Supabase`);
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização das pizzas:', error);
      return false;
    }
  }

  /**
   * Auto-initialize the application
   */
  static async autoInitialize(): Promise<{
    supabaseAvailable: boolean;
    pizzasInitialized: boolean;
    source: 'supabase' | 'mock';
  }> {
    const available = this.isSupabaseAvailable();

    if (!available) {
      console.warn('🔧 Supabase not configured - using mock data');
      return { supabaseAvailable: false, pizzasInitialized: false, source: 'mock' };
    }

    try {
      const isEmpty = await this.isPizzaCollectionEmpty();

      if (isEmpty) {
        console.log('📦 Empty database detected.');
        return { supabaseAvailable: true, pizzasInitialized: false, source: 'supabase' };
      }
 else {
        console.log('✅ Supabase already configured with data');
        return { supabaseAvailable: true, pizzasInitialized: true, source: 'supabase' };
      }
    } catch (error) {
      console.error('❌ Erro na auto-inicialização:', error);
      return { supabaseAvailable: true, pizzasInitialized: false, source: 'supabase' };
    }
  }
}
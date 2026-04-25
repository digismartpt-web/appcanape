import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseUrl !== '';

if (!isConfigured) {
  console.error('❌ CONFIGURATION MANQUANTE : Les variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ne sont pas détectées.');
}

// Objet Dummy ultra-complet pour éviter TOUT crash au démarrage


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const TABLE_PREFIX = 'appcanape_';

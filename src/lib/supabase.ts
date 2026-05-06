import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Trim whitespace to avoid silent mismatches from .env formatting
const supabaseUrl: string = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey: string = typeof rawKey === 'string' ? rawKey.trim() : '';

const PLACEHOLDER_URL = 'your_supabase_url_here';
const PLACEHOLDER_KEY = 'your_supabase_anon_key_here';

const urlOk = supabaseUrl !== '' && supabaseUrl !== PLACEHOLDER_URL;
const keyOk = supabaseAnonKey !== '' && supabaseAnonKey !== PLACEHOLDER_KEY;
const isConfigured = urlOk && keyOk;

// Diagnostic — shows in browser console to help identify configuration issues
if (!urlOk) {
  console.error(
    `❌ [Supabase] VITE_SUPABASE_URL não está configurada no ficheiro .env.\n` +
    `   Valor atual: "${supabaseUrl || '(vazio)'}"\n` +
    `   Substitua pelo URL do seu projeto Supabase (ex: https://xxxx.supabase.co)`
  );
}
if (!keyOk) {
  console.error(
    `❌ [Supabase] VITE_SUPABASE_ANON_KEY não está configurada no ficheiro .env.\n` +
    `   Valor atual: "${supabaseAnonKey ? supabaseAnonKey.substring(0, 12) + '…' : '(vazio)'}"\n` +
    `   Substitua pela chave anon/public do seu projeto Supabase.`
  );
}
if (isConfigured) {
  console.info(`✅ [Supabase] Cliente inicializado — ${supabaseUrl}`);
}

// Dummy auth — returned only when credentials are truly absent or placeholder
const dummyAuth = {
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  signOut: () => Promise.resolve({ error: null }),
  signInWithPassword: () => Promise.resolve({
    data: null,
    error: { message: 'Supabase não configurado — verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ficheiro .env' }
  }),
  signUp: () => Promise.resolve({
    data: null,
    error: { message: 'Supabase não configurado — verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ficheiro .env' }
  }),
  signInAnonymously: () => Promise.resolve({
    data: null,
    error: { message: 'Supabase não configurado' }
  }),
} as any;

// Dummy DB client — returned only when credentials are truly absent or placeholder
const dummySupabase = {
  auth: dummyAuth,
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb)
    }),
    insert: () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      not: () => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    upsert: () => Promise.resolve({ error: null })
  }),
  channel: () => ({
    on: function() { return this; },
    subscribe: () => ({ unsubscribe: () => {} }),
    send: () => Promise.resolve()
  }),
  removeChannel: () => {},
  removeAllChannels: () => {},
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  }
} as any;

// DB client — uses canape_module schema for all .from() queries
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'canape_module' } })
  : dummySupabase;

// Auth client — separate instance without schema override so auth.* methods work correctly
export const supabaseAuth = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({ auth: dummyAuth } as any);

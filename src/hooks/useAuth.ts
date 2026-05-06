import { create } from 'zustand';
import { supabase, supabaseAuth } from '../lib/supabase';
import type { User, UserRole } from '../types';

// TODO: REMOVE BEFORE PRODUCTION — hardcoded test accounts
const TEST_USERS: Record<string, User> = {
  'admin@boutique.test': {
    id: 'test-admin-id',
    email: 'admin@boutique.test',
    full_name: 'Admin Teste',
    phone: '912345678',
    address: 'Rua de Teste, 1, Lisboa',
    role: 'boutique' as UserRole,
    created_at: new Date().toISOString()
  },
  'client@boutique.test': {
    id: 'test-client-id',
    email: 'client@boutique.test',
    full_name: 'Cliente Teste',
    phone: '961234567',
    address: 'Avenida de Teste, 2, Porto',
    role: 'client' as UserRole,
    created_at: new Date().toISOString()
  }
};
const TEST_PASSWORDS: Record<string, string> = {
  'admin@boutique.test': 'Admin1234!',
  'client@boutique.test': 'Client1234!'
};
const TEST_USER_KEY = 'dev_test_user';
// END TODO

interface ProfileUpdateData {
  full_name: string;
  phone: string;
  address: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: { full_name: string; phone: string; address: string; role: UserRole }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  initializeAuth: () => void;
  _loadUserProfile: (uid: string, email: string | undefined) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initializeAuth: () => {
    // TODO: REMOVE BEFORE PRODUCTION — restore test user from sessionStorage
    const savedTestUser = sessionStorage.getItem(TEST_USER_KEY);
    if (savedTestUser) {
      try {
        const testUser = JSON.parse(savedTestUser) as User;
        set({ user: testUser, loading: false });
        const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(() => {});
        return () => { subscription.unsubscribe(); };
      } catch {
        sessionStorage.removeItem(TEST_USER_KEY);
      }
    }
    // END TODO

    // 1. Primeiro tentamos recuperar a sessão existente
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      // TODO: REMOVE BEFORE PRODUCTION
      if (sessionStorage.getItem(TEST_USER_KEY)) return;
      // END TODO
      if (session?.user) {
        get()._loadUserProfile(session.user.id, session.user.email);
      } else {
        // Tentativa de sessão anónima se não houver sessão ativa
        console.log('👤 [Auth] Nenhum utilizador encontrado, a iniciar sessão anónima...');
        supabaseAuth.auth.signInAnonymously().catch(error => {
          console.error('❌ [Auth] Falha na ligação anónima:', error);
          set({ user: null, loading: false });
        });
      }
    });

    // 2. Depois subscrevemos as mudanças de estado
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(async (event, session) => {
      // TODO: REMOVE BEFORE PRODUCTION
      if (sessionStorage.getItem(TEST_USER_KEY)) return;
      // END TODO
      console.log('Auth state changed:', event, session?.user?.id || 'null');

      if (session?.user) {
        get()._loadUserProfile(session.user.id, session.user.email);
      } else {
        set({ user: null, loading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signIn: async (email, password) => {
    // TODO: REMOVE BEFORE PRODUCTION — test account bypass
    if (TEST_USERS[email] && TEST_PASSWORDS[email] === password) {
      sessionStorage.setItem(TEST_USER_KEY, JSON.stringify(TEST_USERS[email]));
      set({ user: TEST_USERS[email], loading: false });
      return;
    }
    // END TODO
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Email ou palavra-passes incorretos');
    // Load profile immediately so user.role is available before signIn() resolves
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (session?.user) {
      await get()._loadUserProfile(session.user.id, session.user.email ?? undefined);
    }
  },

  signUp: async (email, password, userData) => {
    // 1. Criar a conta Auth
    const { error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          phone: userData.phone,
          address: userData.address,
          role: 'client'
        }
      }
    });

    if (authError) throw new Error(authError.message || 'Erro durante a inscrição no Supabase Auth');
    
    // O perfil será automaticamente criado por um trigger SQL no Supabase.
    // O utilizador receberá um email de confirmação conforme as definições do Supabase.
  },

  signOut: async () => {
    console.log('A terminar sessão...');
    try {
      // Clean cart before signout
      const cartStore = await import('../stores/cartStore');
      cartStore.useCartStore.getState().clearCart();

      // TODO: REMOVE BEFORE PRODUCTION — test account bypass
      if (sessionStorage.getItem(TEST_USER_KEY)) {
        sessionStorage.removeItem(TEST_USER_KEY);
        set({ user: null, loading: false });
        console.log('Sessão de teste terminada');
        return;
      }
      // END TODO

      const { error } = await supabaseAuth.auth.signOut();
      if (error) throw error;
      set({ user: null, loading: false });
      console.log('Sessão terminada com sucesso');
    } catch (error: any) {
      console.error('Erro ao terminar sessão:', error);
      throw new Error(error.message || 'Erro durante o término da sessão');
    }
  },

  updateProfile: async (data: ProfileUpdateData) => {
    const { data: sessionData } = await supabaseAuth.auth.getSession();
    const currentUser = sessionData.session?.user;
    
    if (!currentUser) throw new Error('Utilizador não ligado');

    const { error } = await supabase
      .from('users_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) throw new Error(error.message || 'Erro ao atualizar o perfil');

    // Atualizar o estado local
    set(state => ({
      user: state.user ? {
        ...state.user,
        ...data
      } : null
    }));
  },
  
  // Função utilitária interna para carregar o perfil a partir do id (auth.uid)
  _loadUserProfile: async (uid: string, email: string | undefined) => {
    try {
      const { data: profile, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        const userData: User = {
          id: profile.id,
          email: profile.email || email || '',
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          address: profile.address || '',
          role: profile.role || 'client',
          created_at: profile.created_at
        };
        set({ user: userData, loading: false });
      } else if (email) {
        // Utilizador real sem perfil: criar automaticamente com role='client'
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('users_profiles')
          .insert({ id: uid, email, role: 'client', full_name: '', phone: '', address: '', created_at: now });
        if (insertError) {
          console.error('❌ [Auth] Erro ao criar perfil automaticamente:', insertError);
          set({ user: null, loading: false });
          return;
        }
        set({
          user: { id: uid, email, full_name: '', phone: '', address: '', role: 'client', created_at: now },
          loading: false
        });
      } else {
        // Sessão anónima — sem email, sem perfil
        set({ user: null, loading: false });
      }
    } catch (err) {
      console.error('Erro ao carregar o perfil:', err);
      set({ user: null, loading: false });
    }
  }
}));
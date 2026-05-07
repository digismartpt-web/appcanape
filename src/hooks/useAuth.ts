import { create } from 'zustand';
import { supabase, supabaseAuth } from '../lib/supabase';
import type { User, UserRole } from '../types';
import toast from 'react-hot-toast';

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
  _loadUserProfile: (uid: string, email: string | undefined, allowCreate?: boolean) => Promise<void>;
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
    console.log('[AUTH] Rôle détecté:', get().user?.role);
  },

  signUp: async (email, password, userData) => {
    const { data: signUpData, error: authError } = await supabaseAuth.auth.signUp({
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

    // Create profile immediately so _loadUserProfile never treats this user as an outsider
    const uid = signUpData.user?.id;
    if (uid) {
      const now = new Date().toISOString();
      const { error: profileError } = await supabase
        .from('users_canape')
        .insert({
          id: uid,
          email,
          role: 'client',
          full_name: userData.full_name,
          phone: userData.phone,
          address: userData.address,
          created_at: now
        });
      if (profileError) console.error('[AUTH] Erro ao criar perfil na inscrição:', profileError);
    }
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
      .from('users_canape')
      .update({ ...data })
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
  // allowCreate=true apenas no contexto de inscrição — nunca em signIn ou restauro de sessão
  _loadUserProfile: async (uid: string, email: string | undefined, allowCreate = false) => {
    try {
      const { data: profile, error } = await supabase
        .from('users_canape')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      console.log('[AUTH] Profil chargé:', profile);
      if (profile) {
        const userData: User = {
          id: profile.id,
          email: profile.email || email || '',
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          address: profile.address || '',
          role: profile.role || 'client',
          created_at: profile.created_at,
          pro_validated: profile.pro_validated ?? false,
          pro_discount_percent: profile.pro_discount_percent ?? 0,
        };
        set({ user: userData, loading: false });
      } else if (email && allowCreate) {
        // Inscrição nova — criar perfil com role='client'
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('users_canape')
          .insert({ id: uid, email, role: 'client', full_name: '', phone: '', address: '', created_at: now });
        if (insertError) {
          console.error('❌ [Auth] Erro ao criar perfil automaticamente:', insertError);
          set({ user: null, loading: false });
          return;
        }
        set({
          user: { id: uid, email, full_name: '', phone: '', address: '', role: 'client', created_at: now, pro_validated: false, pro_discount_percent: 0 },
          loading: false
        });
      } else if (email && !allowCreate) {
        // Conta Auth sem perfil nesta loja — utilizador de outra aplicação
        console.warn('[AUTH] Conta sem perfil nesta loja — a desligar');
        await supabaseAuth.auth.signOut();
        toast.error('Esta conta não tem acesso a esta loja.');
        set({ user: null, loading: false });
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
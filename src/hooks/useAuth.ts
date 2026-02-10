import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole } from '../types';

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
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initializeAuth: () => {
    if (!auth || !db) {
      console.warn('Firebase non disponible');
      set({ user: null, loading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser ? firebaseUser.uid : 'null');

      if (firebaseUser) {
        try {
          const userRef = doc(db!, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = {
              id: firebaseUser.uid,
              ...userSnap.data(),
              email: userSnap.data().email || firebaseUser.email || '',
              full_name: userSnap.data().full_name || firebaseUser.displayName || '',
              phone: userSnap.data().phone || '',
              address: userSnap.data().address || '',
              role: userSnap.data().role || 'client',
              created_at: userSnap.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
            } as User;
            console.log('User loaded:', userData.email);
            set({ user: userData, loading: false });
          } else {
            const defaultUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'client',
              full_name: firebaseUser.displayName || '',
              phone: '',
              address: '',
              created_at: new Date().toISOString()
            };

            await setDoc(userRef, {
              email: defaultUser.email,
              role: defaultUser.role,
              full_name: defaultUser.full_name,
              phone: defaultUser.phone,
              address: defaultUser.address,
              created_at: new Date(),
              updated_at: new Date()
            });

            console.log('Default user created:', defaultUser.email);
            set({ user: defaultUser, loading: false });
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil utilisateur:', error);
          set({ user: null, loading: false });
        }
      } else {
        console.log('👤 [Auth] No user found, initiating anonymous session...');
        try {
          await signInAnonymously(auth!);
          console.log('✅ [Auth] Anonymous sign-in requested');
        } catch (error: any) {
          console.error('❌ [Auth] Anonymous sign in failed:', error.code, error.message);
          if (error.code === 'auth/operation-not-allowed') {
            console.error('👉 ALICE: Tem de ativar o "Início de sessão anónimo" no Firebase Console!');
            alert('Configuração Firebase: Por favor ative o "Início de sessão anónimo" para que os visitantes vejam o menu.');
          }
          set({ user: null, loading: false });
        }
      }
    });

    return unsubscribe;
  },

  signUp: async (email: string, password: string, userData: { full_name: string; phone: string; address: string; role: UserRole }) => {
    if (!auth || !db) {
      throw new Error('Firebase non configuré.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      const user = userCredential.user;

      const userRef = doc(db!, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email || '',
        role: userData.role,
        full_name: userData.full_name,
        phone: userData.phone,
        address: userData.address,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la création du compte');
    }
  },

  signIn: async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase non configuré.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      console.log('Connexion réussie pour:', userCredential.user.uid);
    } catch (error: any) {
      throw new Error(error.message || 'Email ou mot de passe incorrect');
    }
  },

  signOut: async () => {
    if (!auth) {
      console.error('Firebase non configuré - impossible de se déconnecter');
      throw new Error('Firebase non configuré. Impossible de se déconnecter.');
    }

    try {
      console.log('Déconnexion en cours...');

      const cartStore = await import('../stores/cartStore');
      cartStore.useCartStore.getState().clearCart();

      await firebaseSignOut(auth!);

      set({ user: null, loading: false });

      console.log('Déconnexion Firebase réussie');
    } catch (error: any) {
      console.error('Erreur lors de la déconnexion:', error);
      throw new Error(error.message || 'Erreur lors de la déconnexion');
    }
  },

  updateProfile: async (data: ProfileUpdateData) => {
    if (!auth || !db) throw new Error('Firebase non configuré');

    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    try {
      const userRef = doc(db!, 'users', currentUser.uid);
      await setDoc(userRef, {
        ...data,
        updated_at: new Date()
      }, { merge: true });

      set(state => ({
        user: state.user ? {
          ...state.user,
          ...data
        } : null
      }));
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du profil');
    }
  }
}));
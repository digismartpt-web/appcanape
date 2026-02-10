import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import type { Pizza, Order, User, OrderStatus, Extra, PromotionRule } from '../types';

// Vérifier si Firebase est disponible
const isFirebaseAvailable = () => {
  return db !== null && db !== undefined;
};

// Collections references
export const COLLECTIONS = {
  USERS: 'users',
  PIZZAS: 'pizzas',
  ORDERS: 'orders',
  EXTRAS: 'extras',
  PROMOTIONS: 'promotions',
  BANNER_GALLERY: 'banner_gallery'
} as const;

// Users Service
export const usersService = {
  async createUser(userId: string, userData: Partial<User>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const userRef = doc(db!, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...userData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  },

  async updateUser(userId: string, userData: Partial<User>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const userRef = doc(db!, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...userData,
      updated_at: serverTimestamp()
    });
  },

  async getUser(userId: string): Promise<User | null> {
    if (!isFirebaseAvailable()) return null;

    const userRef = doc(db!, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  },

  async getAllUsers(): Promise<User[]> {
    if (!isFirebaseAvailable()) return [];

    const usersRef = collection(db!, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
};

// Pizzas Service
export const pizzasService = {
  async createPizza(pizzaData: Omit<Pizza, 'id'>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    // Vérifier que l'utilisateur est authentifié
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier le rôle de l'utilisateur avant de créer la pizza
    try {
      const userRef = doc(db!, COLLECTIONS.USERS, currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('Profil utilisateur non trouvé. Veuillez vous reconnecter.');
      }

      const userData = userSnap.data();
      if (!userData.role || (userData.role !== 'admin' && userData.role !== 'pizzeria')) {
        throw new Error(`Permissions insuffisantes. Votre rôle actuel: ${userData.role || 'non défini'}. Rôle requis: admin ou pizzeria.`);
      }
    } catch (error: any) {
      if (error.message.includes('Permissions insuffisantes') || error.message.includes('Profil utilisateur')) {
        throw error;
      }
      throw new Error('Erreur lors de la vérification des permissions: ' + error.message);
    }

    const pizzasRef = collection(db!, COLLECTIONS.PIZZAS);
    try {
      // Nettoyer les données pour enlever les valeurs undefined
      const cleanData: any = {
        name: pizzaData.name || '',
        description: pizzaData.description || '',
        category: pizzaData.category || '',
        image_url: pizzaData.image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
        ingredients: pizzaData.ingredients || [],
        has_unique_price: pizzaData.has_unique_price || false,
        prices: {
          small: pizzaData.prices?.small || 0,
          medium: pizzaData.prices?.medium || 0,
          large: pizzaData.prices?.large || 0
        },
        customizable: pizzaData.customizable || false,
        max_custom_ingredients: pizzaData.max_custom_ingredients || 3,
        custom_ingredients: pizzaData.custom_ingredients || [],
        active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Ajouter unique_price seulement s'il est défini et > 0
      if (pizzaData.has_unique_price && pizzaData.unique_price && pizzaData.unique_price > 0) {
        cleanData.unique_price = pizzaData.unique_price;
      }

      const docRef = await addDoc(pizzasRef, cleanData);
      return docRef.id;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        throw new Error('Permissions insuffisantes pour créer une pizza. Vérifiez votre rôle dans Firebase Console.');
      }
      throw new Error('Erreur lors de la création de la pizza: ' + error.message);
    }
  },

  async updatePizza(pizzaId: string, pizzaData: Partial<Pizza>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    // Nettoyer les données pour enlever les valeurs undefined
    const cleanData: any = {
      updated_at: serverTimestamp()
    };

    // Ajouter les champs seulement s'ils sont définis
    if (pizzaData.name !== undefined) cleanData.name = pizzaData.name;
    if (pizzaData.description !== undefined) cleanData.description = pizzaData.description;
    if (pizzaData.category !== undefined) cleanData.category = pizzaData.category;
    if (pizzaData.image_url !== undefined) cleanData.image_url = pizzaData.image_url;
    if (pizzaData.ingredients !== undefined) cleanData.ingredients = pizzaData.ingredients;
    if (pizzaData.active !== undefined) cleanData.active = pizzaData.active;
    if (pizzaData.customizable !== undefined) cleanData.customizable = pizzaData.customizable;
    if (pizzaData.max_custom_ingredients !== undefined) cleanData.max_custom_ingredients = pizzaData.max_custom_ingredients;
    if (pizzaData.custom_ingredients !== undefined) cleanData.custom_ingredients = pizzaData.custom_ingredients;

    if (pizzaData.has_unique_price !== undefined) {
      cleanData.has_unique_price = pizzaData.has_unique_price;
      if (pizzaData.has_unique_price && pizzaData.unique_price && pizzaData.unique_price > 0) {
        cleanData.unique_price = pizzaData.unique_price;
      }
    }

    if (pizzaData.prices !== undefined) {
      cleanData.prices = {
        small: pizzaData.prices.small || 0,
        medium: pizzaData.prices.medium || 0,
        large: pizzaData.prices.large || 0
      };
    }

    const pizzaRef = doc(db!, COLLECTIONS.PIZZAS, pizzaId);
    await updateDoc(pizzaRef, cleanData);
  },

  async deletePizza(pizzaId: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const pizzaRef = doc(db!, COLLECTIONS.PIZZAS, pizzaId);
    await deleteDoc(pizzaRef);
  },

  async getAllPizzas(): Promise<Pizza[]> {
    if (!isFirebaseAvailable()) return [];

    const pizzasRef = collection(db!, COLLECTIONS.PIZZAS);
    const snapshot = await getDocs(pizzasRef);

    // Filter client-side to include active pizzas or those without the active field (default to true)
    const pizzas = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Pizza))
      .filter(p => (p as any).active !== false);

    return pizzas.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Plus récent en premier
    });
  },

  async getAllPizzasForAdmin(): Promise<Pizza[]> {
    if (!isFirebaseAvailable()) {
      console.warn('⚠️ [FirebaseService] Database not available for getAllPizzasForAdmin');
      return [];
    }

    try {
      console.log('📦 [FirebaseService] Fetching all pizzas (Direct collection query)...');
      const pizzasRef = collection(db!, COLLECTIONS.PIZZAS);
      const snapshot = await getDocs(pizzasRef);

      console.log(`✅ [FirebaseService] Query successful. Items found: ${snapshot.size}`);

      const pizzas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Pizza));

      return pizzas.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ [FirebaseService] Critical error fetching pizzas:', error);
      return [];
    }
  },

  subscribeToActivePizzas(callback: (pizzas: Pizza[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const pizzasRef = collection(db!, COLLECTIONS.PIZZAS);
    // Use server-side filtering for 'active' and ordering by 'created_at'
    // Note: This requires a composite index in Firestore
    const q = query(
      pizzasRef,
      where('active', '==', true),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q,
      (snapshot) => {
        const pizzas = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Pizza));
        callback(pizzas);
      },
      (error) => {
        console.error('❌ [FirebaseService] Error in active pizzas subscription:', error);

        // Fallback: If index is missing, try a simpler query without ordering
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ [FirebaseService] Falling back to unordered query (index missing)');
          const simpleQ = query(pizzasRef, where('active', '==', true));
          return onSnapshot(simpleQ, (snap) => {
            const pizzas = snap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Pizza));
            callback(pizzas);
          });
        }
        callback([]);
      }
    );
  },

  subscribeToAllPizzas(callback: (pizzas: Pizza[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const pizzasRef = collection(db!, COLLECTIONS.PIZZAS);

    return onSnapshot(pizzasRef,
      (snapshot) => {
        console.log(`📦 [FirebaseService] Pizza snapshot received. Size: ${snapshot.size}`);
        const pizzas = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Pizza));
        callback(pizzas);
      },
      (error) => {
        console.error('❌ [FirebaseService] Error in pizza subscription:', error.code, error.message);
        callback([]);
      }
    );
  }
};

// Orders Service
export const ordersService = {
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'order_number'>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);

    // Générer le numéro de commande basé sur le timestamp pour éviter de lire toutes les commandes
    // Cela évite les problèmes de permissions
    const orderNumber = 20000 + Math.floor(Date.now() / 1000) % 100000;

    const cleanData: any = {
      user_id: orderData.user_id,
      user: orderData.user,
      pickup_address: orderData.pickup_address,
      delivery_type: orderData.delivery_type,
      items: orderData.items,
      total: orderData.total,
      status: orderData.status,
      order_number: orderNumber,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    if (orderData.delivery_address !== undefined) {
      cleanData.delivery_address = orderData.delivery_address;
    }
    if (orderData.preparation_time !== undefined) {
      cleanData.preparation_time = orderData.preparation_time;
    }
    if (orderData.delivery_time !== undefined) {
      cleanData.delivery_time = orderData.delivery_time;
    }
    if (orderData.estimated_delivery_time !== undefined) {
      cleanData.estimated_delivery_time = orderData.estimated_delivery_time;
    }
    if (orderData.estimated_delivery_time_confirmed !== undefined) {
      cleanData.estimated_delivery_time_confirmed = orderData.estimated_delivery_time_confirmed;
    }
    if (orderData.requested_later_time !== undefined) {
      cleanData.requested_later_time = orderData.requested_later_time;
    }
    if (orderData.delivery_distance !== undefined) {
      cleanData.delivery_distance = orderData.delivery_distance;
    }
    if (orderData.estimated_time !== undefined) {
      cleanData.estimated_time = orderData.estimated_time;
    }

    try {
      const docRef = await addDoc(ordersRef, cleanData);
      return docRef.id;
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permissions insuffisantes. Assurez-vous d\'être connecté avec un compte valide.');
      }
      throw error;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, preparationTime?: number, cancellationReason?: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    const updateData: any = {
      status,
      updated_at: serverTimestamp()
    };

    if (preparationTime !== undefined) {
      updateData.preparation_time = preparationTime;
    }

    // Ajouter le motif d'annulation si fourni
    if (status === 'cancelled' && cancellationReason) {
      updateData.cancellation_reason = cancellationReason;
    }

    await updateDoc(orderRef, updateData);
  },

  async updateOrderPreparationTime(orderId: string, preparationTime: number) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      preparation_time: preparationTime,
      updated_at: serverTimestamp()
    });
  },

  async updateOrderDeliveryTime(orderId: string, deliveryTime: number, distance?: number) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    const updateData: any = {
      delivery_time: deliveryTime,
      status: 'em_entrega',
      updated_at: serverTimestamp()
    };

    if (distance !== undefined) {
      updateData.delivery_distance = distance;
    }

    await updateDoc(orderRef, updateData);
  },

  async updateEstimatedDeliveryTime(orderId: string, estimatedTime: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      estimated_delivery_time: estimatedTime,
      updated_at: serverTimestamp()
    });
  },

  async confirmEstimatedDeliveryTime(orderId: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      estimated_delivery_time_confirmed: true,
      updated_at: serverTimestamp()
    });
  },

  async requestLaterDeliveryTime(orderId: string, requestedTime: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const orderRef = doc(db!, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      requested_later_time: requestedTime,
      updated_at: serverTimestamp()
    });
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    if (!isFirebaseAvailable()) return [];

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const q = query(ordersRef, where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
    } as Order));

    // Tri côté client pour éviter l'index composite
    return orders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Plus récent en premier
    });
  },

  async getAllOrders(): Promise<Order[]> {
    if (!isFirebaseAvailable()) return [];

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const q = query(ordersRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
    } as Order));
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const q = query(ordersRef, where('user_id', '==', userId));

    return onSnapshot(q,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
        } as Order));

        // Tri côté client pour éviter l'index composite
        const sortedOrders = orders.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Plus récent en premier
        });

        callback(sortedOrders);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des commandes utilisateur:', error);
        callback([]);
      }
    );
  },

  subscribeToAllOrders(callback: (orders: Order[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const q = query(ordersRef, orderBy('created_at', 'desc'));

    return onSnapshot(q,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
        } as Order));
        callback(orders);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute de toutes les commandes:', error);
        callback([]);
      }
    );
  },

  subscribeToOrdersByStatus(status: OrderStatus, callback: (orders: Order[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const q = query(
      ordersRef,
      where('status', '==', status),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
        } as Order));
        callback(orders);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des commandes par statut:', error);
        callback([]);
      }
    );
  },

  async deleteAllOrders() {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const ordersRef = collection(db!, COLLECTIONS.ORDERS);
    const snapshot = await getDocs(ordersRef);

    const deletePromises = snapshot.docs.map(doc => updateDoc(doc.ref, {
      pizzeria_hidden: true,
      updated_at: serverTimestamp()
    }));
    await Promise.all(deletePromises);
  }
};

// Extras Service
export const extrasService = {
  async createExtra(extraData: Omit<Extra, 'id'>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const extrasRef = collection(db!, COLLECTIONS.EXTRAS);
    const docRef = await addDoc(extrasRef, {
      ...extraData,
      active: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async updateExtra(extraId: string, extraData: Partial<Extra>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const extraRef = doc(db!, COLLECTIONS.EXTRAS, extraId);
    await updateDoc(extraRef, {
      ...extraData,
      updated_at: serverTimestamp()
    });
  },

  async deleteExtra(extraId: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const extraRef = doc(db!, COLLECTIONS.EXTRAS, extraId);
    await deleteDoc(extraRef);
  },

  async getAllExtras(): Promise<Extra[]> {
    if (!isFirebaseAvailable()) return [];

    const extrasRef = collection(db!, COLLECTIONS.EXTRAS);
    const snapshot = await getDocs(extrasRef);

    const extras = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    } as unknown as Extra)).filter(extra => (extra as any).active !== false);
    return extras.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getAllExtrasForAdmin(): Promise<Extra[]> {
    if (!isFirebaseAvailable()) return [];

    const extrasRef = collection(db!, COLLECTIONS.EXTRAS);
    const snapshot = await getDocs(extrasRef);

    const extras = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    } as unknown as Extra));
    return extras.sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribeToActiveExtras(callback: (extras: Extra[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const extrasRef = collection(db!, COLLECTIONS.EXTRAS);

    return onSnapshot(extrasRef,
      (snapshot) => {
        const extras = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        } as unknown as Extra)).filter(extra => (extra as any).active !== false);
        callback(extras.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des extras:', error);
        callback([]);
      }
    );
  }
};

// Categories Service
export const categoriesService = {
  async createCategory(categoryData: { name: string; description?: string; active: boolean }) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const categoriesRef = collection(db!, 'categories');
    const docRef = await addDoc(categoriesRef, {
      ...categoryData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async updateCategory(categoryId: string, categoryData: Partial<{ name: string; description?: string; active: boolean }>) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const categoryRef = doc(db!, 'categories', categoryId);
    await updateDoc(categoryRef, {
      ...categoryData,
      updated_at: serverTimestamp()
    });
  },

  async deleteCategory(categoryId: string) {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponible');

    const categoryRef = doc(db!, 'categories', categoryId);
    await deleteDoc(categoryRef);
  },

  async getAllCategories(): Promise<Array<{ id: string; name: string; description?: string; active: boolean; created_at?: string }>> {
    if (!isFirebaseAvailable()) return [];

    const categoriesRef = collection(db!, 'categories');
    const snapshot = await getDocs(categoriesRef);

    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any),
      created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
    } as any));

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribeToCategories(callback: (categories: Array<{ id: string; name: string; description?: string; active: boolean; created_at?: string }>) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const categoriesRef = collection(db!, 'categories');
    // Order by name server-side for efficiency
    const q = query(categoriesRef, orderBy('name', 'asc'));

    return onSnapshot(q,
      (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
          created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
        }));
        callback(categories);
      },
      (error) => {
        console.error('❌ [FirebaseService] Error in categories subscription:', error.code, error.message);

        // Fallback if index missing
        if (error.code === 'failed-precondition') {
          return onSnapshot(categoriesRef, (snap) => {
            const categories = snap.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as any)
            }));
            callback(categories as any);
          });
        }
        callback([]);
      }
    );
  }
};

// Promotions Service
export const promotionsService = {
  async getActivePromotions(): Promise<PromotionRule[]> {
    if (!isFirebaseAvailable()) return [];

    const promotionsRef = collection(db!, COLLECTIONS.PROMOTIONS);
    const q = query(promotionsRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PromotionRule));
  },

  subscribeToActivePromotions(callback: (promotions: PromotionRule[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const promotionsRef = collection(db!, COLLECTIONS.PROMOTIONS);
    const q = query(promotionsRef, where('active', '==', true));

    return onSnapshot(q,
      (snapshot) => {
        const promos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PromotionRule));
        callback(promos);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des promotions:', error);
        callback([]);
      }
    );
  },

  async getAllPromotions(): Promise<PromotionRule[]> {
    if (!isFirebaseAvailable()) return [];

    const promotionsRef = collection(db!, COLLECTIONS.PROMOTIONS);
    const snapshot = await getDocs(promotionsRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PromotionRule));
  },

  subscribeToAllPromotions(callback: (promotions: PromotionRule[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const promotionsRef = collection(db!, COLLECTIONS.PROMOTIONS);
    return onSnapshot(promotionsRef,
      (snapshot) => {
        const promos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PromotionRule));
        callback(promos);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des promotions:', error);
        callback([]);
      }
    );
  },

  async getAllPromotions(): Promise<PromotionRule[]> {
    if (!isFirebaseAvailable()) return [];

    const promotionsRef = collection(db, COLLECTIONS.PROMOTIONS);
    const snapshot = await getDocs(promotionsRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PromotionRule));
  },

  subscribeToAllPromotions(callback: (promotions: PromotionRule[]) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const promotionsRef = collection(db, COLLECTIONS.PROMOTIONS);
    return onSnapshot(promotionsRef,
      (snapshot) => {
        const promos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PromotionRule));
        callback(promos);
      },
      (error) => {
        console.error('Erreur lors de l\'écoute des promotions:', error);
        callback([]);
      }
    );
  },

  async addPromotion(promotion: Omit<PromotionRule, 'id'>): Promise<string> {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponível');
    const docRef = await addDoc(collection(db, COLLECTIONS.PROMOTIONS), {
      ...promotion,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async updatePromotion(id: string, promotion: Partial<PromotionRule>): Promise<void> {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponível');
    const docRef = doc(db, COLLECTIONS.PROMOTIONS, id);
    await updateDoc(docRef, {
      ...promotion,
      updated_at: serverTimestamp()
    });
  },


  async deletePromotion(id: string): Promise<void> {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponível');
    const docRef = doc(db, COLLECTIONS.PROMOTIONS, id);
    await deleteDoc(docRef);
  }
};

// Banner Gallery Service (Base64 storage)
export const bannerGalleryService = {
  async getAllImages(): Promise<{ id: string; url: string; name: string; created_at: string }[]> {
    if (!isFirebaseAvailable()) return [];

    const galleryRef = collection(db, COLLECTIONS.BANNER_GALLERY);
    const snapshot = await getDocs(galleryRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      url: doc.data().url,
      name: doc.data().name || 'Imagem',
      created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
    }));
  },

  async addImage(url: string, name: string): Promise<string> {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponível');

    try {
      const galleryRef = collection(db, COLLECTIONS.BANNER_GALLERY);
      const docRef = await addDoc(galleryRef, {
        url,
        name,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('❌ ERRO AO ADICIONAR IMAGEM:', error);
      throw error;
    }
  },

  async deleteImage(id: string): Promise<void> {
    if (!isFirebaseAvailable()) throw new Error('Firebase non disponível');
    const docRef = doc(db, COLLECTIONS.BANNER_GALLERY, id);
    await deleteDoc(docRef);
  },

  subscribeToGallery(callback: (images: { id: string; url: string; name: string; created_at: string }[]) => void, errorCallback?: (error: any) => void) {
    if (!isFirebaseAvailable()) {
      callback([]);
      return () => { };
    }

    const galleryRef = collection(db, COLLECTIONS.BANNER_GALLERY);

    return onSnapshot(galleryRef, (snapshot) => {
      const images = snapshot.docs.map(doc => ({
        id: doc.id,
        url: doc.data().url,
        name: doc.data().name || 'Imagem',
        created_at: (doc.data().created_at as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
      }));
      callback(images);
    }, (error) => {
      console.error('Erreur lors de l\'écoute da galeria de banners:', error);
      if (errorCallback) errorCallback(error);
      callback([]);
    });
  }
};

// Storage Service
export const storageService = {
  async uploadImage(file: File, path: string): Promise<string> {
    console.log('🚀 [StorageService] Iniciando upload:', path);
    console.log('📦 [StorageService] File size:', file.size, 'type:', file.type);

    if (!storage) {
      console.error('❌ [StorageService] Storage instance is null/undefined');
      throw new Error("Storage não disponível");
    }

    // Check bucket config
    const bucket = storage.app.options.storageBucket;
    console.log('🔧 [StorageService] Bucket Config:', bucket || 'UNDEFINED');

    if (!bucket) {
      throw new Error("Configuration Error: storageBucket is missing in firebase config.");
    }

    try {
      const storageRef = ref(storage, path);
      console.log('📂 [StorageService] Reference created. Starting uploadBytesResumable...');

      // Use resumable upload for better status tracking
      // Import needed if not present, but we will assume it is available or add import 
      // (Added to imports in next step if missing)
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('📊 [StorageService] Upload is ' + progress + '% done');
            switch (snapshot.state) {
              case 'paused':
                console.log('⏸️ [StorageService] Upload is paused');
                break;
              case 'running':
                console.log('▶️ [StorageService] Upload is running');
                break;
            }
          },
          (error) => {
            console.error('❌ [StorageService] Upload failed:', error);
            reject(error);
          },
          async () => {
            console.log('✅ [StorageService] Upload completed successfully.');
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('🔗 [StorageService] Download URL generated:', url);
              resolve(url);
            } catch (urlError) {
              console.error('❌ [StorageService] Failed to get download URL:', urlError);
              reject(urlError);
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ [StorageService] Upload setup failed:', error);
      throw error;
    }
  }
};

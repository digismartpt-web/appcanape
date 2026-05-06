import { supabase, supabaseAuth } from '../lib/supabase';
import type { Product, ProductImage, ProductSize, Order, User, OrderStatus, PromotionRule, ProRequest, ProRequestStatus } from '../types';

export const COLLECTIONS = {
  USERS: 'users_profiles',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  PROMOTIONS: 'promotions',
  BANNER_GALLERY: 'banner_gallery',
  CATEGORIES: 'categories',
  PRODUCT_IMAGES: 'product_images',
  PRO_REQUESTS: 'pro_requests'
} as const;

const SCHEMA = 'canape_module';

// TODO: REMOVE BEFORE PRODUCTION — mock all writes for test accounts
const isTestUser = () => sessionStorage.getItem('dev_test_user') !== null;
// END TODO

// Users Service
export const usersService = {
  async createUser(userId: string, userData: Partial<User>) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.USERS).upsert({
      id: userId,
      ...userData,
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(error.message);
  },

  async updateUser(userId: string, userData: Partial<User>) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.USERS).update({
      ...userData,
      updated_at: new Date().toISOString()
    }).eq('id', userId);
    if (error) throw new Error(error.message);
  },

  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase.from(COLLECTIONS.USERS).select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { id: data.id, ...data } as User;
  }
};

// Products Service
export const productsService = {
  async createProduct(productData: Omit<Product, 'id'>) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const cleanData: any = {
      name: productData.name || '',
      description: productData.description || '',
      category_id: productData.category_id || null,
      image_url: productData.image_url || '',
      features: productData.features || [],
      has_options: productData.has_options || false,
      options: productData.options || [],
      available: productData.available !== false,
      sizes: productData.sizes || [],
      stock: productData.stock || 0,
      stock_alert_threshold: productData.stock_alert_threshold || 2,
      track_stock: productData.track_stock || false,
      width_cm: productData.width_cm || null,
      depth_cm: productData.depth_cm || null,
      height_cm: productData.height_cm || null,
      weight_kg: productData.weight_kg || null
    };

    const { data, error } = await supabase.from(COLLECTIONS.PRODUCTS).insert(cleanData).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Produto criado mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async updateProduct(productId: string, productData: Partial<Product>) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const cleanData: any = { updated_at: new Date().toISOString() };
    if (productData.name !== undefined) cleanData.name = productData.name;
    if (productData.description !== undefined) cleanData.description = productData.description;
    if (productData.category_id !== undefined) cleanData.category_id = productData.category_id;
    if (productData.image_url !== undefined) cleanData.image_url = productData.image_url;
    if (productData.features !== undefined) cleanData.features = productData.features;
    if (productData.available !== undefined) cleanData.available = productData.available;
    if (productData.has_options !== undefined) cleanData.has_options = productData.has_options;
    if (productData.options !== undefined) cleanData.options = productData.options;
    if (productData.sizes !== undefined) cleanData.sizes = productData.sizes;
    if (productData.stock !== undefined) cleanData.stock = productData.stock;
    if (productData.stock_alert_threshold !== undefined) cleanData.stock_alert_threshold = productData.stock_alert_threshold;
    if (productData.track_stock !== undefined) cleanData.track_stock = productData.track_stock;
    if (productData.width_cm !== undefined) cleanData.width_cm = productData.width_cm;
    if (productData.depth_cm !== undefined) cleanData.depth_cm = productData.depth_cm;
    if (productData.height_cm !== undefined) cleanData.height_cm = productData.height_cm;
    if (productData.weight_kg !== undefined) cleanData.weight_kg = productData.weight_kg;

    const { error } = await supabase.from(COLLECTIONS.PRODUCTS).update(cleanData).eq('id', productId);
    if (error) throw new Error(error.message);
  },

  async deleteProduct(productId: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.PRODUCTS).delete().eq('id', productId);
    if (error) throw new Error(error.message);
  },

  mapProduct(doc: any): Product {
    let sizes: ProductSize[] = [];
    if (Array.isArray(doc.sizes) && doc.sizes.length > 0) {
      sizes = doc.sizes as ProductSize[];
    } else if (doc.price_medium || doc.price_small || doc.price_large) {
      // Backward compat: migrate old price fields to sizes array
      if (doc.has_unique_price && doc.price_medium) {
        sizes = [{ code: 'm', label: 'Unique', price: doc.price_medium }];
      } else {
        if (doc.price_small > 0) sizes.push({ code: 's', label: '1 place', price: doc.price_small });
        if (doc.price_medium > 0) sizes.push({ code: 'm', label: '2 places', price: doc.price_medium });
        if (doc.price_large > 0) sizes.push({ code: 'l', label: '3 places', price: doc.price_large });
      }
    }
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      category_id: doc.category_id || undefined,
      image_url: doc.image_url || undefined,
      features: doc.features || [],
      has_options: doc.has_options || false,
      options: doc.options || [],
      available: doc.available !== false,
      sizes,
      sizes_pro: Array.isArray(doc.sizes_pro) && doc.sizes_pro.length > 0 ? (doc.sizes_pro as ProductSize[]) : undefined,
      pro_discount_percent: doc.pro_discount_percent ?? 0,
      pro_price_override: doc.pro_price_override ?? false,
      stock: doc.stock ?? 0,
      stock_alert_threshold: doc.stock_alert_threshold ?? 2,
      track_stock: doc.track_stock ?? false,
      width_cm: doc.width_cm || undefined,
      depth_cm: doc.depth_cm || undefined,
      height_cm: doc.height_cm || undefined,
      weight_kg: doc.weight_kg || undefined,
      created_at: doc.created_at
    };
  },

  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from(COLLECTIONS.PRODUCTS).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).filter(p => p.available !== false).map(this.mapProduct);
  },

  async decrementStockForOrder(items: { product_id: string; quantity: number }[]) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    for (const item of items) {
      const { data } = await supabase
        .from(COLLECTIONS.PRODUCTS)
        .select('stock, track_stock')
        .eq('id', item.product_id)
        .maybeSingle();
      if (data?.track_stock) {
        const newStock = Math.max(0, (data.stock ?? 0) - item.quantity);
        await supabase.from(COLLECTIONS.PRODUCTS)
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.product_id);
      }
    }
  },

  async getAllProductsForAdmin(): Promise<Product[]> {
    const { data, error } = await supabase.from(COLLECTIONS.PRODUCTS).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(this.mapProduct);
  },

  subscribeToActiveProducts(callback: (products: Product[]) => void) {
    supabase.from(COLLECTIONS.PRODUCTS).select('*').eq('available', true).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) callback(data.map(this.mapProduct));
    });

    const channelId = `active_products_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.PRODUCTS }, () => {
        supabase.from(COLLECTIONS.PRODUCTS).select('*').eq('available', true).order('created_at', { ascending: false }).then(({ data }) => {
          if (data) callback(data.map(this.mapProduct));
        });
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeToAllProducts(callback: (products: Product[]) => void) {
    supabase.from(COLLECTIONS.PRODUCTS).select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) callback(data.map(this.mapProduct));
    });

    const channelId = `all_products_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.PRODUCTS }, () => {
        supabase.from(COLLECTIONS.PRODUCTS).select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) callback(data.map(this.mapProduct));
        });
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }
};

// Backward compat alias
export const pizzasService = productsService;

// Product Images Service
export const productImagesService = {
  async getProductImages(productId: string): Promise<ProductImage[]> {
    const { data, error } = await supabase
      .from(COLLECTIONS.PRODUCT_IMAGES)
      .select('*')
      .eq('product_id', productId)
      .order('position', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as ProductImage[];
  },

  async addProductImage(productId: string, imageUrl: string, position: number = 0): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const { data, error } = await supabase
      .from(COLLECTIONS.PRODUCT_IMAGES)
      .insert({ product_id: productId, image_url: imageUrl, position })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Imagem inserida mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async deleteProductImage(imageId: string): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase
      .from(COLLECTIONS.PRODUCT_IMAGES)
      .delete()
      .eq('id', imageId);
    if (error) throw new Error(error.message);
  },

  async reorderImages(productId: string, imageIds: string[]): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    for (let i = 0; i < imageIds.length; i++) {
      await supabase
        .from(COLLECTIONS.PRODUCT_IMAGES)
        .update({ position: i })
        .eq('id', imageIds[i])
        .eq('product_id', productId);
    }
  },

  async reorderProductImages(images: { id: string; position: number }[]): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    for (const img of images) {
      await supabase
        .from(COLLECTIONS.PRODUCT_IMAGES)
        .update({ position: img.position })
        .eq('id', img.id);
    }
  }
};

// Orders Service
export const ordersService = {
  async createOrder(orderData: any): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const orderNumber = (20000 + Math.floor(Date.now() / 1000) % 100000).toString();

    const cleanData: any = {
      order_number: orderNumber,
      user_id: orderData.user_id,
      customer_name: orderData.user?.full_name || 'Anonyme',
      customer_email: orderData.user?.email || '',
      customer_phone: orderData.user?.phone || '',
      customer_address: orderData.user?.address || '',
      pickup_address: orderData.pickup_address || '',
      delivery_type: orderData.delivery_type || 'pickup',
      delivery_address: orderData.delivery_address || null,
      delivery_fee: orderData.delivery_fee || 0,
      delivery_distance: orderData.delivery_distance || null,
      items: orderData.items || [],
      total: orderData.total || 0,
      commission_total: orderData.commission_total || 0,
      status: orderData.status || 'pending',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from(COLLECTIONS.ORDERS).insert(cleanData).select('id').single();
    if (error) {
      console.error('❌ Erreur Supabase Insert:', error);
      throw new Error(error.message);
    }
    if (!data) throw new Error('Encomenda criada mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async createStripeSession(orderId: string, orderItems: any[], userEmail: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

    try {
      const { data: sessionData } = await supabaseAuth.auth.getSession();
      const accessToken = sessionData.session?.access_token || supabaseAnonKey;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          orderId,
          items: orderItems,
          customerEmail: userEmail,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: window.location.origin
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur Edge Function:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.details || errorJson.message || `Erreur ${response.status}: ${errorText}`);
        } catch (e) {
          throw new Error(`Erreur ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Erreur appel Edge Function:', error);
      throw new Error(error.message || 'Échec du traitement du paiement');
    }
  },

  async confirmPayment(orderId: string): Promise<boolean> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return true;
    // END TODO
    try {
      const { error } = await supabase.from(COLLECTIONS.ORDERS).update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      }).eq('id', orderId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erreur confirmation paiement:', error);
      return false;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, cancellationReason?: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (cancellationReason) updateData.cancellation_reason = cancellationReason;
    if (status === 'shipped') updateData.shipped_at = new Date().toISOString();
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
    const { error } = await supabase.from(COLLECTIONS.ORDERS).update(updateData).eq('id', orderId);
    if (error) throw new Error(error.message);
  },

  async updateOrderDeliveryDate(orderId: string, estimatedDeliveryDate: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.ORDERS).update({
      estimated_delivery_date: estimatedDeliveryDate,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
    if (error) throw new Error(error.message);
  },

  async updateStock(productId: string, newStock: number) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.PRODUCTS).update({
      stock: newStock,
      updated_at: new Date().toISOString()
    }).eq('id', productId);
    if (error) throw new Error(error.message);
  },

  async updateOrderPreparationTime(orderId: string, preparationTime: number) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.ORDERS).update({
      preparation_time: preparationTime,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
    if (error) throw new Error(error.message);
  },

  async deleteOrder(orderId: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.ORDERS).delete().eq('id', orderId);
    if (error) throw new Error('Erreur suppression commande : ' + error.message);
  },

  async hideOrderForAdmin(orderId: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.ORDERS).update({
      admin_hidden: true,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
    if (error) throw new Error(error.message);
  },

  mapOrder(doc: any): Order {
    return {
      id: doc.id,
      user_id: doc.user_id,
      user: {
        id: doc.user_id,
        email: doc.customer_email || '',
        full_name: doc.customer_name || '',
        phone: doc.customer_phone || '',
        address: doc.customer_address || '',
        role: 'client'
      },
      pickup_address: doc.pickup_address || '',
      delivery_type: doc.delivery_type as 'delivery' | 'pickup',
      delivery_address: doc.delivery_address || undefined,
      delivery_distance: doc.delivery_distance,
      items: doc.items || [],
      total: doc.total || 0,
      delivery_fee: doc.delivery_fee || 0,
      status: doc.status as OrderStatus,
      payment_status: doc.payment_status || undefined,
      order_number: parseInt(doc.order_number) || 0,
      created_at: doc.created_at,
      boutique_hidden: doc.boutique_hidden,
      admin_hidden: doc.admin_hidden,
      cancellation_reason: doc.cancellation_reason,
      preparation_time: doc.preparation_time,
      commission_total: doc.commission_total,
      estimated_delivery_days: doc.estimated_delivery_days || undefined,
      estimated_delivery_date: doc.estimated_delivery_date || undefined,
      shipped_at: doc.shipped_at || undefined,
      delivered_at: doc.delivered_at || undefined,
      updated_at: doc.updated_at
    };
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (!userId || userId.startsWith('test-')) return [];
    // END TODO
    const { data, error } = await supabase.from(COLLECTIONS.ORDERS).select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(this.mapOrder);
  },

  async getAllOrders(): Promise<Order[]> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (sessionStorage.getItem('dev_test_user')) return [];
    // END TODO
    const { data, error } = await supabase.from(COLLECTIONS.ORDERS).select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(this.mapOrder);
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (!userId || userId.startsWith('test-')) {
      callback([]);
      return () => {};
    }
    // END TODO
    this.getUserOrders(userId).then(callback);

    const channel = supabase.channel(`orders_user_${userId}`)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.ORDERS, filter: `user_id=eq.${userId}` }, () => {
        this.getUserOrders(userId).then(callback);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeToAllOrders(callback: (orders: Order[]) => void) {
    const channelId = `orders_all_${Date.now()}`;
    this.getAllOrders().then(callback);

    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.ORDERS }, () => {
        this.getAllOrders().then(callback);
      }).subscribe((status, err) => {
        if (err) console.error(`❌ [Realtime] Erreur canal ${channelId}:`, err);
      });

    return () => { supabase.removeChannel(channel); };
  },

  subscribeToOrdersByStatus(status: OrderStatus, callback: (orders: Order[]) => void) {
    supabase.from(COLLECTIONS.ORDERS).select('*').eq('status', status).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) callback(data.map(this.mapOrder));
    });

    const channel = supabase.channel(`orders_${status}`)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.ORDERS, filter: `status=eq.${status}` }, () => {
        supabase.from(COLLECTIONS.ORDERS).select('*').eq('status', status).order('created_at', { ascending: false }).then(({ data }) => {
          if (data) callback(data.map(this.mapOrder));
        });
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  async deleteAllOrders() {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.ORDERS).update({ boutique_hidden: true }).not('id', 'is', null);
    if (error) throw new Error(error.message);
  }
};

// Categories Service
export const categoriesService = {
  async createCategory(categoryData: { name: string; description?: string; active: boolean }) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const { data, error } = await supabase.from(COLLECTIONS.CATEGORIES).insert(categoryData).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Categoria criada mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async updateCategory(categoryId: string, categoryData: Partial<{ name: string; description?: string; active: boolean }>) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.CATEGORIES).update({ ...categoryData, updated_at: new Date().toISOString() }).eq('id', categoryId);
    if (error) throw new Error(error.message);
  },

  async deleteCategory(categoryId: string) {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.CATEGORIES).delete().eq('id', categoryId);
    if (error) throw new Error(error.message);
  },

  async getAllCategories(): Promise<any[]> {
    const { data, error } = await supabase.from(COLLECTIONS.CATEGORIES).select('*').order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  subscribeToCategories(callback: (categories: any[]) => void) {
    this.getAllCategories().then(callback);
    const channelId = `categories_all_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.CATEGORIES }, () => {
        this.getAllCategories().then(callback);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }
};

// Promotions Service
export const promotionsService = {
  mapPromotion(doc: any) {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description || '',
      active: doc.active,
      type: doc.type,
      buyCondition: {
        count: doc.buy_condition?.count || 0,
        category: doc.buy_condition?.category,
        productIds: doc.buy_condition?.product_ids || doc.buy_condition?.productIds,
        size: doc.buy_condition?.size
      },
      reward: {
        count: doc.reward?.count || 0,
        productId: doc.reward?.product_id || doc.reward?.productId,
        category: doc.reward?.category,
        size: doc.reward?.size,
        discountType: doc.reward?.discount_type || doc.reward?.discountType || 'free',
        discountValue: doc.reward?.discount_value || doc.reward?.discountValue || 0
      },
      created_at: doc.created_at,
      updated_at: doc.updated_at
    };
  },

  unmapPromotion(promo: any): any {
    const unmapped: any = {
      name: promo.name,
      description: promo.description,
      active: promo.active,
      type: promo.type
    };

    if (promo.buyCondition) {
      unmapped.buy_condition = {
        count: promo.buyCondition.count,
        category: promo.buyCondition.category,
        product_ids: promo.buyCondition.productIds,
        size: promo.buyCondition.size
      };
    }

    if (promo.reward) {
      unmapped.reward = {
        count: promo.reward.count,
        product_id: promo.reward.productId,
        category: promo.reward.category,
        size: promo.reward.size,
        discount_type: promo.reward.discountType,
        discount_value: promo.reward.discountValue
      };
    }

    return unmapped;
  },

  async getActivePromotions(): Promise<PromotionRule[]> {
    const { data, error } = await supabase.from(COLLECTIONS.PROMOTIONS).select('*').eq('active', true);
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapPromotion(d));
  },

  subscribeToActivePromotions(callback: (promotions: PromotionRule[]) => void) {
    this.getActivePromotions().then(callback);
    const channelId = `promotions_active_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.PROMOTIONS }, () => {
        this.getActivePromotions().then(callback);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  async getAllPromotions(): Promise<PromotionRule[]> {
    const { data, error } = await supabase.from(COLLECTIONS.PROMOTIONS).select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapPromotion(d));
  },

  subscribeToAllPromotions(callback: (promotions: PromotionRule[]) => void) {
    this.getAllPromotions().then(callback);
    const channelId = `promotions_all_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.PROMOTIONS }, () => {
        this.getAllPromotions().then(callback);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  async addPromotion(promotion: Omit<PromotionRule, 'id'>): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const unmapped = this.unmapPromotion(promotion);
    const { data, error } = await supabase.from(COLLECTIONS.PROMOTIONS).insert(unmapped).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Promoção criada mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async updatePromotion(id: string, promotion: Partial<PromotionRule>): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const unmapped = this.unmapPromotion(promotion);
    unmapped.updated_at = new Date().toISOString();
    const { error } = await supabase.from(COLLECTIONS.PROMOTIONS).update(unmapped).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deletePromotion(id: string): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.PROMOTIONS).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
};

// Banner Gallery Service
export const bannerGalleryService = {
  async getAllImages(): Promise<{ id: string; url: string; name: string; created_at: string }[]> {
    const { data, error } = await supabase.from(COLLECTIONS.BANNER_GALLERY).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => ({ id: d.id, url: d.image_url, name: d.name || '', created_at: d.created_at }));
  },

  async addImage(url: string, name: string): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const { data, error } = await supabase.from(COLLECTIONS.BANNER_GALLERY).insert({ image_url: url, name }).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Imagem inserida mas sem resposta do servidor — verifique as permissões RLS');
    return data.id;
  },

  async deleteImage(id: string): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase.from(COLLECTIONS.BANNER_GALLERY).delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  subscribeToGallery(callback: (images: any[]) => void, errorCallback?: (error: any) => void) {
    this.getAllImages().then(callback).catch(e => errorCallback && errorCallback(e));
    const channelId = `banner_gallery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: COLLECTIONS.BANNER_GALLERY }, () => {
        this.getAllImages().then(callback).catch(e => errorCallback && errorCallback(e));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }
};

// Pro pricing helper
export function getProPrice(product: Product, sizeCode: string, userDiscount: number): number {
  if (product.pro_price_override && product.sizes_pro && product.sizes_pro.length > 0) {
    const proSize = product.sizes_pro.find(s => s.code === sizeCode);
    if (proSize) return proSize.price;
  }
  const normalSize = product.sizes.find(s => s.code === sizeCode);
  if (!normalSize) return 0;
  const discount = Math.max(product.pro_discount_percent ?? 0, userDiscount);
  return normalSize.price * (1 - discount / 100);
}

// Pro Requests Service
export const proRequestsService = {
  async fetchProRequests(status?: ProRequestStatus): Promise<ProRequest[]> {
    let query = supabase
      .from(COLLECTIONS.PRO_REQUESTS)
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = (query as any).eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as ProRequest[];
  },

  async fetchProClients(): Promise<User[]> {
    const { data, error } = await supabase
      .from(COLLECTIONS.USERS)
      .select('*')
      .eq('pro_validated', true);
    if (error) throw new Error(error.message);
    return (data || []) as User[];
  },

  async submitProRequest(data: {
    user_id?: string;
    company_name: string;
    nif: string;
    email: string;
    phone?: string;
    address?: string;
    activity_sector?: string;
    message?: string;
  }): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return crypto.randomUUID();
    // END TODO
    const { data: result, error } = await supabase
      .from(COLLECTIONS.PRO_REQUESTS)
      .insert({ ...data, status: 'pending', auto_verification_attempted: false })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    if (!result) throw new Error('Pedido criado mas sem resposta do servidor');
    return result.id;
  },

  async approveProRequest(requestId: string, userId: string, discountPercent: number, reviewedBy?: string): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const now = new Date().toISOString();
    const { error: reqError } = await supabase
      .from(COLLECTIONS.PRO_REQUESTS)
      .update({ status: 'approved', reviewed_by: reviewedBy, reviewed_at: now, updated_at: now })
      .eq('id', requestId);
    if (reqError) throw new Error(reqError.message);
    const { error: userError } = await supabase
      .from(COLLECTIONS.USERS)
      .update({ pro_validated: true, pro_discount_percent: discountPercent, pro_validated_at: now, pro_validated_by: reviewedBy, role: 'pro', updated_at: now })
      .eq('id', userId);
    if (userError) throw new Error(userError.message);
  },

  async rejectProRequest(requestId: string, reason: string, reviewedBy?: string): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const now = new Date().toISOString();
    const { error } = await supabase
      .from(COLLECTIONS.PRO_REQUESTS)
      .update({ status: 'rejected', rejection_reason: reason, reviewed_by: reviewedBy, reviewed_at: now, updated_at: now })
      .eq('id', requestId);
    if (error) throw new Error(error.message);
  },

  async updateProDiscount(userId: string, discountPercent: number): Promise<void> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return;
    // END TODO
    const { error } = await supabase
      .from(COLLECTIONS.USERS)
      .update({ pro_discount_percent: discountPercent, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // TODO: brancher API vérification NIF portugaise
  async verifyNifAuto(_nif: string): Promise<{ valid: boolean; company_name?: string; error?: string }> {
    return { valid: false, error: 'Verificação automática não configurada' };
  }
};

// Storage Service
export const storageService = {
  async uploadImage(file: File, bucket: string = 'product-images'): Promise<string> {
    // TODO: REMOVE BEFORE PRODUCTION
    if (isTestUser()) return 'https://placehold.co/400x400?text=TEST';
    // END TODO
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Storage error:', error);
      throw new Error(error.message);
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicData.publicUrl;
  }
};

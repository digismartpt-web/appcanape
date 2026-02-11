// Types de base pour l'application
export type UserRole = 'admin' | 'pizzeria' | 'client';

export type OrderStatus = 'en_attente' | 'confirmee' | 'en_preparation' | 'prete' | 'em_entrega' | 'recuperee' | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Pizza {
  id: string;
  name: string;
  description: string;
  image_url: string;
  prices: {
    small: number;
    medium: number;
    large: number;
  };
  has_unique_price?: boolean;
  unique_price?: number;
  ingredients: string[];
  category: string;
  vegetarian: boolean;
  active?: boolean;
  customizable?: boolean;
  max_custom_ingredients?: number;
  custom_ingredients?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  pizza_id: string;
  pizza_name: string;
  pizza_category?: string;
  size: 'small' | 'medium' | 'large';
  quantity: number;
  price: number;
  removed_ingredients?: string[];
  extras?: Extra[];
  custom_ingredients?: string[];
}

export type DeliveryType = 'delivery' | 'pickup';

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  user: {
    full_name: string;
    phone: string;
    address: string;
    email: string;
  };
  pickup_address: string;
  delivery_type: DeliveryType;
  delivery_address?: string;
  items: OrderItem[];
  total: number;
  delivery_fee?: number;
  status: OrderStatus;
  cancellation_reason?: string;
  preparation_time?: number;
  delivery_time?: number;
  estimated_delivery_time?: string;
  estimated_delivery_time_confirmed?: boolean;
  requested_later_time?: string;
  delivery_distance?: number;
  estimated_time?: number;
  commission_total?: number;
  pizzeria_hidden?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  pizza: Pizza;
  size: 'small' | 'medium' | 'large';
  quantity: number;
  removedIngredients: string[];
  extras: Extra[];
  customIngredients: string[];
  discount?: number;
  isFree?: boolean;
}

export interface PromotionRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'buy_x_get_y_free' | 'buy_x_get_fixed_discount' | 'buy_x_get_percentage';
  buyCondition: {
    count: number;
    category?: string;
    productIds?: string[];
    size?: 'small' | 'medium' | 'large';
  };
  reward: {
    count: number;
    productId?: string;
    category?: string;
    size?: 'small' | 'medium' | 'large';
    discountType: 'free' | 'percentage' | 'fixed';
    discountValue: number;
  };
  created_at?: any;
  updated_at?: any;
}
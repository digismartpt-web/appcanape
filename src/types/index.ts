export type UserRole = 'admin' | 'boutique' | 'client' | 'pro';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ProRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at?: string;
  pro_validated?: boolean;
  pro_discount_percent?: number;
  pro_validated_at?: string;
  pro_validated_by?: string;
}

export interface ProRequest {
  id: string;
  user_id: string;
  company_name: string;
  nif: string;
  email: string;
  phone?: string;
  address?: string;
  activity_sector?: string;
  message?: string;
  status: ProRequestStatus;
  rejection_reason?: string;
  auto_verification_attempted: boolean;
  auto_verification_result?: Record<string, any>;
  auto_verification_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
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

export interface ProductSize {
  code: string;
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  features: string[];
  has_options: boolean;
  options: string[];
  category_id?: string;
  image_url?: string;
  images?: ProductImage[];
  available: boolean;
  sizes: ProductSize[];
  sizes_pro?: ProductSize[];
  pro_discount_percent?: number;
  pro_price_override?: boolean;
  stock: number;
  stock_alert_threshold: number;
  track_stock: boolean;
  width_cm?: number;
  depth_cm?: number;
  height_cm?: number;
  weight_kg?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
  created_at?: string;
}

// Alias rétrocompatibilité
export type Pizza = Product;

export interface CartItem {
  id: string;
  product: Product;
  sizeCode: string;
  sizeLabel: string;
  selectedOption?: string;
  quantity: number;
  price: number;
  discount?: number;
  isFree?: boolean;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_category?: string;
  size: string;
  size_label?: string;
  selected_option?: string;
  quantity: number;
  price: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  user: {
    id?: string;
    full_name: string;
    phone: string;
    address: string;
    email: string;
    role?: string;
  };
  pickup_address: string;
  delivery_type: DeliveryType;
  delivery_address?: string;
  items: OrderItem[];
  total: number;
  delivery_fee?: number;
  status: OrderStatus;
  payment_status?: string;
  cancellation_reason?: string;
  preparation_time?: number;
  delivery_distance?: number;
  commission_total?: number;
  boutique_hidden?: boolean;
  admin_hidden?: boolean;
  estimated_delivery_days?: number;
  estimated_delivery_date?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at?: string;
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
    size?: string;
  };
  reward: {
    count: number;
    productId?: string;
    category?: string;
    size?: string;
    discountType: 'free' | 'percentage' | 'fixed';
    discountValue: number;
  };
  created_at?: any;
  updated_at?: any;
}

-- ============================================================
-- MIGRATION : Schéma canape_module
-- À exécuter dans Supabase Studio > SQL Editor
-- NE TOUCHE PAS au schéma "public" ni aux autres schémas
-- ============================================================

CREATE SCHEMA IF NOT EXISTS canape_module;

-- ============================================================
-- TABLES
-- ============================================================

-- Catégories produits
CREATE TABLE canape_module.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Produits
CREATE TABLE canape_module.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  features text[] DEFAULT '{}',
  has_options boolean DEFAULT false,
  max_options integer DEFAULT 3,
  options text[] DEFAULT '{}',
  category_id uuid REFERENCES canape_module.categories(id),
  category text,
  image_url text,
  available boolean DEFAULT true,
  has_unique_price boolean DEFAULT false,
  unique_price decimal,
  price_small decimal DEFAULT 0,
  price_medium decimal DEFAULT 0,
  price_large decimal DEFAULT 0,
  vegetarian boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Photos supplémentaires par produit
CREATE TABLE canape_module.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES canape_module.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Options / Extras
CREATE TABLE canape_module.extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commandes
CREATE TABLE canape_module.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  pickup_address text,
  delivery_type text DEFAULT 'pickup',
  delivery_address text,
  delivery_fee decimal DEFAULT 0,
  delivery_distance decimal,
  items jsonb NOT NULL DEFAULT '[]',
  total decimal NOT NULL DEFAULT 0,
  commission_total decimal DEFAULT 0,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  stripe_payment_intent_id text,
  stripe_charge_id text,
  preparation_time integer,
  notes text,
  cancellation_reason text,
  boutique_hidden boolean DEFAULT false,
  admin_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promotions
CREATE TABLE canape_module.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'buy_x_get_y_free',
  active boolean DEFAULT true,
  buy_condition jsonb DEFAULT '{}',
  reward jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bannières
CREATE TABLE canape_module.banner_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  name text,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Paramètres boutique (une seule ligne avec UUID fixe)
CREATE TABLE canape_module.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'Boutique',
  logo_url text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  primary_color text DEFAULT '#000000',
  is_open boolean DEFAULT true,
  delivery_enabled boolean DEFAULT true,
  pickup_enabled boolean DEFAULT true,
  delivery_fee decimal DEFAULT 0,
  min_delivery_amount decimal DEFAULT 10,
  max_delivery_distance decimal,
  default_preparation_time integer DEFAULT 10,
  default_delivery_time integer DEFAULT 30,
  cutoff_minutes_before_closing integer DEFAULT 30,
  notification_sound_url text DEFAULT '',
  banner_active boolean DEFAULT false,
  banner_image_url text DEFAULT '',
  service_fee_percentage decimal DEFAULT 0,
  stripe_account_id text,
  delete_password text DEFAULT '',
  opening_hours jsonb DEFAULT '{"monday":"","tuesday":"","wednesday":"","thursday":"","friday":"","saturday":"","sunday":""}',
  created_at timestamptz DEFAULT now()
);

-- Profils utilisateurs
CREATE TABLE canape_module.users_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  role text DEFAULT 'client',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- BUCKET STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Ligne de paramètres unique (UUID fixe pour référence stable)
INSERT INTO canape_module.settings (id, name, stripe_account_id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Boutique', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FONCTIONS HELPER POUR RLS
-- ============================================================

CREATE OR REPLACE FUNCTION canape_module.current_user_role()
RETURNS text AS $$
  SELECT role FROM canape_module.users_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION canape_module.is_admin_or_boutique()
RETURNS boolean AS $$
  SELECT coalesce(
    (SELECT role IN ('admin', 'boutique') FROM canape_module.users_profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE canape_module.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.banner_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canape_module.users_profiles ENABLE ROW LEVEL SECURITY;

-- ---- PRODUCTS ----
CREATE POLICY "products_read_public" ON canape_module.products
  FOR SELECT USING (true);

CREATE POLICY "products_write_admin_boutique" ON canape_module.products
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- PRODUCT_IMAGES ----
CREATE POLICY "product_images_read_public" ON canape_module.product_images
  FOR SELECT USING (true);

CREATE POLICY "product_images_write_admin_boutique" ON canape_module.product_images
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- CATEGORIES ----
CREATE POLICY "categories_read_public" ON canape_module.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_write_admin_boutique" ON canape_module.categories
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- EXTRAS ----
CREATE POLICY "extras_read_public" ON canape_module.extras
  FOR SELECT USING (true);

CREATE POLICY "extras_write_admin_boutique" ON canape_module.extras
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- ORDERS ----
CREATE POLICY "orders_read_own_or_staff" ON canape_module.orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR canape_module.is_admin_or_boutique()
  );

CREATE POLICY "orders_insert_authenticated" ON canape_module.orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orders_update_own_or_staff" ON canape_module.orders
  FOR UPDATE USING (
    user_id = auth.uid()
    OR canape_module.is_admin_or_boutique()
  );

CREATE POLICY "orders_delete_admin_boutique" ON canape_module.orders
  FOR DELETE USING (canape_module.is_admin_or_boutique());

-- ---- PROMOTIONS ----
CREATE POLICY "promotions_read_public" ON canape_module.promotions
  FOR SELECT USING (true);

CREATE POLICY "promotions_write_admin_boutique" ON canape_module.promotions
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- BANNER_GALLERY ----
CREATE POLICY "banner_gallery_read_public" ON canape_module.banner_gallery
  FOR SELECT USING (true);

CREATE POLICY "banner_gallery_write_admin_boutique" ON canape_module.banner_gallery
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- SETTINGS ----
CREATE POLICY "settings_read_public" ON canape_module.settings
  FOR SELECT USING (true);

CREATE POLICY "settings_write_admin_boutique" ON canape_module.settings
  FOR ALL USING (canape_module.is_admin_or_boutique());

-- ---- USERS_PROFILES ----
CREATE POLICY "users_profiles_read_own_or_staff" ON canape_module.users_profiles
  FOR SELECT USING (
    id = auth.uid()
    OR canape_module.is_admin_or_boutique()
  );

CREATE POLICY "users_profiles_insert_own" ON canape_module.users_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_profiles_update_own_or_staff" ON canape_module.users_profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR canape_module.is_admin_or_boutique()
  );

-- ---- STORAGE : product-images ----
CREATE POLICY "product_images_storage_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_storage_write_admin_boutique" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "product_images_storage_delete_admin_boutique" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- REALTIME : activer pour les tables canape_module
-- (Nécessite que Realtime soit activé dans le dashboard Supabase)
-- ============================================================

-- Activer la réplication pour les tables principales
-- À exécuter après avoir activé Realtime dans le dashboard Supabase :
-- Dashboard > Database > Replication > cocher chaque table canape_module

-- alter publication supabase_realtime add table canape_module.products;
-- alter publication supabase_realtime add table canape_module.orders;
-- alter publication supabase_realtime add table canape_module.categories;
-- alter publication supabase_realtime add table canape_module.extras;
-- alter publication supabase_realtime add table canape_module.promotions;
-- alter publication supabase_realtime add table canape_module.settings;
-- alter publication supabase_realtime add table canape_module.banner_gallery;

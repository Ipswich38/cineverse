-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  image_url TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  billing_address TEXT,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_fee NUMERIC(10,2) DEFAULT 0 CHECK (shipping_fee >= 0),
  shipping_method TEXT DEFAULT 'standard' CHECK (shipping_method IN ('standard', 'express')),
  payment_method TEXT DEFAULT 'paymongo_all',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  fulfillment_status TEXT DEFAULT 'awaiting_payment' CHECK (
    fulfillment_status IN ('awaiting_payment', 'to_pack', 'packing', 'ready_to_ship', 'picked_up', 'shipped', 'delivered', 'returned')
  ),
  paymongo_session_id TEXT,
  paymongo_payment_id TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  paid_at TIMESTAMPTZ,
  inventory_deducted_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX orders_paymongo_session_id_idx ON orders(paymongo_session_id);
CREATE INDEX orders_fulfillment_status_idx ON orders(fulfillment_status, created_at DESC);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX products_active_created_at_idx ON products(is_active, created_at DESC);

CREATE OR REPLACE FUNCTION decrement_inventory_for_order(target_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  already_deducted TIMESTAMPTZ;
BEGIN
  SELECT inventory_deducted_at
  INTO already_deducted
  FROM orders
  WHERE id = target_order_id
  FOR UPDATE;

  IF already_deducted IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE products p
  SET stock = GREATEST(p.stock - oi.quantity, 0)
  FROM order_items oi
  WHERE oi.order_id = target_order_id
    AND oi.product_id = p.id;

  UPDATE orders
  SET inventory_deducted_at = NOW(),
      fulfillment_status = 'to_pack'
  WHERE id = target_order_id;
END;
$$;

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products publicly readable" ON products
  FOR SELECT USING (is_active = true);

-- Orders are written only by server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for orders or order_items.

-- Initial Waevpoint drone catalog
INSERT INTO products (name, slug, description, price, compare_at_price, image_url, stock, category, tags, badge) VALUES
('AeroMini 4K Drone Fly More Kit', 'aeromini-4k-drone-fly-more-kit', 'Compact 4K camera drone bundle with three batteries, charging hub, prop guards, and a travel case for creators and first-time pilots.', 38990.00, 42990.00, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 8, 'Drones', ARRAY['drone', '4k', 'creator', 'fly-more', 'beginner'], 'Best seller'),
('Quick-Snap Propeller Guard Set', 'quick-snap-propeller-guard-set', 'Lightweight guard set for safer indoor training, tight spaces, and beginner flight sessions.', 1490.00, 1790.00, 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80', 32, 'Accessories', ARRAY['propeller', 'guard', 'training', 'safety', 'add-on'], 'Bundle add-on'),
('SkyFrame Pro Gimbal Drone', 'skyframe-pro-gimbal-drone', 'Stabilized aerial imaging platform with a 3-axis gimbal, intelligent tracking, and long-range transmission for commercial shoots.', 84990.00, 92990.00, 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80', 4, 'Drones', ARRAY['drone', 'gimbal', 'pro', 'cinema', 'commercial'], 'Premium'),
('Intelligent Flight Battery', 'intelligent-flight-battery', 'High-density spare battery with smart power management, cycle tracking, and field-safe protection.', 5490.00, 6290.00, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&q=80', 6, 'Power', ARRAY['battery', 'power', 'drone', 'field', 'spare'], 'Low stock'),
('ND Filter Pack for Aerial Video', 'nd-filter-pack-for-aerial-video', 'ND8, ND16, ND32, and ND64 filter pack for smoother shutter control in bright outdoor flight conditions.', 2490.00, 2990.00, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80', 18, 'Accessories', ARRAY['filter', 'video', 'camera', 'cinema', 'add-on'], 'New'),
('Drone Field Backpack', 'drone-field-backpack', 'Weather-resistant backpack with padded drone bay, battery slots, controller pocket, and laptop sleeve.', 6990.00, 7990.00, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80', 9, 'Field Kits', ARRAY['backpack', 'field', 'travel', 'drone', 'kit'], 'Field kit'),
('Foldable Landing Pad Pro', 'foldable-landing-pad-pro', 'High-visibility, foldable landing pad for clean takeoff and landing on grass, sand, rooftops, and rough terrain.', 1290.00, NULL, 'https://images.unsplash.com/photo-1524143986875-3b098d78b363?w=900&q=80', 31, 'Field Kits', ARRAY['landing-pad', 'field', 'safety', 'add-on'], 'Add-on'),
('Triple Battery Fast Charging Hub', 'triple-battery-fast-charging-hub', 'Sequential fast charging hub for three drone batteries with field-friendly status indicators.', 3990.00, 4490.00, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&q=80', 22, 'Power', ARRAY['charger', 'battery', 'power', 'field', 'add-on'], 'Checkout add-on'),
('Aerial Survey Marker Kit', 'aerial-survey-marker-kit', 'Reusable high-contrast ground markers for mapping, inspection, construction progress, and survey workflows.', 3290.00, NULL, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80', 16, 'Field Kits', ARRAY['survey', 'mapping', 'field', 'inspection'], 'Mapping kit'),
('Controller Sun Hood', 'controller-sun-hood', 'Collapsible anti-glare hood for remote controllers and mobile screens during daylight flight.', 990.00, 1290.00, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80', 19, 'Accessories', ARRAY['controller', 'sun-hood', 'screen', 'field', 'add-on'], 'Frequently bought'),
('Low-Noise Propeller Pair', 'low-noise-propeller-pair', 'Balanced replacement propellers engineered for quieter flights and efficient lift.', 790.00, NULL, 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80', 40, 'Accessories', ARRAY['propeller', 'replacement', 'drone', 'add-on'], 'Add-on'),
('Waterproof Pilot Checklist Cards', 'waterproof-pilot-checklist-cards', 'Reusable pre-flight, site survey, battery safety, and post-flight checklist cards for field teams.', 590.00, 750.00, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80', 28, 'Field Kits', ARRAY['checklist', 'field', 'safety', 'pilot', 'add-on'], 'Smart add-on');

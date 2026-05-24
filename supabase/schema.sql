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

-- Sample products for demo
INSERT INTO products (name, slug, description, price, compare_at_price, image_url, stock, category, tags, badge) VALUES
('Everyday Oxford Shirt', 'everyday-oxford-shirt', 'A crisp cotton oxford with a relaxed fit, clean collar, and breathable weave for daily office-to-weekend wear.', 1290.00, 1490.00, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80', 18, 'Apparel', ARRAY['workwear', 'cotton', 'shirt', 'smart-casual'], 'Best seller'),
('Structured Canvas Tote', 'structured-canvas-tote', 'Heavyweight canvas tote with reinforced handles, inner pocket, and enough room for a laptop and daily carry.', 890.00, 1090.00, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&q=80', 24, 'Accessories', ARRAY['bag', 'canvas', 'commute', 'workwear'], 'Bundle pick'),
('Dawn Table Lamp', 'dawn-table-lamp', 'Warm ceramic table lamp with a linen shade, built for bedrooms, studios, and calm evening routines.', 2490.00, 2890.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80', 7, 'Home', ARRAY['home', 'lighting', 'studio', 'gift'], 'Premium'),
('Insulated Travel Bottle', 'insulated-travel-bottle', 'Double-wall stainless bottle that keeps drinks cold through commutes, workouts, and long errands.', 690.00, 790.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&q=80', 4, 'Travel', ARRAY['bottle', 'travel', 'commute', 'fitness'], 'Low stock'),
('Ribbed Lounge Set', 'ribbed-lounge-set', 'Soft ribbed coordinates with an easy silhouette for work-from-home days and weekend errands.', 1590.00, 1890.00, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80', 12, 'Apparel', ARRAY['loungewear', 'set', 'weekend', 'comfort'], 'New'),
('Weekend Duffle Bag', 'weekend-duffle-bag', 'Compact travel duffle with a structured base, interior pocketing, and comfortable carry handles.', 1890.00, 2290.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80', 9, 'Travel', ARRAY['bag', 'travel', 'weekend', 'commute'], 'Travel edit'),
('Desk Organizer Tray', 'desk-organizer-tray', 'Powder-coated desk tray for cables, keys, notebooks, and clean daily work surfaces.', 540.00, NULL, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80', 31, 'Home', ARRAY['desk', 'organizer', 'workwear', 'home-office'], 'Add-on'),
('Everyday Cotton Cap', 'everyday-cotton-cap', 'Low-profile cotton cap with an adjustable back strap and softly structured brim.', 490.00, 590.00, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=900&q=80', 22, 'Accessories', ARRAY['cap', 'cotton', 'travel', 'weekend'], 'Checkout add-on'),
('Hinoki Soy Candle', 'hinoki-soy-candle', 'Clean-burning soy candle with hinoki, citrus peel, and soft musk for calm interiors.', 760.00, NULL, 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900&q=80', 16, 'Home', ARRAY['home', 'gift', 'scent', 'premium'], 'Giftable'),
('Tech Cable Pouch', 'tech-cable-pouch', 'Compact pouch with mesh dividers for chargers, earbuds, cards, and travel tech.', 650.00, 790.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80', 19, 'Accessories', ARRAY['tech', 'pouch', 'travel', 'commute'], 'Frequently bought'),
('Commuter Rib Socks', 'commuter-rib-socks', 'Breathable rib socks with a cushioned sole for office days, travel, and weekends.', 320.00, NULL, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80', 40, 'Apparel', ARRAY['socks', 'apparel', 'commute', 'add-on'], 'Add-on'),
('Linen Daily Notebook', 'linen-daily-notebook', 'Hardbound linen notebook with smooth paper, lay-flat binding, and subtle date markers.', 420.00, 520.00, 'https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=900&q=80', 28, 'Accessories', ARRAY['notebook', 'desk', 'gift', 'workwear'], 'Smart add-on');

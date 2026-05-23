-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
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
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  paymongo_session_id TEXT,
  paymongo_payment_id TEXT,
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
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX products_active_created_at_idx ON products(is_active, created_at DESC);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products publicly readable" ON products
  FOR SELECT USING (is_active = true);

-- Orders are written only by server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for orders or order_items.

-- Sample products for demo
INSERT INTO products (name, slug, description, price, image_url, stock, category) VALUES
('Everyday Oxford Shirt', 'everyday-oxford-shirt', 'A crisp cotton oxford with a relaxed fit, clean collar, and breathable weave for daily office-to-weekend wear.', 1290.00, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80', 18, 'Apparel'),
('Structured Canvas Tote', 'structured-canvas-tote', 'Heavyweight canvas tote with reinforced handles, inner pocket, and enough room for a laptop and daily carry.', 890.00, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&q=80', 24, 'Accessories'),
('Dawn Table Lamp', 'dawn-table-lamp', 'Warm ceramic table lamp with a linen shade, built for bedrooms, studios, and calm evening routines.', 2490.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80', 7, 'Home'),
('Insulated Travel Bottle', 'insulated-travel-bottle', 'Double-wall stainless bottle that keeps drinks cold through commutes, workouts, and long errands.', 690.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&q=80', 4, 'Travel'),
('Ribbed Lounge Set', 'ribbed-lounge-set', 'Soft ribbed coordinates with an easy silhouette for work-from-home days and weekend errands.', 1590.00, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80', 12, 'Apparel'),
('Weekend Duffle Bag', 'weekend-duffle-bag', 'Compact travel duffle with a structured base, interior pocketing, and comfortable carry handles.', 1890.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80', 9, 'Travel');

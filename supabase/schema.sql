-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
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
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  paymongo_session_id TEXT,
  paymongo_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products publicly readable" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert order items" ON order_items
  FOR INSERT WITH CHECK (true);

-- Service role can update orders (for webhook)
CREATE POLICY "Service role can update orders" ON orders
  FOR UPDATE USING (true);

-- Sample products for demo
INSERT INTO products (name, slug, description, price, image_url, stock, category) VALUES
('Classic White Tee', 'classic-white-tee', 'Premium 100% cotton classic white t-shirt. Comfortable everyday wear.', 599.00, 'https://placehold.co/600x600/f5f5f5/333?text=White+Tee', 50, 'Clothing'),
('Black Hoodie', 'black-hoodie', 'Heavyweight fleece hoodie. Perfect for cool evenings.', 1299.00, 'https://placehold.co/600x600/222/fff?text=Black+Hoodie', 30, 'Clothing'),
('Denim Jacket', 'denim-jacket', 'Classic denim jacket with a modern slim fit. A wardrobe staple.', 1899.00, 'https://placehold.co/600x600/4a6fa5/fff?text=Denim+Jacket', 20, 'Clothing'),
('Cargo Shorts', 'cargo-shorts', 'Functional cargo shorts with multiple pockets. Great for outdoor use.', 799.00, 'https://placehold.co/600x600/8B7355/fff?text=Cargo+Shorts', 40, 'Clothing'),
('Cap - Vintage Wash', 'cap-vintage-wash', 'Washed cotton cap with adjustable strap. One size fits all.', 450.00, 'https://placehold.co/600x600/5C4033/fff?text=Vintage+Cap', 60, 'Accessories'),
('Canvas Tote Bag', 'canvas-tote-bag', 'Heavy duty canvas tote. Perfect for groceries or everyday carry.', 350.00, 'https://placehold.co/600x600/E8E0D0/333?text=Tote+Bag', 80, 'Accessories');

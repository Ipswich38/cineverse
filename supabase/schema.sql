-- ReelKit Rentals — peer-to-peer production gear rental marketplace.
-- ReelKit holds no inventory. Each listing belongs to an equipment OWNER
-- (notification-only; no login). Renters reserve gear with a 30% downpayment;
-- the balance is settled directly with the owner on handover.

-- Listings (table kept as `products` for tooling compatibility).
-- `price` = daily rental rate (₱/day). `stock` = units available to rent.
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),            -- daily rate
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  image_url TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),                  -- units available
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  reorder_threshold INT DEFAULT 1 CHECK (reorder_threshold >= 0),
  -- Equipment owner (contact shared with renter only after downpayment)
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  -- Smart add-on: hire an operator to run this gear
  operator_available BOOLEAN DEFAULT false,
  operator_day_rate NUMERIC(10,2) CHECK (operator_day_rate IS NULL OR operator_day_rate >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings (table kept as `orders`). A booking is a rental reservation.
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  billing_address TEXT,
  -- Rental specifics
  shoot_start_date DATE,
  rental_days INTEGER CHECK (rental_days IS NULL OR rental_days >= 1),
  notes TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0 CHECK (subtotal >= 0),          -- gear only
  operator_total NUMERIC(10,2) DEFAULT 0 CHECK (operator_total >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),   -- full rental total
  downpayment_pct NUMERIC(4,3) DEFAULT 0.300,
  downpayment_amount NUMERIC(10,2) DEFAULT 0 CHECK (downpayment_amount >= 0),
  balance_amount NUMERIC(10,2) DEFAULT 0 CHECK (balance_amount >= 0),
  payment_method TEXT DEFAULT 'paymongo_all',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  -- Legacy fulfillment columns retained for the admin dashboard (unused by rentals)
  shipping_fee NUMERIC(10,2) DEFAULT 0,
  shipping_method TEXT,
  fulfillment_status TEXT DEFAULT 'awaiting_payment' CHECK (
    fulfillment_status IN ('awaiting_payment', 'to_pack', 'packing', 'ready_to_ship', 'picked_up', 'shipped', 'delivered', 'returned')
  ),
  paymongo_session_id TEXT,
  paymongo_payment_id TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  paid_at TIMESTAMPTZ,
  owner_notified_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking line items (table kept as `order_items`). Owner contact is snapshotted per line
-- so the post-payment handoff is independent of later listing edits.
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),       -- units
  days INTEGER NOT NULL DEFAULT 1 CHECK (days >= 1),    -- rental duration
  daily_rate NUMERIC(10,2) NOT NULL CHECK (daily_rate >= 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0), -- mirror of daily_rate (legacy)
  with_operator BOOLEAN DEFAULT false,
  operator_day_rate NUMERIC(10,2),
  operator_fee NUMERIC(10,2) DEFAULT 0 CHECK (operator_fee >= 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT
);

CREATE INDEX orders_paymongo_session_id_idx ON orders(paymongo_session_id);
CREATE INDEX orders_status_idx ON orders(status, created_at DESC);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX products_active_created_at_idx ON products(is_active, created_at DESC);
CREATE INDEX products_category_idx ON products(category);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings publicly readable" ON products
  FOR SELECT USING (is_active = true);

-- Bookings are written only by server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for orders or order_items.

-- Demo catalog: production gear from several independent owners.
INSERT INTO products (name, slug, description, price, image_url, stock, category, tags, badge, owner_name, owner_email, owner_phone, operator_available, operator_day_rate) VALUES
('Sony FX6 Cinema Camera Kit', 'sony-fx6-cinema-camera-kit', 'Full-frame 4K cinema camera with dual base ISO, fast hybrid AF, and a cage + V-mount kit. Body, batteries, media, and rig included.', 4500, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 3, 'Camera', ARRAY['camera','cinema','4k','sony','fullframe'], 'Most booked', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 3500),
('RED Komodo 6K Camera Kit', 'red-komodo-6k-camera-kit', 'Compact 6K global-shutter cinema camera with REDCODE RAW, RF mount, and a complete shooting kit.', 6000, 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80', 2, 'Camera', ARRAY['camera','cinema','6k','red','raw'], 'Premium', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 4000),
('Canon CN-E Prime Lens Set', 'canon-cn-e-prime-lens-set', 'Five-lens cinema prime set (24, 35, 50, 85, 135mm) with consistent T-stops and matched color. EF mount with PL adapter available.', 3000, 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80', 2, 'Lenses', ARRAY['lens','prime','cinema','canon','set'], 'Glass', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', false, NULL),
('DJI Ronin 4D Gimbal Camera', 'dji-ronin-4d-gimbal-camera', '4-axis stabilized cinema system with LiDAR focus, full-frame sensor, and wireless video.', 3500, 'https://images.unsplash.com/photo-1744306423919-830b9f4b11e8?w=900&q=80', 2, 'Grip', ARRAY['gimbal','movement','stabilizer','dji','camera'], 'Movement', 'AeroFrame Studio', 'book@aeroframe.ph', '09181234567', true, 3000),
('Aputure LS 600x Pro LED', 'aputure-ls-600x-pro-led', 'Bi-color 600W point-source LED with Bowens mount and a softbox + stand kit. Daylight-to-tungsten output.', 1800, 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80', 4, 'Lighting', ARRAY['light','led','aputure','bicolor','key'], 'Best seller', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', true, 2500),
('Astera Titan Tube Kit (8)', 'astera-titan-tube-kit-8', 'Eight wireless RGB+mint LED tubes with case, charger, and CRMX control.', 2200, 'https://images.unsplash.com/photo-1529611934128-376c7bb1c88a?w=900&q=80', 3, 'Lighting', ARRAY['light','rgb','tube','astera','wireless'], 'Color', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', false, NULL),
('Matthews C-Stand Combo Set (6)', 'matthews-c-stand-combo-set-6', 'Six heavy-duty C-stands with grip heads, arms, and sandbags.', 900, 'https://images.unsplash.com/photo-1509762774605-f07235a08f1f?w=900&q=80', 5, 'Grip', ARRAY['grip','cstand','support','rigging','set'], 'Essential', 'GripHaus PH', 'rent@griphaus.ph', '09201234567', false, NULL),
('Heavy Tripod + Fluid Head', 'heavy-tripod-fluid-head', '100mm bowl tripod with a pro fluid head rated for cinema payloads.', 700, 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80', 6, 'Grip', ARRAY['grip','tripod','support','fluidhead','add-on'], 'Add-on', 'GripHaus PH', 'rent@griphaus.ph', '09201234567', false, NULL),
('Sennheiser MKH-416 Boom Kit', 'sennheiser-mkh-416-boom-kit', 'Industry-standard shotgun mic with boom pole, blimp, windshield, and cables.', 1200, 'https://images.unsplash.com/photo-1541617434114-48c3a51d0ab2?w=900&q=80', 3, 'Audio', ARRAY['audio','boom','shotgun','sennheiser','dialogue'], 'Sound', 'SoundMNL', 'book@soundmnl.ph', '09211234567', true, 3000),
('Zoom F8n Pro Recorder + Lavs', 'zoom-f8n-pro-recorder-lavs', '8-channel field recorder with timecode plus three wireless lav sets.', 1500, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 2, 'Audio', ARRAY['audio','recorder','lav','wireless','multitrack'], 'Add-on', 'SoundMNL', 'book@soundmnl.ph', '09211234567', false, NULL),
('DJI Inspire 3 Cinema Drone', 'dji-inspire-3-cinema-drone', 'Full-frame 8K aerial cinema platform with dual operator control. Requires a licensed pilot — add one as an operator.', 8000, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 1, 'Drone', ARRAY['drone','aerial','8k','dji','cinema'], 'Pilot required', 'AeroFrame Studio', 'book@aeroframe.ph', '09181234567', true, 5000),
('SmallHD 17" Production Monitor', 'smallhd-17-production-monitor', 'Bright 17-inch director/client monitor with SDI/HDMI, scopes, and a stand.', 1400, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 2, 'Power', ARRAY['monitor','director','sdi','add-on','video-village'], 'Add-on', 'PowerGrid Rentals', 'hi@powergrid.ph', '09221234567', false, NULL);

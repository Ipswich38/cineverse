-- CineVerse — production gear marketplace for the PH film/entertainment industry.
-- CineVerse holds no inventory. Each listing belongs to an equipment OWNER
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

-- Comprehensive demo catalog: production gear from several independent owners.
INSERT INTO products (name, slug, description, price, image_url, stock, category, tags, badge, owner_name, owner_email, owner_phone, operator_available, operator_day_rate) VALUES
-- Cameras
('Sony FX6 Cinema Camera Kit', 'sony-fx6-cinema-camera-kit', 'Full-frame 4K cinema camera with dual base ISO and fast AF. Cage, batteries, and media included.', 4500, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 3, 'Camera', ARRAY['camera','cinema','sony','4k','fullframe'], 'Most booked', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 3500),
('Sony FX3 Full-Frame Cinema Camera', 'sony-fx3-full-frame-cinema-camera', 'Compact full-frame cinema camera, gimbal-friendly, with active cooling and S-Cinetone.', 3500, 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80', 3, 'Camera', ARRAY['camera','cinema','sony','compact'], 'Compact', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 3000),
('Sony A7S III Mirrorless Kit', 'sony-a7s-iii-mirrorless-kit', 'Low-light king for run-and-gun and docu. 4K120, two lenses, and spare batteries.', 2800, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 4, 'Camera', ARRAY['camera','mirrorless','sony','lowlight'], 'Low-light', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 2500),
('RED Komodo 6K Camera Kit', 'red-komodo-6k-camera-kit', 'Compact 6K global-shutter cinema camera with REDCODE RAW and RF mount.', 6000, 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80', 2, 'Camera', ARRAY['camera','cinema','red','6k','raw'], 'Premium', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 4000),
('RED V-Raptor 8K VV Kit', 'red-v-raptor-8k-vv-kit', 'Flagship 8K large-format cinema camera with massive dynamic range for high-end production.', 14000, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 1, 'Camera', ARRAY['camera','cinema','red','8k','flagship'], 'Flagship', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 6000),
('Canon EOS C70 Cinema Camera', 'canon-eos-c70-cinema-camera', 'Super 35 RF-mount cinema camera with Dual Gain Output and built-in ND.', 4000, 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80', 3, 'Camera', ARRAY['camera','cinema','canon','super35'], 'Run-and-gun', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 3000),
('Canon EOS C300 Mark III', 'canon-eos-c300-mark-iii', 'Broadcast-grade Super 35 cinema camera with Dual Gain Output sensor and Cinema RAW Light.', 6500, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 2, 'Camera', ARRAY['camera','cinema','canon','broadcast'], 'Broadcast', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 4000),
('Blackmagic URSA Mini Pro 12K', 'blackmagic-ursa-mini-pro-12k', '12K Super 35 sensor with BRAW, built-in ND, and PL/EF mounts for ultra-detailed capture.', 5500, 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80', 2, 'Camera', ARRAY['camera','cinema','blackmagic','raw','12k'], 'RAW', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 3500),
('ARRI ALEXA Mini LF', 'arri-alexa-mini-lf', 'Large-format cinema flagship with legendary ARRI color science. The choice for feature work.', 18000, 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80', 1, 'Camera', ARRAY['camera','cinema','arri','flagship','largeformat'], 'Cinema flagship', 'Cinegear Manila', 'rentals@cinegearmanila.ph', '09171234567', true, 8000),
-- Action cams
('GoPro HERO12 Black', 'gopro-hero12-black', '5.3K60 action cam with HDR, HyperSmooth 6.0 stabilization, and accessory mounts.', 800, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 6, 'Action Cam', ARRAY['action','gopro','5k','pov','add-on'], 'Best seller', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
('GoPro HERO11 Black', 'gopro-hero11-black', 'Large 8:7 sensor action cam with 5.3K capture and rock-solid stabilization.', 650, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 5, 'Action Cam', ARRAY['action','gopro','5k','pov','add-on'], 'Value', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
('GoPro MAX 360 Camera', 'gopro-max-360-camera', '360 capture, reframing, and stitched stabilization for immersive and creative shots.', 900, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 3, 'Action Cam', ARRAY['action','gopro','360','creative'], '360', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
('DJI Osmo Action 4', 'dji-osmo-action-4', '1/1.3" sensor action cam with great low-light, dual touchscreens, and magnetic mounts.', 750, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 5, 'Action Cam', ARRAY['action','dji','pov','add-on'], 'Action', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
('DJI Osmo Pocket 3 Creator Combo', 'dji-osmo-pocket-3-creator-combo', '1" sensor pocket gimbal camera with 4K120, face tracking, and the creator combo kit.', 1100, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 4, 'Action Cam', ARRAY['action','dji','gimbal','vlog','creator'], 'Vlog', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
('Insta360 X4 360 Camera', 'insta360-x4-360-camera', '8K 360 camera with invisible selfie stick effect — perfect for reframed action and BTS.', 1000, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 4, 'Action Cam', ARRAY['action','insta360','360','8k'], '360', 'ActionCam Rentals PH', 'book@actioncamph.ph', '09171112233', false, NULL),
-- Lenses
('Canon CN-E Prime Lens Set', 'canon-cn-e-prime-lens-set', 'Five-lens cinema prime set (24, 35, 50, 85, 135mm) with matched color. EF mount, PL adapter available.', 3000, 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80', 2, 'Lens', ARRAY['lens','prime','cinema','canon','set'], 'Glass', 'LensWorks PH', 'hello@lensworks.ph', '09175556677', false, NULL),
('Sony G Master Zoom Trio', 'sony-g-master-zoom-trio', 'The holy trinity — 16-35, 24-70, 70-200mm f/2.8 G Master zooms for E-mount bodies.', 3500, 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80', 2, 'Lens', ARRAY['lens','zoom','sony','set'], 'Zoom set', 'LensWorks PH', 'hello@lensworks.ph', '09175556677', false, NULL),
('Sigma Cine FF High-Speed Prime Set', 'sigma-cine-ff-high-speed-prime-set', 'Full-frame T1.5 cinema prime set with consistent gearing and stunning sharpness.', 4500, 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80', 1, 'Lens', ARRAY['lens','prime','cinema','sigma','set'], 'Cine primes', 'LensWorks PH', 'hello@lensworks.ph', '09175556677', false, NULL),
('DZOFilm Vespid Prime Set', 'dzofilm-vespid-prime-set', 'Affordable full-frame T2.1 cinema primes with a clean, modern look. PL/EF mounts.', 2800, 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80', 2, 'Lens', ARRAY['lens','prime','cinema','value','set'], 'Value primes', 'LensWorks PH', 'hello@lensworks.ph', '09175556677', false, NULL),
-- Stabilizers
('DJI Ronin 4D 6K Gimbal Camera', 'dji-ronin-4d-6k-gimbal-camera', '4-axis stabilized cinema system with LiDAR focus, full-frame sensor, and wireless video.', 3500, 'https://images.unsplash.com/photo-1744306423919-830b9f4b11e8?w=900&q=80', 2, 'Stabilizer', ARRAY['gimbal','movement','dji','camera'], 'Movement', 'FrameMotion', 'book@framemotion.ph', '09181234567', true, 3000),
('DJI RS 4 Pro Gimbal', 'dji-rs-4-pro-gimbal', 'Pro 3-axis gimbal rated for heavy cine setups, with focus motor and image transmission ready.', 1200, 'https://images.unsplash.com/photo-1744306423919-830b9f4b11e8?w=900&q=80', 4, 'Stabilizer', ARRAY['gimbal','movement','dji'], 'Gimbal', 'FrameMotion', 'book@framemotion.ph', '09181234567', true, 2000),
('DJI Ronin 2 Professional', 'dji-ronin-2-professional', 'Heavy-payload gimbal for full cinema rigs — car mounts, cranes, and Steadicam work.', 2500, 'https://images.unsplash.com/photo-1744306423919-830b9f4b11e8?w=900&q=80', 2, 'Stabilizer', ARRAY['gimbal','movement','dji','heavy'], 'Heavy payload', 'FrameMotion', 'book@framemotion.ph', '09181234567', true, 3000),
-- Lighting
('Aputure LS 600x Pro LED', 'aputure-ls-600x-pro-led', 'Bi-color 600W point-source LED with Bowens mount and a softbox + stand kit.', 1800, 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80', 4, 'Lighting', ARRAY['light','led','aputure','bicolor','key'], 'Best seller', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', true, 2500),
('Aputure LS 1200d Pro', 'aputure-ls-1200d-pro', 'Powerful 1200W daylight LED for big sources, bounce, and night exteriors.', 2800, 'https://images.unsplash.com/photo-1529611934128-376c7bb1c88a?w=900&q=80', 3, 'Lighting', ARRAY['light','led','aputure','daylight','key'], 'Big output', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', true, 2500),
('Amaran 200x Bi-Color LED', 'amaran-200x-bi-color-led', 'Compact, budget-friendly 200W bi-color LED — a great fill or interview light.', 900, 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80', 6, 'Lighting', ARRAY['light','led','amaran','bicolor','add-on'], 'Budget key', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', false, NULL),
('Astera Titan Tube Kit (8)', 'astera-titan-tube-kit-8', 'Eight wireless RGB+mint LED tubes with case, charger, and CRMX control.', 2200, 'https://images.unsplash.com/photo-1529611934128-376c7bb1c88a?w=900&q=80', 3, 'Lighting', ARRAY['light','rgb','tube','astera','wireless'], 'Color', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', false, NULL),
('Quasar Science RGBX Tube Set (6)', 'quasar-science-rgbx-tube-set-6', 'Six linear RGBX LED tubes for practicals, accents, and hidden sources.', 1600, 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80', 3, 'Lighting', ARRAY['light','rgb','tube','quasar','practical'], 'Practical', 'Liwanag Lights', 'hello@liwanaglights.ph', '09191234567', false, NULL),
-- Grip
('Matthews C-Stand Combo Set (6)', 'matthews-c-stand-combo-set-6', 'Six heavy-duty C-stands with grip heads, arms, and sandbags.', 900, 'https://images.unsplash.com/photo-1509762774605-f07235a08f1f?w=900&q=80', 5, 'Grip', ARRAY['grip','cstand','support','set'], 'Essential', 'GripHaus PH', 'rent@griphaus.ph', '09201234567', false, NULL),
('Sachtler Flowtech 75 + Fluid Head', 'sachtler-flowtech-75-fluid-head', 'Fast-deploy carbon tripod with a pro fluid head for smooth pans and tilts.', 1200, 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80', 4, 'Grip', ARRAY['grip','tripod','support','fluidhead'], 'Pro support', 'GripHaus PH', 'rent@griphaus.ph', '09201234567', false, NULL),
('Dana Dolly Kit + Track', 'dana-dolly-kit-track', 'Portable dolly system with rails and risers for smooth slider and tracking moves.', 1400, 'https://images.unsplash.com/photo-1509762774605-f07235a08f1f?w=900&q=80', 2, 'Grip', ARRAY['grip','dolly','movement','slider'], 'Movement', 'GripHaus PH', 'rent@griphaus.ph', '09201234567', false, NULL),
-- Audio
('Sennheiser MKH-416 Boom Kit', 'sennheiser-mkh-416-boom-kit', 'Industry-standard shotgun mic with boom pole, blimp, windshield, and cables.', 1200, 'https://images.unsplash.com/photo-1541617434114-48c3a51d0ab2?w=900&q=80', 3, 'Audio', ARRAY['audio','boom','shotgun','sennheiser','dialogue'], 'Sound', 'SoundMNL', 'book@soundmnl.ph', '09211234567', true, 3000),
('Zoom F8n Pro Recorder + Lavs', 'zoom-f8n-pro-recorder-lavs', '8-channel field recorder with timecode plus three wireless lav sets.', 1500, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 2, 'Audio', ARRAY['audio','recorder','lav','wireless','multitrack'], 'Multitrack', 'SoundMNL', 'book@soundmnl.ph', '09211234567', false, NULL),
('Sound Devices MixPre-6 II', 'sound-devices-mixpre-6-ii', 'Pro-grade recorder/mixer with 32-bit float, timecode, and pristine preamps.', 1800, 'https://images.unsplash.com/photo-1541617434114-48c3a51d0ab2?w=900&q=80', 2, 'Audio', ARRAY['audio','recorder','mixer','32bit'], 'Pro recorder', 'SoundMNL', 'book@soundmnl.ph', '09211234567', true, 3000),
('DJI Mic 2 Wireless Kit', 'dji-mic-2-wireless-kit', 'Two-person wireless lav kit with onboard recording and noise cancellation. Run-and-gun ready.', 700, 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80', 5, 'Audio', ARRAY['audio','wireless','lav','dji','add-on'], 'Wireless', 'SoundMNL', 'book@soundmnl.ph', '09211234567', false, NULL),
-- Drones
('DJI Inspire 3 Cinema Drone', 'dji-inspire-3-cinema-drone', 'Full-frame 8K aerial cinema platform with dual operator control. Requires a licensed pilot — add one as operator.', 8000, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 1, 'Drone', ARRAY['drone','aerial','8k','dji','cinema'], 'Pilot required', 'SkyHigh Aerials', 'fly@skyhighaerials.ph', '09181239999', true, 5000),
('DJI Mavic 3 Pro Cine', 'dji-mavic-3-pro-cine', 'Triple-camera Hasselblad aerial system with Apple ProRes for compact pro aerials.', 3500, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 2, 'Drone', ARRAY['drone','aerial','dji','prores'], 'Aerial', 'SkyHigh Aerials', 'fly@skyhighaerials.ph', '09181239999', true, 4000),
('DJI Air 3S', 'dji-air-3s', 'Dual-camera prosumer drone with great range and obstacle sensing — versatile B-roll aerials.', 2000, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 3, 'Drone', ARRAY['drone','aerial','dji','broll'], 'Compact aerial', 'SkyHigh Aerials', 'fly@skyhighaerials.ph', '09181239999', true, 3000),
('DJI Avata 2 FPV Kit', 'dji-avata-2-fpv-kit', 'Cinematic FPV drone with goggles and motion controller for dynamic fly-through shots.', 1800, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 2, 'Drone', ARRAY['drone','fpv','dji','cinematic'], 'FPV', 'SkyHigh Aerials', 'fly@skyhighaerials.ph', '09181239999', true, 3500),
('DJI Mini 4 Pro', 'dji-mini-4-pro', 'Sub-250g drone with 4K HDR and omnidirectional sensing — easy permits, big results.', 1200, 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80', 4, 'Drone', ARRAY['drone','aerial','dji','lightweight'], 'Sub-250g', 'SkyHigh Aerials', 'fly@skyhighaerials.ph', '09181239999', true, 2500),
-- Monitors / wireless video
('SmallHD 17" Production Monitor', 'smallhd-17-production-monitor', 'Bright 17-inch director/client monitor with SDI/HDMI, scopes, and a stand.', 1400, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 2, 'Monitor', ARRAY['monitor','director','sdi','video-village','add-on'], 'Director', 'VideoVillage PH', 'hi@videovillage.ph', '09225557788', false, NULL),
('Atomos Ninja V Recorder/Monitor', 'atomos-ninja-v-recorder-monitor', '5-inch HDR monitor/recorder for ProRes and RAW over HDMI. On-camera reference and capture.', 900, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 4, 'Monitor', ARRAY['monitor','recorder','prores','add-on'], 'ProRes', 'VideoVillage PH', 'hi@videovillage.ph', '09225557788', false, NULL),
('Teradek Bolt 6 LT Wireless Kit', 'teradek-bolt-6-lt-wireless-kit', 'Zero-delay wireless video TX/RX for monitoring on set without cables.', 2000, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 2, 'Monitor', ARRAY['monitor','wireless','teradek','video'], 'Wireless video', 'VideoVillage PH', 'hi@videovillage.ph', '09225557788', false, NULL),
-- Power
('V-Mount Battery Kit (6 + charger)', 'v-mount-battery-kit-6-charger', 'Six high-capacity V-mount batteries with a dual charger and D-tap cables.', 800, 'https://images.unsplash.com/photo-1541617434114-48c3a51d0ab2?w=900&q=80', 5, 'Power', ARRAY['power','battery','vmount','add-on'], 'Power', 'PowerGrid Rentals', 'hi@powergrid.ph', '09221234567', false, NULL),
('EcoFlow Delta 2 Power Station', 'ecoflow-delta-2-power-station', '1kWh portable power station for location shoots — run lights, chargers, and monitors off-grid.', 1200, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80', 3, 'Power', ARRAY['power','station','location','add-on'], 'Location power', 'PowerGrid Rentals', 'hi@powergrid.ph', '09221234567', false, NULL);

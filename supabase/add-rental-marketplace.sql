-- Migration: convert the product store into a rental marketplace.
-- Run this against an existing Supabase project that already has schema.sql applied.
-- (For a fresh project, just run the updated schema.sql instead.)

-- Listings: owner contact + operator add-on + reinterpret price as a daily rate.
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS operator_available BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS operator_day_rate NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_threshold INT DEFAULT 1;

-- Bookings: rental window + downpayment breakdown + owner notification timestamp.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shoot_start_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_days INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS operator_total NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS downpayment_pct NUMERIC(4,3) DEFAULT 0.300;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_notified_at TIMESTAMPTZ;
-- customer_address was NOT NULL in the product store; rentals coordinate handover directly.
ALTER TABLE orders ALTER COLUMN customer_address DROP NOT NULL;

-- Booking line items: duration + operator + owner contact snapshot.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS with_operator BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS operator_day_rate NUMERIC(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS operator_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS owner_phone TEXT;

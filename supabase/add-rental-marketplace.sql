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
ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistics_method TEXT DEFAULT 'self';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistics_fee NUMERIC(10,2) DEFAULT 0;

-- Two-installment platform-collected payment + commission + payouts ledger.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(4,3) DEFAULT 0.150;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_payout NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS damage_deposit NUMERIC(10,2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS orders_balance_session_id_idx ON orders(balance_session_id);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  gear_total NUMERIC(10,2) NOT NULL CHECK (gear_total >= 0),
  commission NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (commission >= 0),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payouts_order_id_idx ON payouts(order_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts(status, created_at DESC);
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
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

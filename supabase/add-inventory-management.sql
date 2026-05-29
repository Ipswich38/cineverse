-- Migration: add inventory management
-- Run this against your Supabase project after the base schema.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_threshold INT DEFAULT 5 CHECK (reorder_threshold >= 0);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN (
    'manual_restock', 'manual_correction', 'damaged', 'lost', 'returned', 'initial_stock'
  )),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_adj_product_id_idx ON inventory_adjustments(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inv_adj_created_at_idx ON inventory_adjustments(created_at DESC);

ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
-- Service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS; no public policy needed.

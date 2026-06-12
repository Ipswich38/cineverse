-- Instant-rent order lifecycle columns on vissionlink_quote_requests (paid
-- orders share the row with quote requests). These columns existed only in the
-- live DB until 2026-06-11; captured here from production so the repo can
-- rebuild the full table. Safe to re-run.

alter table public.vissionlink_quote_requests
  -- Fulfilment after a paid PayMongo checkout (lib/rental-finalize.ts).
  add column if not exists fulfillment_status text, -- pending_payment | processing | paid | shipped | arrived | left_premises | returned | settled | cancelled
  add column if not exists payment_ref text,
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists arrived_at timestamptz,        -- gear delivered to the renter's premises
  add column if not exists left_premises_at timestamptz,  -- gear picked up from the renter, heading back
  add column if not exists returned_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists security_deposit numeric,
  add column if not exists delivery_address text,
  add column if not exists balance_method text, -- full | pdc
  add column if not exists order_no text,
  add column if not exists client_ip text,
  add column if not exists client_location text,
  add column if not exists payment_method text,
  add column if not exists amount_paid numeric,
  -- Customer cancellation requests + admin decision (app/api/order/[id]/cancel-request).
  add column if not exists cancel_status text, -- requested | approved | declined
  add column if not exists cancel_reason_category text,
  add column if not exists cancel_reason text,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_admin_note text,
  -- Refund + credit memo (lib/credit-memo.ts).
  add column if not exists refund_amount numeric,
  add column if not exists refund_method text,
  add column if not exists refund_ref text,
  add column if not exists refunded_at timestamptz,
  add column if not exists credit_memo_no text,
  add column if not exists credit_memo_pdf_path text,
  -- Cineforce crew hire vs liability waiver chosen at checkout (lib/cineforce-crew.ts).
  add column if not exists crew_mode text, -- crew | waiver
  add column if not exists waiver_signed_name text,
  add column if not exists waiver_pdf_path text;

-- Accounting expense ledger. Revenue is derived from invoice payments; this
-- table holds the manual expense side for the P&L.
create table if not exists public.vissionlink_expenses (
  id text primary key,
  date date not null,
  category text not null default 'general', -- gear, transport, crew, maintenance, ops, tax, other
  description text,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Equipment monitoring: one row per trackable physical unit. QR encodes a link
-- to the unit; status + last-known location feed the monitoring board and the
-- inventory availability counts. GPS lat/lng are last-known (manual check-in for
-- now; hardware tags update them later).
create table if not exists public.vissionlink_units (
  id text primary key,
  name text not null, -- equipment type/name (e.g. "RED KOMODO 6K body")
  category text,
  serial text,
  status text not null default 'available', -- available | rented | maintenance | retired
  location_label text,
  lat double precision,
  lng double precision,
  last_seen timestamptz,
  assigned_request_id text, -- rental this unit is checked out to
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

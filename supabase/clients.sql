-- Client ledger for loyalty + delinquency control. One row per client (by email),
-- accumulated across rentals. Drives deposit size, PDC eligibility, and loyalty
-- discount. Standing is the manual/auto risk flag; the counters feed the tier.
create table if not exists public.vissionlink_clients (
  email text primary key,
  name text,
  company text,
  phone text,
  standing text not null default 'good', -- good | watch | blocked
  clean_paid_count integer not null default 0, -- on-time, good-return rentals (drives tier)
  total_spent numeric not null default 0,
  bounced_count integer not null default 0, -- bounced PDCs (auto-demotes to watch)
  late_count integer not null default 0, -- late settlements
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Incident ledger lives on the rental row; payments + deposit live in the
-- invoice JSON. No extra request columns needed beyond what the invoice carries.

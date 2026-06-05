-- VissionLink custom package / bundle quote requests. Customers build a bundle on
-- /packages and submit it; the admin reviews and responds with custom bundle pricing.
-- Lives in the shared project's public schema with the vissionlink_ prefix.

create table if not exists public.vissionlink_quote_requests (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  company text default '',
  email text not null,
  phone text default '',
  project text default '',
  date_from date,
  date_to date,
  notes text default '',
  items jsonb not null default '[]'::jsonb,  -- [{id,slug,name,qty,days,ratePerDay}]
  est_total numeric default 0,               -- indicative sum of day-rates (not the quote)
  status text not null default 'pending'     -- pending | responded | closed
);

-- Submissions come through the service-role admin route; no public RLS policies.
alter table public.vissionlink_quote_requests enable row level security;

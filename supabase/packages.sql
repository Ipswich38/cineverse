-- Curated package offers shown on /packages. This table existed only in the
-- live DB until 2026-06-11; DDL below was introspected from production so the
-- repo can rebuild it. Reads/writes go through the service-role key only
-- (see lib/packages-data.ts, app/api/admin/packages); RLS deny-all for anon.

create table if not exists public.vissionlink_packages (
  id text primary key,
  slug text unique not null,
  name text not null,
  eyebrow text,
  price_range text,
  price_per_day numeric default 0,
  description text,
  inclusions jsonb default '[]'::jsonb,
  details jsonb default '[]'::jsonb,
  best_for text,
  review_notes jsonb default '[]'::jsonb,
  related_item_slugs jsonb default '[]'::jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vissionlink_packages enable row level security;

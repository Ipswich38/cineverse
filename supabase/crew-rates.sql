-- Live per-position crew day-rates for checkout (lib/crew-rates.ts).
--
-- VissionLink bills crew at a FLAT rate per position, separate from what a
-- freelancer charges when hired directly on Cineforce. Until Cineforce listings
-- go live this table stays EMPTY and the recommended rates bundled in
-- lib/cineforce-crew.ts apply; once positions are filled there, Cineforce's
-- sync upserts a row per position_key and checkout switches to the live rate
-- automatically. Safe to re-run.

create table if not exists public.vissionlink_crew_rates (
  position_key text primary key, -- key from lib/cineforce-crew.ts CREW_POSITIONS
  daily_rate numeric not null check (daily_rate > 0),
  source text default 'cineforce',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Service-role access only (the public /api/crew-rates feed reads via the
-- server); no anon policies.
alter table public.vissionlink_crew_rates enable row level security;

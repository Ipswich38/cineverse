-- Row Level Security across ALL vissionlink_ tables. Safe to re-run (idempotent).
-- Verified against the live DB 2026-06-11: every table below already has RLS ON.
-- This file exists so the repo can rebuild that state from scratch.
--
-- Access model: the app server uses the service-role key (bypasses RLS).
-- The public anon key gets exactly ONE read surface: active equipment listings.
-- Everything else (client PII, orders, expenses, units, packages) has RLS
-- enabled with ZERO policies = deny-all for anon/authenticated roles.

alter table public.vissionlink_equipment      enable row level security;
alter table public.vissionlink_quote_requests enable row level security;
alter table public.vissionlink_clients        enable row level security;
alter table public.vissionlink_expenses       enable row level security;
alter table public.vissionlink_units          enable row level security;
alter table public.vissionlink_packages       enable row level security;

-- The one public policy: storefront may read active listings (also defined in
-- vissionlink.sql; repeated here so this file alone restores the full posture).
drop policy if exists "vissionlink public read active" on public.vissionlink_equipment;
create policy "vissionlink public read active"
  on public.vissionlink_equipment
  for select
  using (is_active = true);

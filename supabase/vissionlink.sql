-- VissionLink gear catalog — run once in the Supabase SQL editor.
-- Lives in the shared project's `public` schema with a vissionlink_ prefix so it
-- does not touch the existing `cineverse` schema used by the other app.

create table if not exists public.vissionlink_equipment (
  id text primary key,
  slug text unique not null,
  name text not null,
  category text not null,
  description text default '',
  owner text default '',
  location text default '',
  rate_per_day numeric not null default 0,
  security_deposit numeric not null default 0,
  stock integer not null default 1,
  featured boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  unavailable jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: the public may read active listings; writes go through the
-- service-role key (which bypasses RLS) used only by server-side admin routes.
alter table public.vissionlink_equipment enable row level security;

drop policy if exists "vissionlink public read active" on public.vissionlink_equipment;
create policy "vissionlink public read active"
  on public.vissionlink_equipment
  for select
  using (is_active = true);

-- Seed with the current demo catalog (safe to re-run).
insert into public.vissionlink_equipment
  (id, slug, name, category, description, owner, location, rate_per_day, security_deposit, stock, featured, images, specs, tags, unavailable)
values
  ('eq-cam-1','arri-alexa-mini-lf-kit','ARRI Alexa Mini LF Kit','Camera',
   'Cinema camera package for commercials, TV drama, and premium branded content.','Vissionlink Rentals','Makati',
   18500,12000,2,true,
   '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["6K Open Gate","LPL Mount","ProRes / ARRIRAW","On-set support available"]'::jsonb,
   '["featured","cinema camera","broadcast"]'::jsonb,
   '[{"from":"2026-06-05","to":"2026-06-12"}]'::jsonb),

  ('eq-lens-1','canon-cinema-zooms-set','Canon Cinema Zooms Set','Lenses',
   'Three-lens rental set with fast cine zooms for documentary and run-and-gun production.','J. Santos','Quezon City',
   8200,5000,1,true,
   '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["18-80mm","70-200mm","PL / EF options","Case included"]'::jsonb,
   '["lens","optics"]'::jsonb,
   '[{"from":"2026-06-10","to":"2026-06-15"}]'::jsonb),

  ('eq-light-1','aputure-lighting-rig','Aputure Lighting Rig','Lighting',
   'Flexible LED package for interviews, narrative scenes, and small sets.','M. Reyes','Pasig',
   5400,3500,4,true,
   '["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["2x COB lights","Softboxes","Light stands","DMX ready"]'::jsonb,
   '["light","led"]'::jsonb,
   '[]'::jsonb),

  ('eq-sound-1','sound-devices-field-kit','Sound Devices Field Kit','Sound',
   'Location sound kit for production dialogue capture and field recording.','A. Diaz','Taguig',
   6200,4000,3,false,
   '["https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["Mixer-recorder","Wireless lavs","Boom kit","Headphones"]'::jsonb,
   '["sound","location"]'::jsonb,
   '[{"from":"2026-06-20","to":"2026-06-25"}]'::jsonb),

  ('eq-grip-1','grip-and-stand-package','Grip & Stand Package','Grip',
   'All-purpose grip package for small to medium production setups.','Vissionlink Rentals','Mandaluyong',
   4200,2500,6,false,
   '["https://images.unsplash.com/photo-1492691527719-9bce0f3b5ad4?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["C-stands","Apple boxes","Sandbags","Flags"]'::jsonb,
   '["grip","support"]'::jsonb,
   '[]'::jsonb),

  ('eq-post-1','dailies-and-storage-workstation','Dailies & Storage Workstation','Post',
   'On-set ingest, backups, and review station for production teams.','N. Torres','Makati',
   3500,2000,2,false,
   '["https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
   '["SSD backup","Reader kits","Monitor","Checksum workflow"]'::jsonb,
   '["post","dailies"]'::jsonb,
   '[]'::jsonb)
on conflict (id) do nothing;

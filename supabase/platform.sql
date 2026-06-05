-- ============================================================================
-- VissionLink PLATFORM — the shared identity trunk.
-- ONE account across every app. Lives in its own `vissionlink` schema alongside
-- the per-app schemas: public=CineForce, cineverse=store, agri=BigAni, rideshare=Lakbay.
-- All apps already share auth.users (one Supabase project), so this just gives that
-- shared user a real profile + a record of which apps (roots) they've joined.
-- Idempotent — safe to re-run. Apply with: sb.sh sql vissionlink/supabase/platform.sql
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS vissionlink;
GRANT USAGE ON SCHEMA vissionlink TO anon, authenticated, service_role;

-- ── One profile per human (id = auth.users.id) ───────────────────────────────
CREATE TABLE IF NOT EXISTS vissionlink.profiles (
  id UUID PRIMARY KEY,                       -- = auth.users.id (shared project auth)
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  home_city TEXT,
  verified_local BOOLEAN DEFAULT false,      -- reusable "VissionLink verified-local" (barangay-cert) credential
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── The apps (the roots) registry ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vissionlink.apps (
  key TEXT PRIMARY KEY,                       -- 'cineforce' | 'cineverse' | 'lakbay' | 'bigani'
  name TEXT NOT NULL,
  domain TEXT,
  accent TEXT,                                -- brand accent hex
  schema_name TEXT                            -- the app's data schema
);
INSERT INTO vissionlink.apps (key, name, domain, accent, schema_name) VALUES
  ('cineforce','CineForce','cineforce.vissionlink.com','#f59e0b','public'),
  ('cineverse','CineVerse','vissionlink.com','#0ea5e9','cineverse'),
  ('lakbay','Lakbay','lakbay.vissionlink.com','#7c3aed','rideshare'),
  ('bigani','BigAni','bigani.vissionlink.com','#c2410c','agri')
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, domain = EXCLUDED.domain, accent = EXCLUDED.accent, schema_name = EXCLUDED.schema_name;

-- ── Which apps a profile has joined + their role(s) in each ──────────────────
CREATE TABLE IF NOT EXISTS vissionlink.app_memberships (
  profile_id UUID NOT NULL REFERENCES vissionlink.profiles(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL REFERENCES vissionlink.apps(key),
  roles TEXT[] NOT NULL DEFAULT '{}',         -- e.g. {'rider','driver'} for lakbay
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (profile_id, app_key)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE vissionlink.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vissionlink.app_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vissionlink.apps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self ON vissionlink.profiles;
CREATE POLICY profiles_self ON vissionlink.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS memberships_self ON vissionlink.app_memberships;
CREATE POLICY memberships_self ON vissionlink.app_memberships FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS apps_read ON vissionlink.apps;
CREATE POLICY apps_read ON vissionlink.apps FOR SELECT USING (true);  -- registry is non-sensitive
-- Cross-app reads of other users' profiles go through the service role (each app's server), not RLS.

GRANT ALL ON ALL TABLES IN SCHEMA vissionlink TO authenticated, service_role;
GRANT SELECT ON vissionlink.apps TO anon;

-- ── Auto-provision a profile on signup (any app), and keep email in sync ─────
-- Exception-guarded: a failure here must NEVER block auth signup across the apps.
CREATE OR REPLACE FUNCTION vissionlink.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO vissionlink.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- never break signup
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_vissionlink ON auth.users;
CREATE TRIGGER on_auth_user_created_vissionlink
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION vissionlink.handle_new_user();

-- ── Backfill profiles for everyone who already signed up (any app) ───────────
INSERT INTO vissionlink.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── Expose `vissionlink` via PostgREST — HARDENED dynamic build (only schemas
-- that EXIST), so this can never drop a sibling schema and stall the shared API. ─
DO $$
DECLARE schemas text;
BEGIN
  SELECT string_agg(s, ', ' ORDER BY ord) INTO schemas
  FROM (VALUES ('public',1),('graphql_public',2),('cineverse',3),('agri',4),('rideshare',5),('vissionlink',6)) AS wanted(s,ord)
  WHERE s IN ('public','graphql_public') OR s IN (SELECT nspname FROM pg_namespace);
  EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', schemas);
END $$;
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

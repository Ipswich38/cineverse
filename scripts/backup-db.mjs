// Dumps every vissionlink_* table to backups/<UTC timestamp>/<table>.json.
// Usage: npm run backup   (reads .env.local via node --env-file)
// backups/ is gitignored — these files contain client PII and must never be
// committed or uploaded anywhere public. Fails loudly: any table error exits 1.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run via `npm run backup`.");
  process.exit(1);
}

const TABLES = [
  "vissionlink_equipment",
  "vissionlink_quote_requests",
  "vissionlink_clients",
  "vissionlink_expenses",
  "vissionlink_units",
  "vissionlink_packages",
];
const PAGE = 1000;

const db = createClient(url, key, { auth: { persistSession: false } });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const dir = join("backups", stamp);
mkdirSync(dir, { recursive: true });

let failed = false;
for (const table of TABLES) {
  const rows = [];
  for (let fromIdx = 0; ; fromIdx += PAGE) {
    const { data, error } = await db.from(table).select("*").range(fromIdx, fromIdx + PAGE - 1);
    if (error) {
      console.error(`FAILED ${table}: ${error.message}`);
      failed = true;
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  if (!failed || rows.length) {
    writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 1));
    console.log(`${table}: ${rows.length} rows`);
  }
}

if (failed) process.exit(1);
console.log(`Backup written to ${dir}/`);

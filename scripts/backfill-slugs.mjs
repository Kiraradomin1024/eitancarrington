/**
 * Backfill slugs for existing rows that have slug = null.
 *
 * Tables handled:
 *   - npcs          → slug from name
 *   - days          → slug from day_number ("jour-N") or title
 *   - investigations → slug from title
 *
 * Usage:  node scripts/backfill-slugs.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *           in .env.local at the project root.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load env ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envText = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)/);
  if (m) env[m[1]] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing SUPABASE_URL or ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Slugify (same logic as src/lib/utils.ts) ──────────────────────────
function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Unique slug (same logic as src/lib/slug.ts) ───────────────────────
async function uniqueSlug(table, base, fallback = "item", excludeId) {
  let baseSlug = slugify(base);
  if (!baseSlug) baseSlug = fallback;

  let candidate = baseSlug;
  let i = 1;
  while (true) {
    let q = supabase.from(table).select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    i += 1;
    candidate = `${baseSlug}-${i}`;
    if (i > 1000) return `${baseSlug}-${Date.now()}`;
  }
}

// ── Backfill one table ────────────────────────────────────────────────
async function backfillTable(table, labelFn, fallback) {
  const { data: rows, error } = await supabase
    .from(table)
    .select("*")
    .is("slug", null);

  if (error) {
    console.error(`❌  Error fetching ${table}:`, error.message);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(`✅  ${table}: aucun slug manquant`);
    return;
  }

  console.log(`🔧  ${table}: ${rows.length} slug(s) à générer…`);

  for (const row of rows) {
    const base = labelFn(row);
    const slug = await uniqueSlug(table, base, fallback);
    const { error: upErr } = await supabase
      .from(table)
      .update({ slug })
      .eq("id", row.id);

    if (upErr) {
      console.error(`   ❌  ${row.id} → erreur: ${upErr.message}`);
    } else {
      console.log(`   ✓  ${base} → /${slug}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────
console.log("🚀  Backfill des slugs manquants…\n");

await backfillTable(
  "npcs",
  (row) => row.name,
  "perso"
);

await backfillTable(
  "days",
  (row) => {
    if (row.day_number !== null) return `jour-${row.day_number}`;
    if (row.title) return row.title;
    return row.date;
  },
  "jour"
);

await backfillTable(
  "investigations",
  (row) => row.title,
  "enquete"
);

console.log("\n✅  Terminé !");

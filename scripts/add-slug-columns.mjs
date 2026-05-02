/**
 * Add a `slug` column (text, nullable, unique) to npcs, days, and investigations.
 *
 * Usage:  node scripts/add-slug-columns.mjs
 *
 * This uses supabase.rpc() to run raw SQL via a one-off Postgres function.
 * If your anon key doesn't have DDL rights, run the SQL below directly in the
 * Supabase SQL Editor instead:
 *
 *   ALTER TABLE npcs           ADD COLUMN IF NOT EXISTS slug text UNIQUE;
 *   ALTER TABLE days           ADD COLUMN IF NOT EXISTS slug text UNIQUE;
 *   ALTER TABLE investigations ADD COLUMN IF NOT EXISTS slug text UNIQUE;
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const SQL = `
  ALTER TABLE npcs           ADD COLUMN IF NOT EXISTS slug text UNIQUE;
  ALTER TABLE days           ADD COLUMN IF NOT EXISTS slug text UNIQUE;
  ALTER TABLE investigations ADD COLUMN IF NOT EXISTS slug text UNIQUE;
`;

console.log("🔧  Ajout des colonnes slug…\n");
console.log("SQL à exécuter :");
console.log(SQL);
console.log("\n⚠️  L'anon key n'a probablement pas les droits DDL.");
console.log("   → Copie le SQL ci-dessus et colle-le dans le SQL Editor de Supabase :");
console.log("   https://supabase.com/dashboard/project/jlkqdajlalzyrupleums/sql/new\n");

// Try anyway via rpc (will likely fail with anon key)
const { error } = await supabase.rpc("exec_sql", { query: SQL });
if (error) {
  console.log("❌  Exécution automatique échouée (attendu avec anon key).");
  console.log("   → Utilise le SQL Editor de Supabase pour exécuter le SQL ci-dessus.\n");
} else {
  console.log("✅  Colonnes ajoutées avec succès !");
}

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: npcs } = await supabase.from("npcs").select("id, name, slug").order("name");
console.log("=== NPCs ===");
for (const n of npcs ?? []) {
  console.log(`  ${n.name}: slug=${n.slug ?? "❌ NULL"}`);
}

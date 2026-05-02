import { slugify } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns "id" if the value is a UUID, otherwise "slug".
 * Used to choose the right column when looking up rows by URL.
 */
export function slugOrIdColumn(value: string): "id" | "slug" {
  return UUID_RE.test(value) ? "id" : "slug";
}

/**
 * Generate a unique slug for a given table by checking the database.
 * Appends -2, -3, … on collision.
 *
 * @param supabase  Server-side Supabase client
 * @param table     Table to check ("npcs", "days", "investigations")
 * @param base      Raw text to slugify (name, title, etc.)
 * @param fallback  Fallback word if slugify produces empty string
 * @param excludeId Optional UUID to exclude (for updates: don't conflict with self)
 */
export async function uniqueSlug(
  supabase: SupabaseClient,
  table: "npcs" | "days" | "investigations",
  base: string,
  fallback = "item",
  excludeId?: string
): Promise<string> {
  let baseSlug = slugify(base);
  if (!baseSlug) baseSlug = fallback;

  let candidate = baseSlug;
  let i = 1;
  // Loop until we find an unused slug
  // (Bounded by total rows in table — practically a few iterations max)
  while (true) {
    let q = supabase.from(table).select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    i += 1;
    candidate = `${baseSlug}-${i}`;
    if (i > 1000) return `${baseSlug}-${Date.now()}`; // safety net
  }
}

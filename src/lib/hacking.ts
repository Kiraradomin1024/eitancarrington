import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Only Kirara (the site owner) may toggle the SC292 hacking mode.
 * Identified by admin role + display name. Override the expected name
 * with the KIRARA_NAME env var if needed.
 */
export function isKirara(
  role: string | null,
  displayName: string | null
): boolean {
  const expected = (process.env.KIRARA_NAME ?? "Kirara").toLowerCase();
  return (
    role === "admin" &&
    (displayName ?? "").trim().toLowerCase() === expected
  );
}

/** Reads the shared SC292 hacking flag (deduped per request). */
export const getHackingMode = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("site_settings")
    .select("hacking_mode")
    .eq("id", 1)
    .maybeSingle();
  return Boolean(data?.hacking_mode);
});

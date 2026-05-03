"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const KIRARA_UID = "ced3f4f5-39c2-468a-a405-39d6785b8e96";

async function ensureAdmin() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (data?.role !== "admin") throw new Error("Accès refusé");
  return supabase;
}

export async function setRole(userId: string, role: string) {
  const supabase = await ensureAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

function cleanTwitch(raw: FormDataEntryValue | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "");
  s = s.replace(/^[@/]+/, "");
  s = s.replace(/[/?#].*$/, "");
  s = s.replace(/[^a-zA-Z0-9_]/g, "");
  return s || null;
}

export async function updateCharacter(formData: FormData) {
  const supabase = await ensureAdmin();
  const traitsRaw = (formData.get("traits") as string) || "";
  const traits = traitsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    age: formData.get("age") ? Number(formData.get("age")) : null,
    bio: (formData.get("bio") as string) || null,
    background: (formData.get("background") as string) || null,
    photo_url: (formData.get("photo_url") as string) || null,
    traits,
    twitch_username: cleanTwitch(formData.get("twitch_username")),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("character")
    .update(payload)
    .eq("is_main", true);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/wiki/eitan");
  redirect("/wiki/eitan");
}

/**
 * Full database backup — only callable by Kirara.
 * Returns a JSON snapshot of all content tables (no auth/storage).
 */
export async function exportFullBackup(): Promise<{
  filename: string;
  json: string;
}> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== KIRARA_UID) {
    throw new Error("Accès refusé");
  }

  const tables = [
    "profiles",
    "character",
    "npcs",
    "relations",
    "days",
    "day_npcs",
    "investigations",
    "investigation_clues",
    "investigation_npcs",
    "issues",
    "mindmap_layouts",
  ] as const;

  const snapshot: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    exported_by: user.id,
  };

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      throw new Error(`Erreur sur table ${t} : ${error.message}`);
    }
    snapshot[t] = data ?? [];
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    filename: `eitan-backup-${stamp}.json`,
    json: JSON.stringify(snapshot, null, 2),
  };
}

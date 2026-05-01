"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function tagsFromString(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Normalize a Twitch username: strip @, URL prefix, whitespace. Empty → null. */
function cleanTwitch(raw: FormDataEntryValue | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Remove URL prefixes
  s = s.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "");
  // Remove leading @ or /
  s = s.replace(/^[@/]+/, "");
  // Strip trailing slash / query
  s = s.replace(/[/?#].*$/, "");
  // Twitch usernames are alphanumeric + underscore, 4–25 chars; keep only valid chars
  s = s.replace(/[^a-zA-Z0-9_]/g, "");
  return s || null;
}

export async function createNpc(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    age: formData.get("age") ? Number(formData.get("age")) : null,
    family: (formData.get("family") as string) || null,
    neighborhood: (formData.get("neighborhood") as string) || null,
    occupation: (formData.get("occupation") as string) || null,
    status: (formData.get("status") as string) || "alive",
    photo_url: (formData.get("photo_url") as string) || null,
    tags: tagsFromString(formData.get("tags") as string),
    twitch_username: cleanTwitch(formData.get("twitch_username")),
    created_by: user.id,
  };

  if (!payload.name) throw new Error("Nom requis");

  const { data, error } = await supabase
    .from("npcs")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/wiki");
  redirect(`/wiki/${data.id}`);
}

export async function updateNpc(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    age: formData.get("age") ? Number(formData.get("age")) : null,
    family: (formData.get("family") as string) || null,
    neighborhood: (formData.get("neighborhood") as string) || null,
    occupation: (formData.get("occupation") as string) || null,
    status: (formData.get("status") as string) || "alive",
    photo_url: (formData.get("photo_url") as string) || null,
    tags: tagsFromString(formData.get("tags") as string),
    twitch_username: cleanTwitch(formData.get("twitch_username")),
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Nom requis");

  const { error } = await supabase.from("npcs").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/wiki");
  revalidatePath(`/wiki/${id}`);
  redirect(`/wiki/${id}`);
}

export async function deleteNpc(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("npcs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wiki");
  redirect("/wiki");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";
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
    phone_number:
      ((formData.get("phone_number") as string) || "").trim() || null,
    created_by: user.id,
  };

  if (!payload.name) throw new Error("Nom requis");

  const slug = await uniqueSlug(supabase, "npcs", payload.name, "perso");

  const { data, error } = await supabase
    .from("npcs")
    .insert({ ...payload, slug })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);

  // Collect relation selections (relation_<targetId>=<type>)
  const relRows: {
    source_npc_id: string;
    target_npc_id: string;
    type: string;
    intensity: number;
    description: null;
    created_by: string;
  }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("relation_")) continue;
    const type = String(value || "").trim();
    if (!type) continue;
    const targetId = key.slice("relation_".length);
    if (!targetId || targetId === data.id) continue;
    relRows.push({
      source_npc_id: data.id,
      target_npc_id: targetId,
      type,
      intensity: 0,
      description: null,
      created_by: user.id,
    });
  }
  if (relRows.length > 0) {
    await supabase.from("relations").insert(relRows);
    revalidatePath("/relations");
    revalidatePath("/mindmap");
  }

  revalidatePath("/wiki");
  redirect(`/wiki/${data.slug ?? data.id}`);
}

export async function updateNpc(id: string, formData: FormData) {
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
    phone_number:
      ((formData.get("phone_number") as string) || "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Nom requis");

  // If the name changed, regenerate the slug
  const { data: current } = await supabase
    .from("npcs")
    .select("name, slug")
    .eq("id", id)
    .maybeSingle();
  const finalPayload: typeof payload & { slug?: string } = { ...payload };
  if (!current?.slug || current.name !== payload.name) {
    finalPayload.slug = await uniqueSlug(
      supabase,
      "npcs",
      payload.name,
      "perso",
      id
    );
  }

  const { data, error } = await supabase
    .from("npcs")
    .update(finalPayload)
    .eq("id", id)
    .select("slug")
    .single();
  if (error) throw new Error(error.message);

  // Sync relations where this NPC is the source.
  // The form only encodes selections for "simple" outgoing relations
  // (relation_<targetId>=<type>). We delete existing source=id relations
  // and re-insert from the form selections.
  const desired = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("relation_")) continue;
    const type = String(value || "").trim();
    if (!type) continue;
    const targetId = key.slice("relation_".length);
    if (!targetId || targetId === id) continue;
    desired.set(targetId, type);
  }
  // Only sync if the form actually contained relation_ keys (avoid wiping
  // relations when an older form without this section is submitted).
  const formHasRelationFields = Array.from(formData.keys()).some((k) =>
    k.startsWith("relation_")
  );
  if (formHasRelationFields) {
    // Delete all relations involving this NPC in either direction,
    // then re-insert with this NPC as source — keeps the form authoritative
    // for this perso's links.
    await supabase
      .from("relations")
      .delete()
      .or(`source_npc_id.eq.${id},target_npc_id.eq.${id}`);
    if (desired.size > 0) {
      const rows = Array.from(desired.entries()).map(([targetId, type]) => ({
        source_npc_id: id,
        target_npc_id: targetId,
        type,
        intensity: 0,
        description: null,
        created_by: user.id,
      }));
      await supabase.from("relations").insert(rows);
    }
    revalidatePath("/relations");
    revalidatePath("/mindmap");
  }

  const target = data.slug ?? id;
  revalidatePath("/wiki");
  revalidatePath(`/wiki/${target}`);
  redirect(`/wiki/${target}`);
}

export async function deleteNpc(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("npcs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wiki");
  redirect("/wiki");
}

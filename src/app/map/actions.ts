"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type MarkerInput = {
  label: string;
  description: string | null;
  category: string;
  x: number;
  y: number;
  investigation_id: string | null;
};
type PersonRow = { npc_id: string | null; character_id: string | null };

function parseInput(formData: FormData): {
  base: MarkerInput;
  people: PersonRow[];
} {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Nom requis");
  const category = String(formData.get("category") ?? "other");
  const x = Number(formData.get("x"));
  const y = Number(formData.get("y"));
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("Coordonnées invalides");
  }
  const description = (formData.get("description") as string)?.trim() || null;
  const investigation_id =
    (formData.get("investigation_id") as string) || null;

  // Multiple "person" entries, each "npc:<uuid>" or "char:<uuid>".
  const rawPeople = formData.getAll("person").map((v) => String(v));
  const seen = new Set<string>();
  const people: PersonRow[] = [];
  for (const raw of rawPeople) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    if (raw.startsWith("npc:")) {
      const id = raw.slice(4);
      if (id) people.push({ npc_id: id, character_id: null });
    } else if (raw.startsWith("char:")) {
      const id = raw.slice(5);
      if (id) people.push({ npc_id: null, character_id: id });
    }
  }

  return {
    base: {
      label,
      description,
      category,
      x,
      y,
      investigation_id: investigation_id || null,
    },
    people,
  };
}

async function syncPeople(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  markerId: string,
  people: PersonRow[]
) {
  const { error: delErr } = await supabase
    .from("map_marker_people")
    .delete()
    .eq("marker_id", markerId);
  if (delErr) throw new Error(delErr.message);
  if (people.length === 0) return;
  const { error: insErr } = await supabase
    .from("map_marker_people")
    .insert(people.map((p) => ({ marker_id: markerId, ...p })));
  if (insErr) throw new Error(insErr.message);
}

export async function createMapMarker(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { base, people } = parseInput(formData);
  const { data, error } = await supabase
    .from("map_markers")
    .insert({ ...base, created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncPeople(supabase, data.id, people);
  revalidatePath("/map");
}

export async function updateMapMarker(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { base, people } = parseInput(formData);
  const { error } = await supabase
    .from("map_markers")
    .update({ ...base, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await syncPeople(supabase, id, people);
  revalidatePath("/map");
}

export async function deleteMapMarker(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("map_markers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/map");
}

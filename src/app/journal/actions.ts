"use server";

import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function buildDaySlugBase(
  dayNumber: number | null,
  title: string,
  date: string
): string {
  if (dayNumber !== null) return `jour-${dayNumber}`;
  if (title) return title;
  return date;
}

export async function createDay(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const npcIds = formData.getAll("npc_ids").map(String).filter(Boolean);

  const rawDayNumber = formData.get("day_number");
  const dayNumber = rawDayNumber ? parseInt(String(rawDayNumber), 10) : null;

  const payload = {
    date: String(formData.get("date") ?? ""),
    day_number: dayNumber && !isNaN(dayNumber) ? dayNumber : null,
    title: String(formData.get("title") ?? "").trim(),
    summary: (formData.get("summary") as string) || null,
    content: (formData.get("content") as string) || null,
    created_by: user.id,
  };
  if (!payload.date || !payload.title)
    throw new Error("Date et titre requis");

  const slug = await uniqueSlug(
    supabase,
    "days",
    buildDaySlugBase(payload.day_number, payload.title, payload.date),
    "jour"
  );

  const { data, error } = await supabase
    .from("days")
    .insert({ ...payload, slug })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);

  if (npcIds.length > 0) {
    await supabase
      .from("day_npcs")
      .insert(npcIds.map((npc_id) => ({ day_id: data.id, npc_id })));
  }

  revalidatePath("/journal");
  redirect(`/journal/${data.slug ?? data.id}`);
}

export async function updateDay(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const npcIds = formData.getAll("npc_ids").map(String).filter(Boolean);

  const rawDayNumber = formData.get("day_number");
  const dayNumber = rawDayNumber ? parseInt(String(rawDayNumber), 10) : null;

  const payload = {
    date: String(formData.get("date") ?? ""),
    day_number: dayNumber && !isNaN(dayNumber) ? dayNumber : null,
    title: String(formData.get("title") ?? "").trim(),
    summary: (formData.get("summary") as string) || null,
    content: (formData.get("content") as string) || null,
    updated_at: new Date().toISOString(),
  };
  // If title or day_number changed, regenerate the slug
  const { data: current } = await supabase
    .from("days")
    .select("title, day_number, slug")
    .eq("id", id)
    .maybeSingle();
  const finalPayload: typeof payload & { slug?: string } = { ...payload };
  if (
    !current?.slug ||
    current.title !== payload.title ||
    current.day_number !== payload.day_number
  ) {
    finalPayload.slug = await uniqueSlug(
      supabase,
      "days",
      buildDaySlugBase(payload.day_number, payload.title, payload.date),
      "jour",
      id
    );
  }

  const { data, error } = await supabase
    .from("days")
    .update(finalPayload)
    .eq("id", id)
    .select("slug")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("day_npcs").delete().eq("day_id", id);
  if (npcIds.length > 0) {
    await supabase
      .from("day_npcs")
      .insert(npcIds.map((npc_id) => ({ day_id: id, npc_id })));
  }

  const target = data.slug ?? id;
  revalidatePath("/journal");
  revalidatePath(`/journal/${target}`);
  redirect(`/journal/${target}`);
}

export async function deleteDay(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("days").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
  redirect("/journal");
}

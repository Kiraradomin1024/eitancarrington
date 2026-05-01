"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createDay(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const npcIds = formData.getAll("npc_ids").map(String).filter(Boolean);

  const payload = {
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    summary: (formData.get("summary") as string) || null,
    content: (formData.get("content") as string) || null,
    created_by: user.id,
  };
  if (!payload.date || !payload.title)
    throw new Error("Date et titre requis");

  const { data, error } = await supabase
    .from("days")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (npcIds.length > 0) {
    await supabase
      .from("day_npcs")
      .insert(npcIds.map((npc_id) => ({ day_id: data.id, npc_id })));
  }

  revalidatePath("/journal");
  redirect(`/journal/${data.id}`);
}

export async function updateDay(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const npcIds = formData.getAll("npc_ids").map(String).filter(Boolean);

  const payload = {
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    summary: (formData.get("summary") as string) || null,
    content: (formData.get("content") as string) || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("days").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("day_npcs").delete().eq("day_id", id);
  if (npcIds.length > 0) {
    await supabase
      .from("day_npcs")
      .insert(npcIds.map((npc_id) => ({ day_id: id, npc_id })));
  }

  revalidatePath("/journal");
  revalidatePath(`/journal/${id}`);
  redirect(`/journal/${id}`);
}

export async function deleteDay(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("days").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
  redirect("/journal");
}

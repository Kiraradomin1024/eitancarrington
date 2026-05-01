"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createInvestigation(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as string) || "open",
    created_by: user.id,
  };
  if (!payload.title) throw new Error("Titre requis");

  const { data, error } = await supabase
    .from("investigations")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/enquetes");
  redirect(`/enquetes/${data.id}`);
}

export async function updateInvestigation(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as string) || "open",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("investigations")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/enquetes");
  revalidatePath(`/enquetes/${id}`);
  redirect(`/enquetes/${id}`);
}

export async function deleteInvestigation(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("investigations")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/enquetes");
  redirect("/enquetes");
}

export async function addClue(investigationId: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("Contenu requis");
  const image_url = (formData.get("image_url") as string) || null;
  const { error } = await supabase.from("investigation_clues").insert({
    investigation_id: investigationId,
    content,
    image_url,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/enquetes/${investigationId}`);
}

export async function deleteClue(id: string, investigationId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("investigation_clues")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/enquetes/${investigationId}`);
}

export async function linkNpc(
  investigationId: string,
  formData: FormData
) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const npc_id = String(formData.get("npc_id") ?? "");
  const role = String(formData.get("role") ?? "suspect");
  if (!npc_id) throw new Error("Personnage requis");
  const { error } = await supabase.from("investigation_npcs").upsert({
    investigation_id: investigationId,
    npc_id,
    role,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/enquetes/${investigationId}`);
}

export async function unlinkNpc(
  investigationId: string,
  npcId: string
) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("investigation_npcs")
    .delete()
    .eq("investigation_id", investigationId)
    .eq("npc_id", npcId);
  if (error) throw new Error(error.message);
  revalidatePath(`/enquetes/${investigationId}`);
}

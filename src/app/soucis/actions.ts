"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createIssue(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as string) || "active",
    severity: (formData.get("severity") as string) || "medium",
    created_by: user.id,
  };
  if (!payload.title) throw new Error("Titre requis");
  const { error } = await supabase.from("issues").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/soucis");
}

export async function updateIssueStatus(id: string, status: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("issues")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/soucis");
}

export async function deleteIssue(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/soucis");
}

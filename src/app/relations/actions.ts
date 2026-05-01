"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRelation(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const sourceRaw = formData.get("source_npc_id") as string | null;
  const target = formData.get("target_npc_id") as string | null;
  const type = formData.get("type") as string | null;
  if (!target || !type) throw new Error("Cible et type requis");

  const payload = {
    source_npc_id: sourceRaw && sourceRaw !== "EITAN" ? sourceRaw : null,
    target_npc_id: target,
    type,
    intensity: formData.get("intensity")
      ? Number(formData.get("intensity"))
      : 0,
    description: (formData.get("description") as string) || null,
    created_by: user.id,
  };

  const { error } = await supabase.from("relations").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/relations");
  revalidatePath("/mindmap");
}

export async function deleteRelation(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("relations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/relations");
  revalidatePath("/mindmap");
}

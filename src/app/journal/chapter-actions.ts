"use server";

import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createChapter(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Auto-increment chapter number
  const { data: maxRow } = await supabase
    .from("chapters")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  const nextNumber =
    ((maxRow?.[0] as { number: number } | undefined)?.number ?? 0) + 1;

  const title =
    String(formData.get("title") ?? "").trim() || `Chapitre ${nextNumber}`;
  const subtitle = (formData.get("subtitle") as string) || null;

  const slug = await uniqueSlug(
    supabase,
    "chapters",
    `chapitre-${nextNumber}`,
    "chapitre"
  );

  const { error } = await supabase.from("chapters").insert({
    number: nextNumber,
    title,
    subtitle,
    slug,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  redirect("/journal");
}

export async function updateChapter(id: string, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = (formData.get("subtitle") as string) || null;
  if (!title) throw new Error("Titre requis");

  const { error } = await supabase
    .from("chapters")
    .update({ title, subtitle, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
}

export async function deleteChapter(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");

  // Check if chapter has days
  const { count } = await supabase
    .from("days")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", id);
  if (count && count > 0)
    throw new Error(
      "Impossible de supprimer un chapitre contenant des jours. Déplace-les d'abord."
    );

  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("character")
    .update(payload)
    .eq("is_main", true);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

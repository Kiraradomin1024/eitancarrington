"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateOwnProfile(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const display_name =
    (formData.get("display_name") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, avatar_url, bio })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/u/${user.id}`);
  revalidatePath("/u/edit");
  redirect(`/u/${user.id}`);
}

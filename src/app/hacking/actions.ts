"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isKirara } from "@/lib/hacking";

export async function setHackingMode(on: boolean) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!isKirara(profile?.role ?? null, profile?.display_name ?? null)) {
    throw new Error("Réservé à Kirara");
  }

  const { error } = await supabase
    .from("site_settings")
    .update({ hacking_mode: on, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Force every connected client (the streamer included) to reload the page. */
export async function forceReloadAll() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!isKirara(profile?.role ?? null, profile?.display_name ?? null)) {
    throw new Error("Réservé à Kirara");
  }

  const { error } = await supabase
    .from("site_settings")
    .update({
      reload_nonce: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}

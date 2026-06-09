import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserAndRole() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, role: null as string | null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, role: (data?.role as string | null) ?? null };
}

export function canContribute(role: string | null) {
  return role === "contributor" || role === "admin";
}

export function isAdmin(role: string | null) {
  return role === "admin";
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LayoutPosition = { node_id: string; x: number; y: number };

/**
 * Save the current user's layout. Replaces all of their existing positions
 * with the ones provided.
 */
export async function saveMyLayout(positions: LayoutPosition[]) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Connecte-toi pour sauvegarder ton layout");

  // Delete previous layout, then insert new
  const { error: delErr } = await supabase
    .from("mindmap_layouts")
    .delete()
    .eq("user_id", user.id);
  if (delErr) throw new Error(delErr.message);

  if (positions.length > 0) {
    const rows = positions.map((p) => ({
      user_id: user.id,
      node_id: p.node_id,
      x: p.x,
      y: p.y,
    }));
    const { error: insErr } = await supabase
      .from("mindmap_layouts")
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  revalidatePath("/mindmap");
}

/** Wipe the current user's layout. Next render falls back to the default. */
export async function resetMyLayout() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Connecte-toi");
  const { error } = await supabase
    .from("mindmap_layouts")
    .delete()
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/mindmap");
}

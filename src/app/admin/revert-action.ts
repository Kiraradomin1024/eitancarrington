"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const REVERTABLE_TABLES = new Set([
  "npcs",
  "days",
  "investigations",
  "investigation_clues",
  "relations",
  "issues",
  "character",
]);

/**
 * Admin-only: undo a single audit log entry.
 *
 * - insert → delete the row (entity_id) from its table
 * - update → restore the `before` snapshot
 * - delete → re-insert the `before` snapshot
 *
 * Note: cascading deletes (e.g. deleting an NPC also wipes their relations)
 * are not unwound automatically. The admin must revert each child entry too.
 */
export async function revertAuditEntry(auditId: number): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("Accès refusé");

  const { data: entry, error: fetchErr } = await supabase
    .from("audit_log")
    .select("entity_type, entity_id, action, before, after")
    .eq("id", auditId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!entry) throw new Error("Entrée d'audit introuvable");

  const table = entry.entity_type as string;
  if (!REVERTABLE_TABLES.has(table)) {
    throw new Error(`Annulation non supportée pour ${table}`);
  }

  if (entry.action === "insert") {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", entry.entity_id);
    if (error) throw new Error(error.message);
  } else if (entry.action === "update") {
    if (!entry.before) throw new Error("Snapshot 'before' manquant");
    const before = entry.before as Record<string, unknown>;
    // Strip the id and let it match via .eq; updating the id itself would fail
    // and is meaningless.
    const { id: _ignored, ...payload } = before;
    void _ignored;
    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", entry.entity_id);
    if (error) throw new Error(error.message);
  } else if (entry.action === "delete") {
    if (!entry.before) throw new Error("Snapshot 'before' manquant");
    const { error } = await supabase
      .from(table)
      .insert(entry.before as Record<string, unknown>);
    if (error) throw new Error(error.message);
  }

  // Best-effort revalidate — covers the most common pages.
  revalidatePath("/admin");
  revalidatePath("/wiki");
  revalidatePath("/journal");
  revalidatePath("/enquetes");
  revalidatePath("/soucis");
  revalidatePath("/mindmap");
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { NpcForm } from "@/components/NpcForm";
import { PageTitle } from "@/components/ui";
import { updateNpc } from "../../actions";
import { slugOrIdColumn } from "@/lib/slug";
import { notFound, redirect } from "next/navigation";
import type { Npc, RelationType } from "@/lib/types";

export default async function EditNpcPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect(`/wiki/${id}`);
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("npcs")
    .select("*")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) notFound();

  const npc = data as Npc;

  const { data: npcsRaw } = await supabase
    .from("npcs")
    .select("id, name")
    .neq("id", npc.id)
    .order("name", { ascending: true });
  // Fetch main character name to include in the relations picker
  const { data: mainChar } = await supabase
    .from("character")
    .select("name")
    .eq("is_main", true)
    .maybeSingle();
  const existingNpcs: { id: string; name: string }[] = [
    { id: "__EITAN__", name: mainChar?.name ?? "Eitan Carrington" },
    ...((npcsRaw ?? []) as { id: string; name: string }[]),
  ];

  // Pre-fill relations involving this NPC in either direction.
  const { data: relsRaw } = await supabase
    .from("relations")
    .select("source_npc_id, target_npc_id, type")
    .or(`source_npc_id.eq.${npc.id},target_npc_id.eq.${npc.id}`);
  const initialRelations: Record<string, RelationType> = {};
  for (const r of (relsRaw ?? []) as {
    source_npc_id: string | null;
    target_npc_id: string | null;
    type: RelationType;
  }[]) {
    const otherId =
      r.source_npc_id === npc.id ? r.target_npc_id : r.source_npc_id;
    // null source/target means the main character (Eitan)
    initialRelations[otherId ?? "__EITAN__"] = r.type;
  }

  const update = updateNpc.bind(null, npc.id);

  return (
    <div>
      <PageTitle title={`Modifier ${npc.name}`} />
      <NpcForm
        initial={npc}
        action={update}
        existingNpcs={existingNpcs}
        initialRelations={initialRelations}
      />
    </div>
  );
}

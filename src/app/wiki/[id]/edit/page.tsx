import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { NpcForm } from "@/components/NpcForm";
import { PageTitle } from "@/components/ui";
import { updateNpc } from "../../actions";
import { slugOrIdColumn } from "@/lib/slug";
import { notFound, redirect } from "next/navigation";
import type { Npc } from "@/lib/types";

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
  const update = updateNpc.bind(null, npc.id);

  return (
    <div>
      <PageTitle title={`Modifier ${npc.name}`} />
      <NpcForm initial={npc} action={update} />
    </div>
  );
}

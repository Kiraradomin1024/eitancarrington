import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { NpcForm } from "@/components/NpcForm";
import { PageTitle } from "@/components/ui";
import { updateNpc } from "../../actions";
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
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const update = updateNpc.bind(null, id);

  return (
    <div>
      <PageTitle title={`Modifier ${(data as Npc).name}`} />
      <NpcForm initial={data as Npc} action={update} />
    </div>
  );
}

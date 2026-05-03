import { getCurrentUserAndRole, canContribute } from "@/lib/auth";
import { NpcForm } from "@/components/NpcForm";
import { PageTitle } from "@/components/ui";
import { createNpc } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewNpcPage() {
  const { role } = await getCurrentUserAndRole();
  if (!canContribute(role)) redirect("/wiki");

  const supabase = await createClient();
  const { data: npcsRaw } = supabase
    ? await supabase
        .from("npcs")
        .select("id, name")
        .order("name", { ascending: true })
    : { data: [] };
  const existingNpcs = (npcsRaw ?? []) as { id: string; name: string }[];

  return (
    <div>
      <PageTitle title="Nouveau personnage" />
      <NpcForm action={createNpc} existingNpcs={existingNpcs} />
    </div>
  );
}

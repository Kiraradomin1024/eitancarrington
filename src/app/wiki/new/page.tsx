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
  // Fetch main character name to include in the relations picker
  const { data: mainChar } = supabase
    ? await supabase
        .from("character")
        .select("name")
        .eq("is_main", true)
        .maybeSingle()
    : { data: null };
  const existingNpcs: { id: string; name: string }[] = [
    { id: "__EITAN__", name: mainChar?.name ?? "Eitan Carrington" },
    ...((npcsRaw ?? []) as { id: string; name: string }[]),
  ];

  return (
    <div>
      <PageTitle title="Nouveau personnage" />
      <NpcForm action={createNpc} existingNpcs={existingNpcs} />
    </div>
  );
}

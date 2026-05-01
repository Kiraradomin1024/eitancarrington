import { getCurrentUserAndRole, canContribute } from "@/lib/auth";
import { NpcForm } from "@/components/NpcForm";
import { PageTitle } from "@/components/ui";
import { createNpc } from "../actions";
import { redirect } from "next/navigation";

export default async function NewNpcPage() {
  const { role } = await getCurrentUserAndRole();
  if (!canContribute(role)) redirect("/wiki");
  return (
    <div>
      <PageTitle title="Nouveau personnage" />
      <NpcForm action={createNpc} />
    </div>
  );
}

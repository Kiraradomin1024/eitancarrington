import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { InvestigationForm } from "@/components/InvestigationForm";
import { PageTitle } from "@/components/ui";
import { updateInvestigation } from "../../actions";
import { slugOrIdColumn } from "@/lib/slug";
import { notFound, redirect } from "next/navigation";
import type { Investigation } from "@/lib/types";

export default async function EditInvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect(`/enquetes/${id}`);
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("investigations")
    .select("*")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) notFound();
  const inv = data as Investigation;
  const update = updateInvestigation.bind(null, inv.id);
  return (
    <div>
      <PageTitle title={`Modifier — ${inv.title}`} />
      <InvestigationForm initial={inv} action={update} />
    </div>
  );
}

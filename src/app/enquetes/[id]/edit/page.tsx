import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { InvestigationForm } from "@/components/InvestigationForm";
import { PageTitle } from "@/components/ui";
import { updateInvestigation } from "../../actions";
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
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const update = updateInvestigation.bind(null, id);
  return (
    <div>
      <PageTitle title={`Modifier — ${(data as Investigation).title}`} />
      <InvestigationForm initial={data as Investigation} action={update} />
    </div>
  );
}

import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { InvestigationForm } from "@/components/InvestigationForm";
import { PageTitle } from "@/components/ui";
import { createInvestigation } from "../actions";
import { redirect } from "next/navigation";

export default async function NewInvPage() {
  const { role } = await getCurrentUserAndRole();
  if (!canContribute(role)) redirect("/enquetes");
  return (
    <div>
      <PageTitle title="ouvrir un dossier" subtitle="une chemise neuve, une affaire de plus." />
      <InvestigationForm action={createInvestigation} />
    </div>
  );
}

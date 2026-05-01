import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { DayForm } from "@/components/DayForm";
import { PageTitle } from "@/components/ui";
import { createDay } from "../actions";
import { redirect } from "next/navigation";

export default async function NewDayPage() {
  const { role } = await getCurrentUserAndRole();
  if (!canContribute(role)) redirect("/journal");
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("npcs")
    .select("id, name")
    .order("name");
  return (
    <div>
      <PageTitle title="Nouvelle entrée du journal" />
      <DayForm npcs={data ?? []} action={createDay} />
    </div>
  );
}

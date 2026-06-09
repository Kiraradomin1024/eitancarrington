import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { DayForm } from "@/components/DayForm";
import { PageTitle } from "@/components/ui";
import { createDay } from "../actions";
import { redirect } from "next/navigation";
import type { Chapter } from "@/lib/types";

export default async function NewDayPage() {
  const { role } = await getCurrentUserAndRole();
  if (!canContribute(role)) redirect("/journal");
  const supabase = await createClient();
  if (!supabase) return null;
  const [{ data: npcs }, { data: maxRow }, { data: chaptersRaw }] =
    await Promise.all([
      supabase.from("npcs").select("id, name").order("name"),
      supabase
        .from("days")
        .select("day_number")
        .not("day_number", "is", null)
        .order("day_number", { ascending: false })
        .limit(1),
      supabase
        .from("chapters")
        .select("*")
        .order("number", { ascending: true }),
    ]);
  const maxDayNumber =
    (maxRow?.[0] as { day_number: number } | undefined)?.day_number ?? 0;
  const chapters = (chaptersRaw ?? []) as Chapter[];

  return (
    <div>
      <PageTitle title="Nouvelle entrée du journal" />
      <DayForm
        npcs={npcs ?? []}
        chapters={chapters}
        action={createDay}
        nextDayNumber={maxDayNumber + 1}
      />
    </div>
  );
}

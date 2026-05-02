import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { DayForm } from "@/components/DayForm";
import { PageTitle } from "@/components/ui";
import { updateDay } from "../../actions";
import { slugOrIdColumn } from "@/lib/slug";
import { notFound, redirect } from "next/navigation";
import type { Day } from "@/lib/types";

export default async function EditDayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect(`/journal/${id}`);
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: day } = await supabase
    .from("days")
    .select("*")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!day) notFound();
  const d = day as Day;

  const [{ data: npcs }, { data: links }] = await Promise.all([
    supabase.from("npcs").select("id, name").order("name"),
    supabase.from("day_npcs").select("npc_id").eq("day_id", d.id),
  ]);

  const update = updateDay.bind(null, d.id);

  return (
    <div>
      <PageTitle title={`Modifier — ${d.title}`} />
      <DayForm
        initial={d}
        initialNpcIds={(links ?? []).map((l: { npc_id: string }) => l.npc_id)}
        npcs={npcs ?? []}
        action={update}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { DayForm } from "@/components/DayForm";
import { PageTitle } from "@/components/ui";
import { updateDay } from "../../actions";
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
  const [{ data: day }, { data: npcs }, { data: links }] = await Promise.all([
    supabase.from("days").select("*").eq("id", id).maybeSingle(),
    supabase.from("npcs").select("id, name").order("name"),
    supabase.from("day_npcs").select("npc_id").eq("day_id", id),
  ]);
  if (!day) notFound();

  const update = updateDay.bind(null, id);

  return (
    <div>
      <PageTitle title={`Modifier — ${(day as Day).title}`} />
      <DayForm
        initial={day as Day}
        initialNpcIds={(links ?? []).map((l: { npc_id: string }) => l.npc_id)}
        npcs={npcs ?? []}
        action={update}
      />
    </div>
  );
}

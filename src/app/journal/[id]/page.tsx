import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import type { Day } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteDay } from "../actions";

export const dynamic = "force-dynamic";

export default async function DayDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data } = await supabase
    .from("days")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const day = data as Day;

  const { data: linksRaw } = await supabase
    .from("day_npcs")
    .select("npc_id, npcs(id, name)")
    .eq("day_id", id);
  const linkedNpcs =
    (linksRaw as
      | { npc_id: string; npcs: { id: string; name: string } | null }[]
      | null) ?? [];

  return (
    <div>
      <PageTitle
        title={day.day_number ? `Jour ${day.day_number} — ${day.title}` : day.title}
        subtitle={day.day_number ? `Jour ${day.day_number} · ${formatDate(day.date)}` : formatDate(day.date)}
        action={
          canEdit && (
            <div className="flex gap-2">
              <LinkButton href={`/journal/${id}/edit`} variant="ghost">
                Modifier
              </LinkButton>
              <DeleteButton
                action={async () => {
                  "use server";
                  await deleteDay(id);
                }}
              />
            </div>
          )
        }
      />

      {day.summary && (
        <p className="text-lg font-serif italic text-muted mb-6">
          {day.summary}
        </p>
      )}

      <Card>
        <p className="whitespace-pre-line leading-relaxed text-foreground/90">
          {day.content ?? <span className="text-muted italic">Aucun récit.</span>}
        </p>
      </Card>

      {linkedNpcs.length > 0 && (
        <div className="mt-6">
          <h2 className="font-serif text-xl text-accent mb-3 title-rule">
            Personnages présents
          </h2>
          <div className="flex flex-wrap gap-2">
            {linkedNpcs
              .filter((l) => l.npcs)
              .map((l) => (
                <Link
                  key={l.npc_id}
                  href={`/wiki/${l.npc_id}`}
                  className="px-3 py-1 rounded-full border border-accent/40 bg-accent/10 text-foreground text-sm hover:bg-accent/20"
                >
                  {l.npcs!.name}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

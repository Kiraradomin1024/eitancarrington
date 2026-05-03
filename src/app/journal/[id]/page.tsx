import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { Day } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteDay } from "../actions";
import { slugOrIdColumn } from "@/lib/slug";
import type { Metadata } from "next";
import { truncateForMeta } from "@/lib/seo";
import { HistoryPanel } from "@/components/HistoryPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from("days")
    .select("title, summary, content, day_number, date")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) return { title: "Session introuvable" };
  const d = data as {
    title: string;
    summary: string | null;
    content: string | null;
    day_number: number | null;
    date: string;
  };
  const title = d.day_number ? `Jour ${d.day_number} — ${d.title}` : d.title;
  const description =
    truncateForMeta(d.summary) ??
    truncateForMeta(d.content) ??
    `Session de jeu d'Eitan Carrington — ${formatDate(d.date)}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: d.date,
    },
    twitter: { card: "summary", title, description },
  };
}

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
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) notFound();
  const day = data as Day;
  const dayKey = day.slug ?? day.id;

  const { data: linksRaw } = await supabase
    .from("day_npcs")
    .select("npc_id, npcs(id, name, slug)")
    .eq("day_id", day.id);
  const linkedNpcs =
    (linksRaw as
      | {
          npc_id: string;
          npcs: { id: string; name: string; slug: string | null } | null;
        }[]
      | null) ?? [];

  return (
    <div>
      <PageTitle
        title={day.day_number ? `Jour ${day.day_number} — ${day.title}` : day.title}
        subtitle={day.day_number ? `Jour ${day.day_number} · ${formatDate(day.date)}` : formatDate(day.date)}
        action={
          canEdit && (
            <div className="flex gap-2">
              <LinkButton href={`/journal/${dayKey}/edit`} variant="ghost">
                Modifier
              </LinkButton>
              <DeleteButton
                action={async () => {
                  "use server";
                  await deleteDay(day.id);
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

      {day.vod_url && (
        <a
          href={day.vod_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent-2 text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          Voir la rediff du stream
        </a>
      )}

      <Card>
        {day.content ? (
          <MarkdownContent content={day.content} />
        ) : (
          <p className="text-muted italic">Aucun récit.</p>
        )}
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
                  href={`/wiki/${l.npcs!.slug ?? l.npc_id}`}
                  className="px-3 py-1 rounded-full border border-accent/40 bg-accent/10 text-foreground text-sm hover:bg-accent/20"
                >
                  {l.npcs!.name}
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <HistoryPanel entityType="days" entityId={day.id} />
      </div>
    </div>
  );
}

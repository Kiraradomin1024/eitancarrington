import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import type { Chapter, Day } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChapterHeader } from "./chapter-header";
import { CollapsibleChapter } from "./collapsible-chapter";
import { PinButton } from "./pin-button";

export default async function JournalPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);
  const admin = isAdmin(role);

  const [{ data: chaptersRaw }, { data: daysRaw }] = await Promise.all([
    supabase.from("chapters").select("*").order("number", { ascending: false }),
    supabase.from("days").select("*").order("date", { ascending: false }),
  ]);
  const chapters = (chaptersRaw ?? []) as Chapter[];
  const days = (daysRaw ?? []) as Day[];

  // Group days by chapter_id, pinned first then by date desc
  const daysByChapter = new Map<string | null, Day[]>();
  for (const d of days) {
    const key = d.chapter_id ?? null;
    if (!daysByChapter.has(key)) daysByChapter.set(key, []);
    daysByChapter.get(key)!.push(d);
  }
  // Sort each group: pinned first, then by date desc (already sorted from query)
  for (const [, group] of daysByChapter) {
    group.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0; // keep existing date order
    });
  }

  // Orphan days (no chapter)
  const orphanDays = daysByChapter.get(null) ?? [];

  return (
    <div>
      <PageTitle
        title="Journal"
        subtitle="Récits jour par jour de la vie d'Eitan."
        action={
          canEdit && (
            <div className="flex gap-2">
              {admin && (
                <LinkButton href="/journal/new-chapter" variant="ghost">
                  + Chapitre
                </LinkButton>
              )}
              <LinkButton href="/journal/new">Nouveau jour</LinkButton>
            </div>
          )
        }
      />

      {chapters.length === 0 && days.length === 0 ? (
        <Empty>Aucun jour documenté pour l&apos;instant.</Empty>
      ) : (
        <div className="space-y-12">
          {chapters.map((chapter, idx) => {
            const chapterDays = daysByChapter.get(chapter.id) ?? [];
            return (
            <section key={chapter.id} className="relative">
                <ChapterHeader chapter={chapter} canEdit={admin} maxDayNumber={
                  chapterDays.reduce((max, d) => Math.max(max, d.day_number ?? 0), 0)
                } />
                <CollapsibleChapter defaultOpen>
                  {chapterDays.length === 0 ? (
                    <p className="text-muted text-sm italic ml-1">
                      Aucun jour dans ce chapitre.
                    </p>
                  ) : (
                    <div className="border-t border-border">
                      {chapterDays.map((d) => (
                        <DayCard key={d.id} day={d} canEdit={canEdit} />
                      ))}
                    </div>
                  )}
                </CollapsibleChapter>
              </section>
            );
          })}

          {orphanDays.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-muted">
                  Sans chapitre
                </h2>
              </div>
              <div className="border-t border-border">
                {orphanDays.map((d) => (
                  <DayCard key={d.id} day={d} canEdit={canEdit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DayCard({ day: d, canEdit }: { day: Day; canEdit: boolean }) {
  return (
    <div className="relative group border-b border-border last:border-b-0">
      <Link
        href={`/journal/${d.slug ?? d.id}`}
        className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr_auto] gap-6 md:gap-8 items-baseline py-7 pr-10 transition-colors hover:bg-surface-2/40"
      >
        <div>
          {d.day_number ? (
            <>
              <div className="font-display font-light text-3xl text-accent leading-none">
                {d.day_number}
              </div>
              <div className="meta-label mt-1.5">
                {formatDate(d.date)}
              </div>
            </>
          ) : (
            <>
              <div className="font-display font-light text-3xl text-accent leading-none">
                {new Date(d.date).getDate()}
              </div>
              <div className="meta-label mt-1.5">
                {new Date(d.date).toLocaleDateString("fr-FR", {
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-display text-2xl text-foreground leading-snug flex items-center gap-2">
            {d.pinned && (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-accent shrink-0"
                aria-label="Épinglé"
              >
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            )}
            {d.title}
          </h3>
          {d.summary && (
            <p className="text-muted mt-2 text-sm leading-relaxed max-w-[62ch]">
              {d.summary}
            </p>
          )}
        </div>

        <div className="hidden md:block meta-label text-right whitespace-nowrap">
          {d.pinned ? "épinglé" : "session"}
        </div>
      </Link>
      {canEdit && (
        <div className="absolute top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <PinButton dayId={d.id} pinned={d.pinned} />
        </div>
      )}
    </div>
  );
}

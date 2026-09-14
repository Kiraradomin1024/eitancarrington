import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Empty, LinkButton } from "@/components/ui";
import type { Chapter, Day } from "@/lib/types";
import Link from "next/link";
import { ChapterHeader } from "./chapter-header";
import { CollapsibleChapter } from "./collapsible-chapter";
import { PinButton } from "./pin-button";
import { HandTitle, PageNumber } from "@/components/paper";
import { handDate } from "@/lib/ink";
import { SearchLine } from "@/components/SearchLine";

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

  // Jours regroupés par chapitre : épinglés d'abord, puis du plus récent au plus ancien
  const daysByChapter = new Map<string | null, Day[]>();
  for (const d of days) {
    const key = d.chapter_id ?? null;
    if (!daysByChapter.has(key)) daysByChapter.set(key, []);
    daysByChapter.get(key)!.push(d);
  }
  for (const [, group] of daysByChapter) {
    group.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }

  const orphanDays = daysByChapter.get(null) ?? [];

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <HandTitle sub="jour après jour. le plus récent en haut, comme je l'écris.">
          le journal
        </HandTitle>
        <div className="flex flex-col items-start lg:items-end gap-5">
          {canEdit && (
            <div className="flex gap-4 items-center flex-wrap">
              {admin && (
                <LinkButton href="/journal/new-chapter" variant="ghost">
                  ouvrir un chapitre
                </LinkButton>
              )}
              <LinkButton href="/journal/new">Écrire un jour</LinkButton>
            </div>
          )}
          <SearchLine className="w-full sm:w-[340px]" />
        </div>
      </div>

      {chapters.length === 0 && days.length === 0 ? (
        <Empty>aucun jour noté pour l&apos;instant.</Empty>
      ) : (
        <div className="space-y-16">
          {chapters.map((chapter) => {
            const chapterDays = daysByChapter.get(chapter.id) ?? [];
            return (
              <section key={chapter.id} className="relative">
                <ChapterHeader
                  chapter={chapter}
                  canEdit={admin}
                  maxDayNumber={chapterDays.reduce(
                    (max, d) => Math.max(max, d.day_number ?? 0),
                    0
                  )}
                />
                <CollapsibleChapter defaultOpen>
                  {chapterDays.length === 0 ? (
                    <p className="hand text-[21px] text-ink-faint">
                      aucun jour dans ce chapitre.
                    </p>
                  ) : (
                    <ol>
                      {chapterDays.map((d) => (
                        <DayLine key={d.id} day={d} canEdit={canEdit} />
                      ))}
                    </ol>
                  )}
                </CollapsibleChapter>
              </section>
            );
          })}

          {orphanDays.length > 0 && (
            <section>
              <span className="label-kraft mb-4">feuilles volantes</span>
              <p className="hand text-[21px] text-ink-soft mb-4">
                des jours qui n&apos;ont pas encore de chapitre
              </p>
              <ol>
                {orphanDays.map((d) => (
                  <DayLine key={d.id} day={d} canEdit={canEdit} />
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      <PageNumber>5</PageNumber>
    </div>
  );
}

function DayLine({ day: d, canEdit }: { day: Day; canEdit: boolean }) {
  return (
    <li className="relative group">
      <Link
        href={`/journal/${d.slug ?? d.id}`}
        className="grid grid-cols-[76px_1fr] sm:grid-cols-[120px_1fr] gap-x-4 sm:gap-x-7 py-3.5 pr-10 items-baseline"
      >
        <div className="hand leading-none">
          <div className="text-[27px] sm:text-[31px] font-semibold text-ink">
            {d.day_number ? `J. ${d.day_number}` : "·"}
          </div>
          <div className="text-[16px] sm:text-[18px] text-ink-soft mt-1">
            {handDate(d.date)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="hand text-[23px] sm:text-[26px] leading-[1.15] text-ink group-hover:underline underline-offset-4 decoration-2">
            {d.pinned && (
              <span className="text-pen-red text-[19px] mr-2 align-middle" style={{ display: "inline-block", transform: "rotate(-3deg)" }}>
                épinglé ·
              </span>
            )}
            {d.title}
          </div>
          {d.summary && (
            <p className="print text-[14.5px] leading-[1.65] text-ink-soft mt-1 max-w-[64ch] line-clamp-2">
              {d.summary}
            </p>
          )}
        </div>
      </Link>
      {canEdit && (
        <div className="absolute top-4 right-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <PinButton dayId={d.id} pinned={d.pinned} />
        </div>
      )}
    </li>
  );
}

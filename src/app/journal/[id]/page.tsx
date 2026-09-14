import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { Day, NpcStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteDay } from "../actions";
import { slugOrIdColumn } from "@/lib/slug";
import type { Metadata } from "next";
import { truncateForMeta } from "@/lib/seo";
import { HistoryPanel } from "@/components/HistoryPanel";
import { getHackingMode } from "@/lib/hacking";
import { DossierAccess } from "@/components/DossierAccess";
import { PageNumber, Sheet, Spread, Stamp } from "@/components/paper";
import { SearchLine } from "@/components/SearchLine";
import { frNumber, handDate, roman, typedDate, wordCount } from "@/lib/ink";

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

type Neighbor = { slug: string | null; id: string; day_number: number | null; title: string };

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

  const [{ data: linksRaw }, { data: chapterRaw }, { data: nextRaw }, { data: prevRaw }] =
    await Promise.all([
      supabase
        .from("day_npcs")
        .select("npc_id, npcs(id, name, slug, status)")
        .eq("day_id", day.id),
      day.chapter_id
        ? supabase
            .from("chapters")
            .select("number, title")
            .eq("id", day.chapter_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("days")
        .select("id, slug, day_number, title")
        .gt("date", day.date)
        .order("date", { ascending: true })
        .limit(1),
      supabase
        .from("days")
        .select("id, slug, day_number, title")
        .lt("date", day.date)
        .order("date", { ascending: false })
        .limit(1),
    ]);

  const present = (
    (linksRaw as
      | {
          npc_id: string;
          npcs: { id: string; name: string; slug: string | null; status: NpcStatus } | null;
        }[]
      | null) ?? []
  )
    .map((l) => l.npcs)
    .filter((x): x is NonNullable<typeof x> => !!x);

  const chapter = chapterRaw as { number: number; title: string } | null;
  const next = (nextRaw?.[0] as Neighbor | undefined) ?? null;
  const prev = (prevRaw?.[0] as Neighbor | undefined) ?? null;

  // Le premier cliché du récit devient le polaroid scotché en face
  const firstImage = day.content?.match(/!\[([^\]]*)\]\(([^)\s]+)\)/);
  const polaroid = firstImage ? { alt: firstImage[1], src: firstImage[2] } : null;

  const words = wordCount(day.content);
  const hacking = await getHackingMode();
  const fileName = day.day_number
    ? `JOUR_${day.day_number} — ${day.title}`
    : day.title;
  const pageNo = day.day_number ?? null;

  return (
    <div>
      <DossierAccess on={hacking} fileName={fileName} dossier={null} />

      {canEdit && (
        <div className="flex justify-end items-center gap-5 mb-6 flex-wrap">
          <LinkButton href={`/journal/${dayKey}/edit`} variant="ghost">
            reprendre le récit
          </LinkButton>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteDay(day.id);
            }}
            label="Arracher la page"
          />
        </div>
      )}

      <Spread
        left={
          <div className="relative">
            <div className="hand text-ink">
              <div className="flex items-baseline gap-3.5 flex-wrap">
                <span className="text-[31px] font-semibold">
                  {day.day_number ? `Jour ${day.day_number}` : day.title}
                </span>
                <span className="text-[22px] text-ink-soft">— {handDate(day.date)}</span>
              </div>
            </div>

            {day.summary ? (
              <p className="hand mt-1.5 text-[22px] md:text-[23px] leading-[34px] max-w-[42ch] whitespace-pre-line">
                {day.summary}
              </p>
            ) : (
              <p className="hand mt-1.5 text-[22px] leading-[34px] text-ink-faint">
                pas eu le courage d&apos;écrire à la main ce soir.
              </p>
            )}
            {day.content && (
              <p className="hand text-[22px] leading-[34px] text-ink-soft">
                j&apos;ai tout tapé en rentrant, c&apos;est agrafé en face.{" "}
                <span className="hidden lg:inline">→</span>
                <span className="lg:hidden">↓</span>
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-8 sm:gap-7 items-start">
              {polaroid && (
                <div className="relative w-[236px] max-w-full shrink-0" style={{ transform: "rotate(-2.4deg)" }}>
                  <div className="polaroid">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={polaroid.src} alt={polaroid.alt} className="h-[158px]" />
                    <span className="polaroid__caption">
                      {polaroid.alt || "sans légende"}
                    </span>
                  </div>
                  <span className="tape" style={{ top: -13, left: -26, width: 88, height: 26, transform: "rotate(-24deg)" }} />
                  <span className="tape" style={{ bottom: -12, right: -24, width: 84, height: 24, transform: "rotate(-19deg)" }} />
                </div>
              )}

              <div className="hand text-ink min-w-0" style={{ transform: "rotate(1.1deg)" }}>
                <div className="text-[24px] font-semibold hand-under inline-block mb-2">
                  qui était là
                </div>
                {present.length === 0 ? (
                  <div className="text-[21px] leading-[31px] text-ink-faint">
                    personne de noté
                  </div>
                ) : (
                  <ul className="text-[22px] leading-[31px]">
                    {present.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/wiki/${p.slug ?? p.id}`}
                          className={
                            "hover:underline underline-offset-4 " +
                            (p.status === "dead"
                              ? "text-ink-faint line-through"
                              : p.status === "missing"
                                ? "text-pen-red"
                                : p.status === "jailed"
                                  ? "text-pen-amber"
                                  : "")
                          }
                        >
                          {p.name}
                        </Link>
                        {p.status === "missing" && (
                          <span className="text-[18px] text-pen-red"> (disparu)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <SearchLine className="mt-12 max-w-[440px]" />

            <div className="mt-8 flex justify-between items-baseline gap-4 hand text-[19px]">
              {prev ? (
                <Link
                  href={`/journal/${prev.slug ?? prev.id}`}
                  className="text-ink-soft hover:text-ink truncate"
                >
                  ← {prev.day_number ? `jour ${prev.day_number}` : prev.title}
                </Link>
              ) : (
                <span />
              )}
              <Link href="/journal" className="text-ink-soft hover:text-ink">
                tout le journal
              </Link>
            </div>

            <PageNumber>{pageNo ?? "·"}</PageNumber>
          </div>
        }
        right={
          <div className="relative">
            <Sheet
              className="!pt-9 sm:!px-9 sm:!pb-9 lg:min-h-[706px]"
              // Une longue feuille penchée déborde vite : l'angle diminue avec la longueur
              rotate={words > 1500 ? "0.08deg" : words > 500 ? "0.2deg" : "0.5deg"}
              label={
                <>
                  compte rendu
                  {day.day_number ? ` — session ${day.day_number}` : ""}
                  {chapter ? ` / chap. ${roman(chapter.number)}` : ""}
                </>
              }
              labelRight={
                <>
                  {words > 0 && `${frNumber(words)} mots`}
                  {day.vod_url && (
                    <>
                      {words > 0 && " · "}
                      <a
                        href={day.vod_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-ink underline"
                      >
                        VOD ↗
                      </a>
                    </>
                  )}
                </>
              }
            >
              <h1 className="print text-[30px] sm:text-[37px] font-semibold leading-[1.08] max-w-[14ch] text-balance pr-16 sm:pr-24">
                {day.title}
              </h1>

              <div className="absolute right-4 top-[92px] sm:right-5 sm:top-[104px] pointer-events-none">
                <Stamp
                  tone="var(--pen-violet)"
                  rotate="-11deg"
                  sub={`${typedDate(day.updated_at, true)} · EC-021`}
                >
                  versé au dossier
                </Stamp>
              </div>

              <div className="mt-7">
                {day.content ? (
                  <div className="hk-redact-zone max-w-[60ch]">
                    <MarkdownContent content={day.content} />
                  </div>
                ) : (
                  <p className="hand text-[22px] text-ink-faint">
                    rien de tapé pour ce jour-là.
                  </p>
                )}
              </div>

              <div className="mt-7 flex items-end justify-between gap-4">
                <span className="typed">
                  {next ? (
                    <Link
                      href={`/journal/${next.slug ?? next.id}`}
                      className="hover:text-ink underline"
                    >
                      suite page {next.day_number ?? "suivante"}
                    </Link>
                  ) : (
                    "fin — rien après, pour l'instant"
                  )}
                </span>
                <span
                  className="hand text-[30px] leading-none"
                  style={{ transform: "rotate(-4deg)" }}
                >
                  E. C.
                </span>
              </div>
            </Sheet>

            <div className="mt-10">
              <HistoryPanel entityType="days" entityId={day.id} />
            </div>

            <PageNumber align="right">{pageNo ? pageNo + 1 : "·"}</PageNumber>
          </div>
        }
      />
    </div>
  );
}

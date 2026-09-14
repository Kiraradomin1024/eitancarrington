import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import { MarkdownContent, extractHeadings } from "@/components/MarkdownContent";
import type { Npc, NpcStatus, Relation } from "@/lib/types";
import { getLiveStatuses } from "@/lib/twitch";
import { TwitchEmbed } from "@/components/TwitchEmbed";
import { PageNumber, Photo, Sheet, Spread, StatusStamp } from "@/components/paper";
import { RelationLine } from "@/components/RelationLine";
import { STATUS_INK, typedDate } from "@/lib/ink";
import { slugOrIdColumn } from "@/lib/slug";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteNpc } from "../actions";
import { getHackingMode } from "@/lib/hacking";
import { DossierAccess } from "@/components/DossierAccess";
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
    .from("npcs")
    .select("name, description, occupation, family, photo_url")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) return { title: "Personnage introuvable" };
  const npc = data as Pick<
    Npc,
    "name" | "description" | "occupation" | "family" | "photo_url"
  >;
  const subtitle = npc.occupation ?? npc.family ?? null;
  const description =
    truncateForMeta(npc.description) ??
    (subtitle
      ? `${npc.name} — ${subtitle}. Fiche du wiki d'Eitan Carrington.`
      : `Fiche de ${npc.name} dans le wiki d'Eitan Carrington.`);
  const images = npc.photo_url ? [{ url: npc.photo_url, alt: npc.name }] : undefined;
  return {
    title: npc.name,
    description,
    openGraph: {
      title: npc.name,
      description,
      type: "profile",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: npc.name,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function NpcDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data: npc } = await supabase
    .from("npcs")
    .select("*")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();

  if (!npc) notFound();
  const n = npc as Npc;

  // Les liens passent toujours par l'UUID de la fiche
  const { data: relsRaw } = await supabase
    .from("relations")
    .select("*")
    .or(`source_npc_id.eq.${n.id},target_npc_id.eq.${n.id}`);
  const rels = (relsRaw ?? []) as Relation[];

  const otherIds = Array.from(
    new Set(
      rels
        .flatMap((r) => [r.source_npc_id, r.target_npc_id])
        .filter((x): x is string => !!x && x !== n.id)
    )
  );
  const { data: othersRaw } = otherIds.length
    ? await supabase
        .from("npcs")
        .select("id, name, slug, status")
        .in("id", otherIds)
    : { data: [] };
  const otherMap = new Map(
    (
      (othersRaw ?? []) as {
        id: string;
        name: string;
        slug: string | null;
        status: NpcStatus;
      }[]
    ).map((o) => [o.id, o])
  );

  const headings = n.description ? extractHeadings(n.description) : [];

  const liveSet = n.twitch_username
    ? await getLiveStatuses([n.twitch_username])
    : new Set<string>();
  const isLive = n.twitch_username
    ? liveSet.has(n.twitch_username.toLowerCase())
    : false;

  // Effets d'accès au dossier SC292
  const hacking = await getHackingMode();
  const dossier: "target" | "closed" | null = /diego\s*suarez|eitan/i.test(
    n.name
  )
    ? "target"
    : n.status === "dead"
      ? "closed"
      : null;

  const ink = STATUS_INK[n.status];
  const rows: [string, string | null][] = [
    ["Âge", n.age != null ? String(n.age) : null],
    ["Quartier", n.neighborhood],
    ["Métier", n.occupation],
    ["Famille", n.family],
    ["Tél", n.phone_number],
  ];

  return (
    <div>
      <DossierAccess on={hacking} fileName={n.name} dossier={dossier} />

      {canEdit && (
        <div className="flex justify-end items-center gap-5 mb-6 flex-wrap">
          <LinkButton href={`/wiki/${n.slug ?? n.id}/edit`} variant="ghost">
            corriger la fiche
          </LinkButton>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteNpc(n.id);
            }}
            label="Déchirer la fiche"
          />
        </div>
      )}

      <Spread
        left={
          <div>
            <Sheet
              className="!pt-8"
              rotate="-0.8deg"
              label="Fiche signalétique"
              labelRight={`ouverte le ${typedDate(n.created_at, true)}`}
            >
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="relative w-[150px] sm:w-[140px] shrink-0">
                  <Photo
                    src={n.photo_url}
                    alt={n.name}
                    status={n.status}
                    className="w-full aspect-[132/166]"
                    corner={18}
                    live={isLive}
                    initial={n.name[0]}
                  />
                  <span
                    className="tape"
                    style={{
                      top: -9,
                      left: -14,
                      width: 56,
                      height: 20,
                      transform: "rotate(-27deg)",
                    }}
                  />
                  <p className="typed mt-2">Cliché · {typedDate(n.updated_at)}</p>
                  {n.status !== "alive" && (
                    <div className="absolute -left-2 top-[12%] z-10">
                      <StatusStamp status={n.status} rotate="-8deg" className="stamp--on-photo" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="print text-[28px] sm:text-[30px] font-semibold leading-[1.1]">
                    {n.name}
                  </h1>
                  <p
                    className="hand text-[21px] mt-0.5"
                    style={{
                      color: n.status === "alive" ? "var(--ink-soft)" : ink.tone,
                    }}
                  >
                    {n.status === "alive"
                      ? n.occupation ?? n.family ?? "en vie"
                      : ink.note}
                  </p>
                  <dl className="mt-3.5 font-typed text-[12.5px] leading-[1.95] text-typed-strong">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex gap-2 min-w-0">
                        <dt className="shrink-0 uppercase">
                          {k}
                          <span className="text-typed" aria-hidden>
                            {" "}
                            {".".repeat(Math.max(2, 10 - k.length))}
                          </span>
                        </dt>
                        <dd className="truncate">{v ?? "—"}</dd>
                      </div>
                    ))}
                    {n.twitch_username && (
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 uppercase">
                          Twitch
                          <span className="text-typed" aria-hidden>
                            {" "}
                            ....
                          </span>
                        </dt>
                        <dd className="truncate">
                          <a
                            href={`https://www.twitch.tv/${n.twitch_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-ink"
                          >
                            {n.twitch_username}
                          </a>
                          {isLive && (
                            <span className="text-pen-red"> · en direct</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {n.tags.length > 0 && (
                <>
                  <div className="sheet__rule mt-5" />
                  <p className="font-typed text-[12px] tracking-[0.1em] uppercase leading-[1.9] text-typed-strong">
                    {n.tags.join(" · ")}
                  </p>
                </>
              )}
            </Sheet>

            {n.status === "dead" && (
              <p
                className="hand text-pen-red text-[20px] leading-[26px] mt-6"
                style={{ transform: "rotate(-1deg)" }}
              >
                le coin noir, c&apos;est tout. pas de croix, pas de gris partout.
              </p>
            )}

            {headings.length > 0 && (
              <div className="mt-8">
                <div className="hand text-[24px] font-semibold hand-under inline-block">
                  dans cette fiche
                </div>
                <nav className="mt-2 hand text-[20px] leading-[30px]">
                  {headings.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      className="block text-ink-soft hover:text-ink"
                      style={{ paddingLeft: `${(h.level - 2) * 14}px` }}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {isLive && n.twitch_username && (
              <TwitchEmbed
                channel={n.twitch_username}
                className="mt-8"
                rotate="-0.8deg"
              />
            )}

            <PageNumber>3</PageNumber>
          </div>
        }
        right={
          <div>
            <h2 className="hand text-[30px] md:text-[32px] font-semibold leading-none">
              {n.status === "dead" ? "qui comptait" : "qui compte"}, et comment
            </h2>
            {rels.length === 0 ? (
              <p className="hand text-[21px] text-ink-faint mt-3">
                aucun lien noté pour l&apos;instant.
              </p>
            ) : (
              <ul className="mt-4 hand text-[21px] md:text-[23px] leading-[36px]">
                {rels.map((r) => {
                  const isSource = r.source_npc_id === n.id;
                  const otherId = isSource ? r.target_npc_id : r.source_npc_id;
                  const other = otherId ? otherMap.get(otherId) : null;
                  return (
                    <RelationLine
                      key={r.id}
                      type={r.type}
                      name={other ? other.name : "Eitan"}
                      href={
                        other ? `/wiki/${other.slug ?? other.id}` : "/wiki/eitan"
                      }
                      status={other?.status ?? "alive"}
                      description={r.description}
                    />
                  );
                })}
              </ul>
            )}
            <p className="hand text-[19px] text-ink-soft mt-4 max-w-[34ch]">
              chaque type de lien a son trait : plein, double, rayé.
            </p>

            <Sheet className="mt-8 !pt-8" rotate={(n.description?.length ?? 0) > 3000 ? "0.1deg" : "0.4deg"} label="Ce qu'on sait">
              {n.description ? (
                <div className="hk-redact-zone">
                  <MarkdownContent content={n.description} />
                </div>
              ) : (
                <p className="hand text-[21px] text-ink-faint">
                  rien de tapé pour l&apos;instant.
                </p>
              )}
            </Sheet>

            <div className="mt-8">
              <HistoryPanel entityType="npcs" entityId={n.id} />
            </div>

            <PageNumber align="right">4</PageNumber>
          </div>
        }
      />
    </div>
  );
}

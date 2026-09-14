import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import type { Character, NpcStatus, Relation } from "@/lib/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { getLiveStatuses } from "@/lib/twitch";
import { getHackingMode } from "@/lib/hacking";
import { DossierAccess } from "@/components/DossierAccess";
import { PageNumber, Photo, Sheet, Spread } from "@/components/paper";
import { RelationLine } from "@/components/RelationLine";
import { TwitchEmbed } from "@/components/TwitchEmbed";

export default async function EitanWikiPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = isAdmin(role);

  const [{ data }, { data: relsRaw }] = await Promise.all([
    supabase.from("character").select("*").eq("is_main", true).maybeSingle(),
    supabase.from("relations").select("*").is("source_npc_id", null),
  ]);

  const c = data as Character | null;

  if (!c) {
    return (
      <div className="py-20">
        <p className="hand text-[28px] text-ink-faint">page blanche.</p>
        <p className="hand text-[21px] text-ink-soft">
          ma fiche n&apos;existe pas encore.
        </p>
      </div>
    );
  }

  const rels = (relsRaw ?? []) as Relation[];
  const targetIds = Array.from(new Set(rels.map((r) => r.target_npc_id)));
  const { data: targetsRaw } = targetIds.length
    ? await supabase
        .from("npcs")
        .select("id, name, slug, status")
        .in("id", targetIds)
    : { data: [] };
  const targets = new Map(
    (
      (targetsRaw ?? []) as {
        id: string;
        name: string;
        slug: string | null;
        status: NpcStatus;
      }[]
    ).map((t) => [t.id, t])
  );
  // Les proches d'abord, puis par ordre alphabétique
  const ORDER = ["family", "friend", "romance", "mentor", "business", "contact", "colleague", "rival", "enemy", "other"];
  const sorted = [...rels].sort(
    (a, b) =>
      ORDER.indexOf(a.type) - ORDER.indexOf(b.type) ||
      (targets.get(a.target_npc_id)?.name ?? "").localeCompare(
        targets.get(b.target_npc_id)?.name ?? ""
      )
  );

  const liveSet = c.twitch_username
    ? await getLiveStatuses([c.twitch_username])
    : new Set<string>();
  const isLive = c.twitch_username
    ? liveSet.has(c.twitch_username.toLowerCase())
    : false;

  const hacking = await getHackingMode();
  const [first, ...rest] = c.name.split(" ");

  return (
    <div>
      <DossierAccess on={hacking} fileName={c.name} dossier="target" />

      {canEdit && (
        <div className="flex justify-end mb-6">
          <LinkButton href="/admin/character" variant="ghost">
            corriger ma fiche
          </LinkButton>
        </div>
      )}

      <Spread
        left={
          <div>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 items-start">
              <div className="w-[190px] sm:w-[216px] shrink-0" style={{ transform: "rotate(-1.4deg)" }}>
                <Photo
                  src={c.photo_url}
                  alt={c.name}
                  className="w-full aspect-[216/264]"
                  corner={24}
                  live={isLive}
                  initial="E"
                />
                <p className="typed mt-2">Cliché n° 004</p>
              </div>
              <div className="pt-1 min-w-0">
                <h1 className="hand text-[46px] sm:text-[52px] font-semibold leading-[0.95]">
                  {first}
                  {rest.length > 0 && (
                    <>
                      <br />
                      {rest.join(" ")}
                    </>
                  )}
                </h1>
                <div className="hand mt-3.5 text-[22px] leading-[31px]">
                  {c.age != null && <div>{c.age} ans</div>}
                  <div>Richman Lane</div>
                  {c.twitch_username && (
                    <div className="text-[19px] text-ink-soft">
                      <a
                        href={`https://www.twitch.tv/${c.twitch_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-2 underline-offset-4 hover:text-ink"
                      >
                        {c.twitch_username}
                      </a>
                      {isLive && <span className="text-pen-red"> (en direct)</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {c.traits && c.traits.length > 0 && (
              <Sheet
                className="mt-9 max-w-[420px] !pt-8"
                rotate="0.8deg"
                label="Traits — ce qu'on dit de moi"
              >
                <p className="font-typed text-[12.5px] leading-[2] uppercase tracking-[0.08em] text-typed-strong">
                  {c.traits.join(" · ")}
                </p>
              </Sheet>
            )}

            {isLive && c.twitch_username && (
              <TwitchEmbed channel={c.twitch_username} className="mt-9" rotate="-0.8deg" />
            )}

            <Sheet className="mt-9 !pt-8" rotate={(c.bio?.length ?? 0) > 2500 ? "-0.1deg" : "-0.6deg"} label="Ce que je veux bien en dire">
              {c.bio ? (
                <MarkdownContent content={c.bio} />
              ) : (
                <p className="hand text-[21px] text-ink-faint">rien de tapé.</p>
              )}
            </Sheet>

            <PageNumber>3</PageNumber>
          </div>
        }
        right={
          <div>
            <h2 className="hand text-[30px] md:text-[32px] font-semibold leading-none">
              qui je connais, et comment
            </h2>
            {sorted.length === 0 ? (
              <p className="hand text-[21px] text-ink-faint mt-3">
                personne de noté pour l&apos;instant.
              </p>
            ) : (
              <ul className="mt-4 hand text-[21px] md:text-[23px] leading-[36px]">
                {sorted.map((r) => {
                  const t = targets.get(r.target_npc_id);
                  if (!t) return null;
                  return (
                    <RelationLine
                      key={r.id}
                      type={r.type}
                      name={t.name}
                      href={`/wiki/${t.slug ?? t.id}`}
                      status={t.status}
                      description={r.description}
                    />
                  );
                })}
              </ul>
            )}
            <p className="hand text-[19px] text-ink-soft mt-4 max-w-[34ch]">
              chaque type de lien a son trait : plein, double, rayé. je
              n&apos;écris pas « intensité 4 ».
            </p>

            <Sheet className="mt-9 !pt-8" rotate={(c.background?.length ?? 0) > 2500 ? "0.1deg" : "0.6deg"} label="Famille & origines">
              {c.background ? (
                <MarkdownContent content={c.background} />
              ) : (
                <p className="hand text-[21px] text-ink-faint">rien de tapé.</p>
              )}
            </Sheet>

            <PageNumber align="right">4</PageNumber>
          </div>
        }
      />
    </div>
  );
}

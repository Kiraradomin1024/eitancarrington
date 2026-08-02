import { createClient } from "@/lib/supabase/server";
import { canContribute } from "@/lib/auth";
import { getCurrentUserAndRole } from "@/lib/auth";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { getLiveStatuses } from "@/lib/twitch";
import { TwitchLiveDot } from "@/components/TwitchLiveDot";
import Link from "next/link";



export default async function WikiPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data } = await supabase
    .from("npcs")
    .select("*")
    .order("name", { ascending: true });
  const npcs = (data ?? []) as Npc[];

  const { data: charData } = await supabase
    .from("character")
    .select("photo_url, twitch_username")
    .eq("is_main", true)
    .maybeSingle();
  const eitan = charData as
    | { photo_url: string | null; twitch_username: string | null }
    | null;
  const eitanPhoto = eitan?.photo_url ?? null;
  const eitanTwitch = eitan?.twitch_username ?? null;

  // Fetch live status for all Twitch usernames (Eitan + NPCs) — cached 60s
  const liveSet = await getLiveStatuses([
    eitanTwitch,
    ...npcs.map((n) => n.twitch_username),
  ]);
  const eitanLive = eitanTwitch
    ? liveSet.has(eitanTwitch.toLowerCase())
    : false;

  return (
    <div>
      <PageTitle
        title="Wiki"
        subtitle="Toutes les personnes qui croisent la route d'Eitan."
        action={
          canEdit && <LinkButton href="/wiki/new">Ajouter un perso</LinkButton>
        }
      />

      {/* Legend — explains the dots next to Twitch usernames */}
      <div className="flex flex-wrap items-center gap-4 mb-4 px-4 py-2.5 border border-border text-[11px] text-muted">
        <span className="meta-label">Légende</span>
        <span className="inline-flex items-center gap-1.5">
          <TwitchLiveDot isLive={true} size={9} />
          <span>En live sur GTA RP</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TwitchLiveDot isLive={false} size={9} />
          <span>Hors ligne / pas en RP</span>
        </span>
      </div>

      {/* Eitan — main character card */}
      <div className="border border-border p-5 mb-6 flex gap-4 items-center hover:border-accent/60 transition-colors relative">
        <Link
          href="/wiki/eitan"
          aria-label="Eitan Carrington"
          className="absolute inset-0 z-0"
        />
        {eitanPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={eitanPhoto}
            alt="Eitan Carrington"
            className="w-14 h-14 object-cover border border-border-strong shrink-0 pointer-events-none relative"
          />
        ) : (
          <span className="w-14 h-14 border border-border-strong flex items-center justify-center text-accent font-display text-2xl shrink-0 pointer-events-none relative">
            E
          </span>
        )}
        <div className="flex-1 min-w-0 pointer-events-none relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl text-foreground">
              Eitan Carrington
            </span>
            {eitanTwitch && (
              <a
                href={`https://www.twitch.tv/${eitanTwitch}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-accent-2 hover:underline whitespace-nowrap pointer-events-auto relative z-10"
                title={
                  eitanLive
                    ? `${eitanTwitch} est en live sur GTA V — clique pour aller sur sa chaîne`
                    : `Aller sur la chaîne Twitch de ${eitanTwitch}`
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3 h-3 shrink-0"
                  aria-hidden
                >
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                </svg>
                <span className="text-xs">{eitanTwitch}</span>
                <TwitchLiveDot isLive={eitanLive} size={7} />
              </a>
            )}
          </div>
          <div className="text-xs text-muted">
            Personnage principal — voir la fiche complète
          </div>
        </div>
      </div>

      {npcs.length === 0 ? (
        <Empty>Aucun personnage pour le moment.</Empty>
      ) : (
        <div className="hairline-grid grid-cols-2 lg:grid-cols-4">
          {npcs.map((n) => {
            const isLiveNpc = n.twitch_username
              ? liveSet.has(n.twitch_username.toLowerCase())
              : false;
            const statusTone =
              n.status === "alive"
                ? "text-success"
                : n.status === "missing"
                  ? "text-danger"
                  : "text-muted";
            return (
              <div key={n.id} className="relative group">
                <Link
                  href={`/wiki/${n.slug ?? n.id}`}
                  aria-label={n.name}
                  className="absolute inset-0 z-0"
                />
                <div className="px-4 pt-4 pb-5 md:px-6 md:pt-6 md:pb-7 pointer-events-none relative">
                  <span
                    className={
                      "relative block w-full aspect-square overflow-hidden mb-5 " +
                      (n.status === "dead" ? "memorial" : "")
                    }
                  >
                    {n.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.photo_url}
                        alt={n.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full bg-surface-2 flex items-center justify-center meta-label">
                        portrait
                      </span>
                    )}
                  </span>

                  <div className="font-display text-lg md:text-xl leading-tight text-foreground">
                    {n.name}
                  </div>
                  <div className="text-xs text-muted mt-1.5 truncate">
                    {n.occupation ?? n.family ?? n.neighborhood ?? "—"}
                  </div>

                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <span
                      className={
                        "text-[10px] uppercase tracking-[0.24em] " + statusTone
                      }
                    >
                      {STATUS_LABELS[n.status]}
                    </span>
                    {n.twitch_username && (
                      <a
                        href={`https://www.twitch.tv/${n.twitch_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-accent hover:underline whitespace-nowrap min-w-0 pointer-events-auto relative z-10 text-[10px] uppercase tracking-[0.18em]"
                        title={
                          isLiveNpc
                            ? `${n.twitch_username} est en live sur GTA V`
                            : `Chaîne Twitch de ${n.twitch_username}`
                        }
                      >
                        <TwitchLiveDot isLive={isLiveNpc} size={6} />
                        <span className="truncate">
                          {isLiveNpc ? "en direct" : n.twitch_username}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

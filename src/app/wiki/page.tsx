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
    .select("photo_url")
    .eq("is_main", true)
    .maybeSingle();
  const eitanPhoto = (charData as { photo_url: string | null } | null)?.photo_url;

  // Fetch live status for all NPCs that have a Twitch username (cached 60s)
  const liveSet = await getLiveStatuses(npcs.map((n) => n.twitch_username));

  return (
    <div>
      <PageTitle
        title="Wiki"
        subtitle="Toutes les personnes qui croisent la route d'Eitan."
        action={
          canEdit && <LinkButton href="/wiki/new">Ajouter un perso</LinkButton>
        }
      />

      {/* Eitan — main character card */}
      <Link
        href="/wiki/eitan"
        className="card card-glow p-5 mb-6 flex gap-4 items-center hover:border-accent/60 transition-colors block"
      >
        {eitanPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={eitanPhoto}
            alt="Eitan Carrington"
            className="w-14 h-14 rounded-full object-cover border-2 border-accent/30 shadow-md shrink-0"
          />
        ) : (
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-accent via-accent-2 to-accent-3 flex items-center justify-center text-white font-display text-2xl shadow-md shrink-0">
            E
          </span>
        )}
        <div>
          <div className="font-display text-xl text-foreground">
            Eitan Carrington
          </div>
          <div className="text-xs text-muted">
            Personnage principal — voir la fiche complète
          </div>
        </div>
      </Link>

      {npcs.length === 0 ? (
        <Empty>Aucun personnage pour le moment.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {npcs.map((n) => (
            <Link
              key={n.id}
              href={`/wiki/${n.id}`}
              className="card p-5 hover:border-accent/60 transition-colors block"
            >
              <div className="flex gap-4">
                {n.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.photo_url}
                    alt={n.name}
                    className="w-16 h-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center font-serif text-accent text-2xl">
                    {n.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-xl text-foreground truncate">
                    {n.name}
                  </div>
                  <div className="text-xs text-muted italic">
                    {n.occupation ?? n.family ?? n.neighborhood ?? "—"}
                  </div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-2">
                    <span>{STATUS_LABELS[n.status]}</span>
                    {n.twitch_username && (
                      <span
                        className="inline-flex items-center gap-1 text-accent whitespace-nowrap min-w-0"
                        title={
                          liveSet.has(n.twitch_username.toLowerCase())
                            ? `${n.twitch_username} est en live sur Twitch !`
                            : `Joué par ${n.twitch_username} sur Twitch`
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
                        <span className="truncate">{n.twitch_username}</span>
                        <TwitchLiveDot
                          isLive={liveSet.has(n.twitch_username.toLowerCase())}
                          size={7}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {n.description && (
                <p className="text-sm text-foreground/75 mt-3 line-clamp-2">
                  {n.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

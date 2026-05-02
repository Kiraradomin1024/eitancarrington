import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Card, LinkButton, PageTitle, Badge } from "@/components/ui";
import type { Character } from "@/lib/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { getLiveStatuses } from "@/lib/twitch";
import { TwitchLiveDot } from "@/components/TwitchLiveDot";



export default async function EitanWikiPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = isAdmin(role);

  const { data } = await supabase
    .from("character")
    .select("*")
    .eq("is_main", true)
    .maybeSingle();

  const c = data as Character | null;

  if (!c) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="font-hand text-2xl text-accent mb-2">pas encore créé</p>
        <p className="text-sm">La fiche d&apos;Eitan n&apos;existe pas encore.</p>
      </div>
    );
  }

  // Twitch live status (cached 60s server-side)
  const liveSet = c.twitch_username
    ? await getLiveStatuses([c.twitch_username])
    : new Set<string>();
  const isLive = c.twitch_username
    ? liveSet.has(c.twitch_username.toLowerCase())
    : false;

  return (
    <div>
      <PageTitle
        title={c.name}
        scribble="fiche principale"
        action={
          canEdit && (
            <LinkButton href="/admin/character" variant="ghost">
              Modifier la fiche
            </LinkButton>
          )
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            {c.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.photo_url}
                alt={c.name}
                className="w-full aspect-square object-cover rounded mb-4 border border-border"
              />
            ) : (
              <div className="w-full aspect-square rounded bg-surface-2 border border-border flex items-center justify-center font-serif text-accent text-7xl mb-4">
                {c.name[0]}
              </div>
            )}
            <dl className="text-sm space-y-2">
              <InfoRow k="Nom complet" v={c.name} />

              <InfoRow k="Statut" v="En vie" />
              {c.twitch_username && (
                <div className="flex justify-between gap-4 border-b border-border/50 pb-1">
                  <dt className="text-muted">Streamer</dt>
                  <dd className="min-w-0">
                    <a
                      href={`https://www.twitch.tv/${c.twitch_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent hover:text-accent-2 hover:underline whitespace-nowrap max-w-full"
                      title={
                        isLive
                          ? `${c.twitch_username} est en live !`
                          : `Voir la chaîne de ${c.twitch_username}`
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 shrink-0"
                        aria-hidden
                      >
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                      </svg>
                      <span className="truncate">{c.twitch_username}</span>
                      <TwitchLiveDot isLive={isLive} size={9} />
                      {isLive && (
                        <span className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-bold">
                          Live
                        </span>
                      )}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {c.traits && c.traits.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.traits.map((t) => (
                  <Badge key={t} tone="accent">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h2 className="font-display text-2xl text-accent mb-3 title-rule">
              Biographie
            </h2>
            {c.bio ? (
              <MarkdownContent content={c.bio} />
            ) : (
              <p className="text-muted italic">Aucune biographie.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-accent mb-3 title-rule">
              Famille &amp; origines
            </h2>
            {c.background ? (
              <MarkdownContent content={c.background} />
            ) : (
              <p className="text-muted italic">Aucun historique.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1">
      <dt className="text-muted">{k}</dt>
      <dd className="text-foreground text-right">{v}</dd>
    </div>
  );
}

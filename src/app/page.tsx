import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import type { Character } from "@/lib/types";
import { getLiveStatuses } from "@/lib/twitch";
import { TwitchLiveDot } from "@/components/TwitchLiveDot";
import { TwitchEmbed } from "@/components/TwitchEmbed";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("character")
    .select("*")
    .eq("is_main", true)
    .maybeSingle();

  const c = data as Character | null;

  const [{ count: npcCount }, { data: maxDayRow }, { count: invCount }] =
    await Promise.all([
      supabase.from("npcs").select("*", { count: "exact", head: true }),
      supabase
        .from("days")
        .select("day_number")
        .not("day_number", "is", null)
        .order("day_number", { ascending: false })
        .limit(1),
      supabase
        .from("investigations")
        .select("*", { count: "exact", head: true }),
    ]);
  const latestDay = (maxDayRow?.[0] as { day_number: number } | undefined)?.day_number ?? 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: string | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = p?.role ?? null;
  }
  const canEdit = role === "admin";

  // Twitch live status for Eitan's streamer (cached 60s server-side)
  const liveSet = c?.twitch_username
    ? await getLiveStatuses([c.twitch_username])
    : new Set<string>();
  const isLive = c?.twitch_username
    ? liveSet.has(c.twitch_username.toLowerCase())
    : false;

  return (
    <div className="space-y-20">
      {/* Hero — dossier ouvert : identité à gauche, cliché à droite */}
      <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-11 lg:gap-16 pt-4 md:pt-6 pb-4 items-start">
        <div>
          <p className="eyebrow mb-7">
            Dossier n° EC-021 · Richman Lane, Los Santos
          </p>

          <h1 className="font-display font-light text-[44px] md:text-6xl lg:text-7xl tracking-tight leading-[1] text-balance">
            {c?.name ?? "Eitan Carrington"}
          </h1>

          <div className="w-16 h-px bg-border-strong my-6 md:my-7" />

          <p className="text-[17px] md:text-lg text-muted leading-relaxed max-w-[52ch]">
            {c?.age ? `${c.age} ans, ` : "21 ans, "}
            dernier des Carrington. Ce dossier rassemble ce qu&apos;il reste :
            les gens, les nuits, les dettes et les questions sans réponse.
          </p>

          <div className="flex gap-3 mt-8 md:mt-9 flex-col sm:flex-row sm:flex-wrap">
            <LinkButton href="/journal" variant="primary">
              Ouvrir le journal
            </LinkButton>
            <LinkButton href="/wiki" variant="ghost">
              Les personnages
            </LinkButton>
            {canEdit && (
              <LinkButton href="/admin/character" variant="ghost">
                Modifier la fiche
              </LinkButton>
            )}
          </div>

          {/* Stats en grille à filets */}
          <div className="hairline-grid grid-cols-3 mt-12 md:mt-14">
            <StatCard href="/wiki" label="Personnages" value={npcCount ?? 0} />
            <StatCard href="/journal" label="Jours passés" value={latestDay} />
            <StatCard href="/enquetes" label="Enquêtes" value={invCount ?? 0} />
          </div>
        </div>

        {/* Cliché encadré */}
        <div>
          <div className="border border-border p-3.5 bg-surface-2">
            {c?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.photo_url}
                alt={c.name}
                className="w-full aspect-[4/5] object-cover"
              />
            ) : (
              <div className="w-full aspect-[4/5] bg-background flex items-center justify-center meta-label">
                photo · eitan carrington
              </div>
            )}
            <div className="flex justify-between items-center pt-3.5 px-1 meta-label">
              <span>Cliché n° 004</span>
              {c?.twitch_username && (
                <a
                  href={`https://www.twitch.tv/${c.twitch_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    "inline-flex items-center gap-1.5 tracking-[0.22em] transition-colors " +
                    (isLive
                      ? "text-accent"
                      : "text-muted hover:text-accent")
                  }
                  title={
                    isLive
                      ? `${c.twitch_username} est en live !`
                      : `Voir la chaîne de ${c.twitch_username}`
                  }
                >
                  <TwitchLiveDot isLive={isLive} size={7} />
                  {isLive ? "en direct" : c.twitch_username}
                </a>
              )}
            </div>
          </div>

          {/* Traits */}
          {c?.traits && c.traits.length > 0 && (
            <div className="mt-9 border-t border-border pt-5">
              <p className="meta-label mb-4">Traits</p>
              <div className="flex flex-wrap gap-2">
                {c.traits.map((t, i) => (
                  <span
                    key={i}
                    className="border border-border px-3 py-1.5 text-xs text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Twitch live embed */}
      {isLive && c?.twitch_username && (
        <section>
          <TwitchEmbed channel={c.twitch_username} />
        </section>
      )}

      {/* Bio + Famille */}
      <section className="border-t border-border pt-11 md:pt-14 grid md:grid-cols-2 gap-px bg-border border-x border-b border-border">
        <div className="bg-background p-6 md:p-8">
          <p className="meta-label mb-4">Qui je suis</p>
          <h2 className="font-display font-light text-[28px] md:text-3xl mb-5 md:mb-6">Biographie</h2>
          <p className="text-muted leading-[1.85] whitespace-pre-line max-w-[52ch]">
            {c?.bio ??
              "Dernier né de la famille Carrington. Vit à Richman Lane mais ne se reconnait pas dans les délires de sa famille et des autres bourgeois du quartier."}
          </p>
        </div>
        <div className="bg-background p-6 md:p-8">
          <p className="meta-label mb-4">D&apos;où je viens</p>
          <h2 className="font-display font-light text-[28px] md:text-3xl mb-5 md:mb-6">
            Famille &amp; origines
          </h2>
          <p className="text-muted leading-[1.85] whitespace-pre-line max-w-[52ch]">
            {c?.background ??
              "Famille juive aisée. Mère : Blair Carrington. Frère : Elias Carrington."}
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link href={href} className="block px-3.5 py-4 md:px-5 md:py-6 group">
      <div className="font-display font-light text-[30px] md:text-4xl text-accent leading-none">
        {value}
      </div>
      <div className="meta-label mt-2.5 group-hover:text-foreground transition-colors">
        {label}
      </div>
    </Link>
  );
}

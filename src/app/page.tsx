import { createClient } from "@/lib/supabase/server";
import type { Character } from "@/lib/types";
import { getLiveStatuses } from "@/lib/twitch";
import { TwitchEmbed } from "@/components/TwitchEmbed";
import { PageNumber, Photo, Sheet, Spread } from "@/components/paper";
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

  const [
    { count: npcCount },
    { data: maxDayRow },
    { count: openInvCount },
    { data: { user } },
  ] = await Promise.all([
    supabase.from("npcs").select("*", { count: "exact", head: true }),
    supabase
      .from("days")
      .select("day_number")
      .not("day_number", "is", null)
      .order("day_number", { ascending: false })
      .limit(1),
    supabase
      .from("investigations")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase.auth.getUser(),
  ]);
  const latestDay =
    (maxDayRow?.[0] as { day_number: number } | undefined)?.day_number ?? 0;

  let canEdit = false;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    canEdit = p?.role === "admin";
  }

  // Statut Twitch d'Eitan (mis en cache côté serveur)
  const liveSet = c?.twitch_username
    ? await getLiveStatuses([c.twitch_username])
    : new Set<string>();
  const isLive = c?.twitch_username
    ? liveSet.has(c.twitch_username.toLowerCase())
    : false;

  const name = c?.name ?? "Eitan Carrington";
  const [first, ...rest] = name.split(" ");
  const age = c?.age ?? 24;

  const bioParas = (
    c?.bio ??
    "Dernier né de la famille Carrington. Vit à Richman Lane mais ne se reconnait pas dans les délires de sa famille et des autres bourgeois du quartier."
  )
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const familyLines = (
    c?.background ??
    "Famille juive aisée. Mère : Blair Carrington. Frère : Elias Carrington."
  )
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <Spread
      left={
        <div className="relative">
          <span className="label-kraft">N° EC-021 · Richman Lane, Los Santos</span>

          <div className="hand mt-5 text-ink">
            <div className="text-[58px] sm:text-[78px] leading-[0.9] font-semibold">
              {first}
            </div>
            {rest.length > 0 && (
              <div className="text-[42px] sm:text-[58px] leading-none font-medium ml-1.5">
                {rest.join(" ")}
              </div>
            )}
          </div>
          <p className="hand mt-3.5 text-[21px] sm:text-[24px] leading-[1.38] max-w-[23ch]">
            {age} ans. Je note tout ici parce que je finis toujours par oublier
            qui me devait quoi.
          </p>

          <div className="mt-9 flex gap-6 sm:gap-10 items-start">
            <div className="w-[132px] sm:w-[212px] shrink-0" style={{ transform: "rotate(-1.8deg)" }}>
              <Photo
                src={c?.photo_url}
                alt={name}
                className="aspect-[212/252] w-full"
                corner={26}
                fourCorners
                live={isLive}
                initial="E"
              />
              <p className="typed mt-2">Cliché n° 004</p>
            </div>

            <div className="hand text-ink pt-1">
              <Counter href="/wiki" value={npcCount ?? 0} label="personnes que je croise" />
              <Counter href="/journal" value={latestDay} label="jours notés" />
              <Counter
                href="/enquetes"
                value={openInvCount ?? 0}
                label="enquêtes en cours"
                red
              />
            </div>
          </div>

          <PageNumber>1</PageNumber>
        </div>
      }
      right={
        <div className="relative">
          {canEdit && (
            <div className="mb-4 text-right">
              <Link
                href="/admin/character"
                className="hand text-[20px] text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
              >
                corriger ma fiche
              </Link>
            </div>
          )}

          {isLive && c?.twitch_username ? (
            <div className="relative lg:flex lg:items-start lg:gap-5">
              <p
                className="hand hidden lg:block text-[19px] leading-[25px] text-ink-soft w-[150px] shrink-0 mt-10"
                style={{ transform: "rotate(-1.6deg)" }}
              >
                le stream s&apos;ouvre ici, dans la page →
              </p>
              <TwitchEmbed channel={c.twitch_username} className="lg:ml-auto lg:w-[340px]" />
            </div>
          ) : (
            c?.twitch_username && (
              <p
                className="hand text-[20px] leading-snug text-ink-soft max-w-[30ch]"
                style={{ transform: "rotate(-1.2deg)" }}
              >
                pas en ligne ce soir.{" "}
                <a
                  href={`https://www.twitch.tv/${c.twitch_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-2 underline-offset-4 hover:text-ink"
                >
                  sa chaîne, {c.twitch_username}
                </a>
              </p>
            )
          )}

          <p
            className="hand text-pen-red text-[20px] leading-[26px] max-w-[16ch] mt-7 lg:mt-8"
            style={{ transform: "rotate(-2.4deg)" }}
          >
            relire ça un jour, c&apos;est trop propre
          </p>

          <Sheet
            className="mt-3 lg:mr-10 !pt-8"
            rotate="-0.7deg"
            label="Ce que je veux bien en dire"
          >
            {bioParas.map((p, i) => (
              <p
                key={i}
                className="print text-[16.5px] leading-[1.78] max-w-[48ch] mb-3 last:mb-0 whitespace-pre-line"
              >
                {p}
              </p>
            ))}
          </Sheet>

          <div className="hand mt-10">
            <div className="text-[26px] font-semibold hand-under inline-block">
              la famille
            </div>
            <div className="mt-3 flex flex-col sm:flex-row items-start gap-5 sm:gap-7">
              <div className="text-[22px] leading-[30px] max-w-[30ch]">
                {familyLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
              <div className="typed leading-[1.9] sm:border-l sm:border-[color:var(--sheet-rule)] sm:pl-4 shrink-0">
                voir aussi
                <br />·{" "}
                <Link href="/wiki/eitan" className="hover:text-ink">
                  ma fiche
                </Link>
                <br />·{" "}
                <Link href="/mindmap" className="hover:text-ink">
                  comment tout se tient
                </Link>
              </div>
            </div>
          </div>

          <PageNumber align="right">2</PageNumber>
        </div>
      }
    />
  );
}

function Counter({
  href,
  value,
  label,
  red = false,
}: {
  href: string;
  value: number;
  label: string;
  red?: boolean;
}) {
  return (
    <Link href={href} className="block mb-4 sm:mb-5 group">
      <span
        className={
          "text-[34px] sm:text-[46px] font-semibold leading-none border-b-2 " +
          (red ? "text-pen-red border-pen-red" : "border-ink")
        }
      >
        {value}
      </span>
      <span className="block text-[17px] sm:text-[21px] text-ink-soft mt-0.5 leading-tight group-hover:text-ink">
        {label}
      </span>
    </Link>
  );
}

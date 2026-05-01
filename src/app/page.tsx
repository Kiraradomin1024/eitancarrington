import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import type { Character } from "@/lib/types";
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

  const [{ count: npcCount }, { count: dayCount }, { count: invCount }] =
    await Promise.all([
      supabase.from("npcs").select("*", { count: "exact", head: true }),
      supabase.from("days").select("*", { count: "exact", head: true }),
      supabase
        .from("investigations")
        .select("*", { count: "exact", head: true }),
    ]);

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

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative pt-8 pb-16">
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-gradient-to-br from-accent/30 via-accent-2/20 to-accent-3/20 rounded-full blur-3xl opacity-50" />
        </div>

        <p className="font-hand text-2xl text-accent text-center mb-4">
          journal personnel
        </p>

        {c?.photo_url && (
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.photo_url}
              alt={c.name}
              className="w-40 h-40 rounded-full object-cover border-4 border-surface shadow-xl ring-2 ring-accent/30"
            />
          </div>
        )}

        <h1 className="font-display text-5xl md:text-7xl text-center tracking-tight leading-[1.05]">
          {c?.name ?? "Eitan Carrington"}
        </h1>

        <p className="text-center mt-6 text-muted max-w-xl mx-auto leading-relaxed">
          {c?.age ? `${c.age} ans, ` : "21 ans, "}
          dernier des Carrington. Né dans la dorure de Richman Lane,
          mais ailleurs en tête.
        </p>

        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          <LinkButton href="/journal" variant="gradient">
            Lire le journal
          </LinkButton>
          <LinkButton href="/wiki" variant="ghost">
            Les gens autour
          </LinkButton>
          {canEdit && (
            <LinkButton href="/admin/character" variant="ghost">
              Modifier la fiche
            </LinkButton>
          )}
        </div>
      </section>

      {/* Bio + Famille */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card glow>
          <p className="font-hand text-xl text-accent mb-2">qui je suis</p>
          <h2 className="font-display text-2xl mb-4 title-rule">Biographie</h2>
          <p className="text-foreground/85 leading-relaxed whitespace-pre-line">
            {c?.bio ??
              "Dernier né de la famille Carrington. Vit à Richman Lane mais ne se reconnait pas dans les délires de sa famille et des autres bourgeois du quartier."}
          </p>
        </Card>
        <Card glow>
          <p className="font-hand text-xl text-accent mb-2">d&apos;où je viens</p>
          <h2 className="font-display text-2xl mb-4 title-rule">
            Famille &amp; origines
          </h2>
          <p className="text-foreground/85 leading-relaxed whitespace-pre-line">
            {c?.background ??
              "Famille juive aisée. Mère : Blair Carrington. Frère : Elias Carrington."}
          </p>
        </Card>
      </section>

      {/* Traits */}
      {c?.traits && c.traits.length > 0 && (
        <section>
          <p className="font-hand text-xl text-accent mb-1">en trois mots</p>
          <h2 className="font-display text-2xl mb-4 title-rule">Traits</h2>
          <div className="flex flex-wrap gap-2">
            {c.traits.map((t, i) => (
              <span
                key={i}
                className="px-4 py-1.5 rounded-full bg-surface/60 backdrop-blur border border-border text-foreground text-sm shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="grid md:grid-cols-3 gap-4">
        <StatCard
          href="/wiki"
          label="Personnages"
          value={npcCount ?? 0}
          tagline="dans son entourage"
        />
        <StatCard
          href="/journal"
          label="Jours documentés"
          value={dayCount ?? 0}
          tagline="passés à Los Santos"
        />
        <StatCard
          href="/enquetes"
          label="Enquêtes"
          value={invCount ?? 0}
          tagline="sur la table"
        />
      </section>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  tagline,
}: {
  href: string;
  label: string;
  value: number;
  tagline: string;
}) {
  return (
    <Link href={href} className="card card-glow p-6 text-center block group">
      <div className="font-display text-5xl text-gradient leading-none">
        {value}
      </div>
      <div className="text-foreground mt-3 font-medium">{label}</div>
      <div className="text-base text-muted font-hand mt-1">{tagline}</div>
    </Link>
  );
}

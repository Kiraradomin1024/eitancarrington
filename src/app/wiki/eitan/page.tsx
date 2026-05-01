import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Card, LinkButton, PageTitle, Badge } from "@/components/ui";
import type { Character } from "@/lib/types";
import { MarkdownContent } from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

export default async function EitanWikiPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

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
              <InfoRow k="Âge" v={c.age ? `${c.age} ans` : "—"} />
              <InfoRow k="Statut" v="En vie" />
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

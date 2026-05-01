import { createClient } from "@/lib/supabase/server";
import { canContribute } from "@/lib/auth";
import { getCurrentUserAndRole } from "@/lib/auth";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <div>
      <PageTitle
        title="Wiki"
        subtitle="Toutes les personnes qui croisent la route d'Eitan."
        action={
          canEdit && <LinkButton href="/wiki/new">Ajouter un perso</LinkButton>
        }
      />

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
                  <div className="text-xs text-muted mt-1">
                    {STATUS_LABELS[n.status]}
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

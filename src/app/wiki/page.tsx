import { createClient } from "@/lib/supabase/server";
import { canContribute } from "@/lib/auth";
import { getCurrentUserAndRole } from "@/lib/auth";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
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
                        className="inline-flex items-center gap-1 text-accent"
                        title={`Joué par ${n.twitch_username} sur Twitch`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3 h-3"
                          aria-hidden
                        >
                          <path d="M4.265 3 3 6.236v12.5h4.471V21h2.5l2.265-2.265h3.529L21 13.736V3H4.265zm15.118 10.029-2.265 2.265h-3.529L11.324 17.56v-2.265H7.794V4.471h11.589v8.558zM16.882 7.471v4.823h-1.588V7.47h1.588zm-3.529 0v4.823h-1.589V7.47h1.589z" />
                        </svg>
                        {n.twitch_username}
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

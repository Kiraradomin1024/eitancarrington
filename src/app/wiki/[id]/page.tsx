import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Badge, Card, LinkButton, PageTitle } from "@/components/ui";
import { MarkdownContent, extractHeadings } from "@/components/MarkdownContent";
import type { Npc, Relation } from "@/lib/types";
import { RELATION_LABELS, STATUS_LABELS } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteNpc } from "../actions";



export default async function NpcDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = isAdmin(role);

  const { data: npc } = await supabase
    .from("npcs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!npc) notFound();
  const n = npc as Npc;

  const { data: relsRaw } = await supabase
    .from("relations")
    .select("*")
    .or(`source_npc_id.eq.${id},target_npc_id.eq.${id}`);
  const rels = (relsRaw ?? []) as Relation[];

  const otherIds = Array.from(
    new Set(
      rels
        .flatMap((r) => [r.source_npc_id, r.target_npc_id])
        .filter((x): x is string => !!x && x !== id)
    )
  );
  const { data: othersRaw } = otherIds.length
    ? await supabase.from("npcs").select("id, name").in("id", otherIds)
    : { data: [] };
  const otherMap = new Map(
    (othersRaw ?? []).map((o: { id: string; name: string }) => [o.id, o.name])
  );

  // Extract table of contents from description
  const headings = n.description ? extractHeadings(n.description) : [];

  return (
    <div>
      <PageTitle
        title={n.name}
        subtitle={n.occupation ?? n.family ?? undefined}
        action={
          canEdit && (
            <div className="flex gap-2">
              <LinkButton href={`/wiki/${id}/edit`} variant="ghost">
                Modifier
              </LinkButton>
              <DeleteButton
                action={async () => {
                  "use server";
                  await deleteNpc(id);
                }}
                label="Supprimer"
              />
            </div>
          )
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar — photo, infos, TOC */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            {n.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.photo_url}
                alt={n.name}
                className="w-full aspect-square object-cover rounded mb-4 border border-border"
              />
            ) : (
              <div className="w-full aspect-square rounded bg-surface-2 border border-border flex items-center justify-center font-serif text-accent text-7xl mb-4">
                {n.name[0]}
              </div>
            )}
            <dl className="text-sm space-y-2">
              <Row k="Statut" v={STATUS_LABELS[n.status]} />

              <Row k="Famille" v={n.family ?? "—"} />
              <Row k="Quartier" v={n.neighborhood ?? "—"} />
              <Row k="Occupation" v={n.occupation ?? "—"} />
              {n.twitch_username && (
                <div className="flex justify-between gap-4 border-b border-border/50 pb-1">
                  <dt className="text-muted">Streamer</dt>
                  <dd className="text-right">
                    <a
                      href={`https://www.twitch.tv/${n.twitch_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-2 link-fancy"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                        aria-hidden
                      >
                        <path d="M4.265 3 3 6.236v12.5h4.471V21h2.5l2.265-2.265h3.529L21 13.736V3H4.265zm15.118 10.029-2.265 2.265h-3.529L11.324 17.56v-2.265H7.794V4.471h11.589v8.558zM16.882 7.471v4.823h-1.588V7.47h1.588zm-3.529 0v4.823h-1.589V7.47h1.589z" />
                      </svg>
                      {n.twitch_username}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {n.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Table of contents */}
          {headings.length > 0 && (
            <Card>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Sommaire
              </h3>
              <nav className="space-y-1">
                {headings.map((h, i) => (
                  <a
                    key={i}
                    href={`#${h.id}`}
                    className="block text-sm text-muted hover:text-accent transition-colors link-fancy"
                    style={{ paddingLeft: `${(h.level - 2) * 12}px` }}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </Card>
          )}
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h2 className="font-display text-2xl text-accent mb-3 title-rule">
              Description
            </h2>
            {n.description ? (
              <MarkdownContent content={n.description} />
            ) : (
              <p className="text-muted italic">Aucune description.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-accent mb-3 title-rule">
              Liens ({rels.length})
            </h2>
            {rels.length === 0 ? (
              <p className="text-muted italic">Aucune relation enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {rels.map((r) => {
                  const isSource = r.source_npc_id === id;
                  const otherId = isSource ? r.target_npc_id : r.source_npc_id;
                  const otherName = otherId
                    ? otherMap.get(otherId) ?? "Inconnu"
                    : "Eitan Carrington";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-surface-2"
                    >
                      <Badge tone="accent">{RELATION_LABELS[r.type]}</Badge>
                      {otherId ? (
                        <Link
                          href={`/wiki/${otherId}`}
                          className="text-foreground hover:text-foreground"
                        >
                          {otherName}
                        </Link>
                      ) : (
                        <Link
                          href="/wiki/eitan"
                          className="text-foreground hover:underline"
                        >
                          Eitan
                        </Link>
                      )}
                      {r.description && (
                        <span className="text-muted text-sm italic ml-2">
                          — {r.description}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1">
      <dt className="text-muted">{k}</dt>
      <dd className="text-foreground text-right">{v}</dd>
    </div>
  );
}

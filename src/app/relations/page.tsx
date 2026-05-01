import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import type { Npc, Relation } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { RelationForm } from "@/components/RelationForm";
import { DeleteButton } from "@/components/DeleteButton";
import { createRelation, deleteRelation } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RelationsPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const [{ data: rels }, { data: npcs }] = await Promise.all([
    supabase
      .from("relations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("npcs").select("id, name").order("name"),
  ]);

  const relations = (rels ?? []) as Relation[];
  const npcList = (npcs ?? []) as Pick<Npc, "id" | "name">[];
  const npcMap = new Map(npcList.map((n) => [n.id, n.name]));

  return (
    <div>
      <PageTitle
        title="Relations"
        subtitle="Liens entre Eitan et son entourage, ou entre les personnages eux-mêmes."
      />

      {canEdit && (
        <div className="mb-8">
          <h2 className="font-serif text-xl text-accent mb-3">
            Ajouter une relation
          </h2>
          <RelationForm npcs={npcList} action={createRelation} />
        </div>
      )}

      {relations.length === 0 ? (
        <Empty>Aucune relation enregistrée.</Empty>
      ) : (
        <div className="space-y-2">
          {relations.map((r) => {
            const sourceName = r.source_npc_id
              ? npcMap.get(r.source_npc_id) ?? "?"
              : "Eitan";
            const targetName = npcMap.get(r.target_npc_id) ?? "?";
            return (
              <Card key={r.id} className="!p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <NameLink id={r.source_npc_id} name={sourceName} />
                  <span className="text-muted">→</span>
                  <NameLink id={r.target_npc_id} name={targetName} />
                  <Badge tone="accent">{RELATION_LABELS[r.type]}</Badge>
                  {r.intensity !== 0 && (
                    <Badge tone={r.intensity > 0 ? "ok" : "danger"}>
                      {r.intensity > 0 ? "+" : ""}
                      {r.intensity}
                    </Badge>
                  )}
                  {r.description && (
                    <span className="text-muted text-sm italic">
                      — {r.description}
                    </span>
                  )}
                  {canEdit && (
                    <div className="ml-auto">
                      <DeleteButton
                        action={async () => {
                          "use server";
                          await deleteRelation(r.id);
                        }}
                        label="×"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NameLink({ id, name }: { id: string | null; name: string }) {
  if (!id)
    return (
      <Link href="/" className="text-foreground hover:underline font-medium">
        {name}
      </Link>
    );
  return (
    <Link
      href={`/wiki/${id}`}
      className="text-foreground hover:text-foreground"
    >
      {name}
    </Link>
  );
}

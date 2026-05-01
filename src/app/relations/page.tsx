import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Empty, PageTitle } from "@/components/ui";
import type { Npc, Relation } from "@/lib/types";
import { RelationForm } from "@/components/RelationForm";
import { EditableRelationRow } from "@/components/EditableRelationRow";
import { createRelation, deleteRelation, updateRelation } from "./actions";

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
              <EditableRelationRow
                key={r.id}
                relation={r}
                sourceName={sourceName}
                targetName={targetName}
                npcs={npcList}
                canEdit={canEdit}
                updateAction={updateRelation.bind(null, r.id)}
                deleteAction={deleteRelation.bind(null, r.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

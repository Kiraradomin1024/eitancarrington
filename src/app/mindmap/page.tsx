import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { PageTitle, Empty } from "@/components/ui";
import type { Npc, Relation, Character } from "@/lib/types";
import { MindmapClient } from "@/components/MindmapClient";



export default async function MindmapPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const [{ data: char }, { data: npcs }, { data: rels }] = await Promise.all([
    supabase
      .from("character")
      .select("id, name, photo_url")
      .eq("is_main", true)
      .maybeSingle(),
    supabase.from("npcs").select("*"),
    supabase.from("relations").select("*"),
  ]);

  return (
    <div>
      <PageTitle
        title="Mindmap"
        subtitle="Visualisation interactive des liens. Tu peux déplacer les nœuds, zoomer, et cliquer pour ouvrir une fiche."
      />
      {(npcs ?? []).length === 0 ? (
        <Empty>
          Pas encore de personnages. Ajoute-en dans le wiki pour voir la
          mindmap se remplir.
        </Empty>
      ) : (
        <MindmapClient
          mainCharacter={
            (char as Pick<Character, "id" | "name" | "photo_url"> | null) ?? {
              id: "main",
              name: "Eitan Carrington",
              photo_url: null,
            }
          }
          npcs={(npcs ?? []) as Npc[]}
          relations={(rels ?? []) as Relation[]}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

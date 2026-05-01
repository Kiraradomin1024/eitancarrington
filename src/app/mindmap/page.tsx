import { createClient } from "@/lib/supabase/server";
import { PageTitle, Empty } from "@/components/ui";
import type { Npc, Relation, Character } from "@/lib/types";
import { MindmapClient } from "@/components/MindmapClient";



export default async function MindmapPage() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data: char }, { data: npcs }, { data: rels }] = await Promise.all([
    supabase
      .from("character")
      .select("id, name")
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
            (char as Pick<Character, "id" | "name"> | null) ?? {
              id: "main",
              name: "Eitan Carrington",
            }
          }
          npcs={(npcs ?? []) as Npc[]}
          relations={(rels ?? []) as Relation[]}
        />
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { PageTitle, Empty } from "@/components/ui";
import type { Npc, Relation, Character } from "@/lib/types";
import { MindmapClient } from "@/components/MindmapClient";

export default async function MindmapPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = isAdmin(role);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: char }, { data: npcs }, { data: rels }, layoutQuery] =
    await Promise.all([
      supabase
        .from("character")
        .select("id, name, photo_url")
        .eq("is_main", true)
        .maybeSingle(),
      supabase.from("npcs").select("*"),
      supabase.from("relations").select("*"),
      user
        ? supabase
            .from("mindmap_layouts")
            .select("node_id, x, y")
            .eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

  const savedLayout: Record<string, { x: number; y: number }> = {};
  for (const row of (layoutQuery.data ?? []) as {
    node_id: string;
    x: number;
    y: number;
  }[]) {
    savedLayout[row.node_id] = { x: row.x, y: row.y };
  }

  return (
    <div>
      <PageTitle
        title="Mindmap"
        subtitle="Visualisation interactive des liens. Choisis un layout par défaut, déplace les nœuds, sauvegarde ton arrangement perso."
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
          isLoggedIn={!!user}
          savedLayout={savedLayout}
        />
      )}
    </div>
  );
}

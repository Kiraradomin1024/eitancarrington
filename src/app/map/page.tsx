import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, canContribute } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import type { MapMarker, Npc, Investigation, Character } from "@/lib/types";
import { MapClient } from "@/components/MapClient";

export const metadata = {
  title: "Carte de Los Santos",
  description:
    "Carte interactive de Los Santos : lieux notables, planques, contacts, indices.",
};

export default async function MapPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const [{ data: markers }, { data: npcs }, { data: investigations }, { data: mains }] =
    await Promise.all([
      supabase
        .from("map_markers")
        .select("*, people:map_marker_people(npc_id, character_id)")
        .order("created_at", { ascending: false }),
      supabase.from("npcs").select("id, name").order("name"),
      supabase
        .from("investigations")
        .select("id, title")
        .order("created_at", { ascending: false }),
      supabase
        .from("character")
        .select("id, name")
        .eq("is_main", true),
    ]);

  return (
    <div>
      <PageTitle
        title="Carte de Los Santos"
        subtitle="Lieux notables, planques, contacts, indices. Clique sur la carte pour ajouter un marqueur."
        scribble="géographie"
      />
      <MapClient
        markers={(markers ?? []) as MapMarker[]}
        npcs={(npcs ?? []) as Pick<Npc, "id" | "name">[]}
        characters={(mains ?? []) as Pick<Character, "id" | "name">[]}
        investigations={
          (investigations ?? []) as Pick<Investigation, "id" | "title">[]
        }
        canEdit={canEdit}
      />
    </div>
  );
}

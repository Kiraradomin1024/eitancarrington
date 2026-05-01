import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { CharacterForm } from "@/components/CharacterForm";
import type { Character } from "@/lib/types";
import { redirect } from "next/navigation";
import { updateCharacter } from "../actions";

export default async function EditCharacterPage() {
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect("/");
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("character")
    .select("*")
    .eq("is_main", true)
    .maybeSingle();
  const c = (data as Character | null) ?? {
    name: "Eitan Carrington",
    age: 21,
    bio: "",
    background: "",
    photo_url: "",
    traits: [],
  };

  return (
    <div>
      <PageTitle title="Modifier la fiche d'Eitan" />
      <CharacterForm initial={c} action={updateCharacter} />
    </div>
  );
}

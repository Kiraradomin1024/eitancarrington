import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Button, Card, Field, PageTitle } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
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
      <Card>
        <form action={updateCharacter} className="grid md:grid-cols-2 gap-4">
          <Field label="Nom">
            <input name="name" required defaultValue={c.name ?? ""} />
          </Field>
          <Field label="Âge">
            <input
              name="age"
              type="number"
              min={0}
              max={200}
              defaultValue={c.age ?? ""}
            />
          </Field>
          <div className="md:col-span-2">
            <ImageUpload
              name="photo_url"
              defaultValue={c.photo_url}
              label="Photo d'Eitan"
              shape="square"
            />
          </div>
          <div className="md:col-span-2">
            <Field label="Biographie">
              <textarea name="bio" rows={5} defaultValue={c.bio ?? ""} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Famille / Origines">
              <textarea
                name="background"
                rows={4}
                defaultValue={c.background ?? ""}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Traits" hint="séparés par des virgules">
              <input
                name="traits"
                defaultValue={(c.traits ?? []).join(", ")}
              />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

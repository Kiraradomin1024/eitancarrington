import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button, Card, Field, PageTitle } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { updateOwnProfile } from "./actions";

export default async function EditOwnProfilePage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, bio")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (data ?? {
    display_name: null,
    avatar_url: null,
    bio: null,
  }) as {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };

  return (
    <div>
      <PageTitle
        title="Mon profil"
        subtitle="Personnalise ton avatar, ton pseudo et ta bio. Ces infos apparaissent à côté de tes contributions."
      />
      <Card>
        <form action={updateOwnProfile} className="space-y-4 max-w-xl">
          <Field label="Pseudo affiché">
            <input
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              placeholder="Comment veux-tu être appelé·e ?"
            />
          </Field>
          <ImageUpload
            name="avatar_url"
            defaultValue={profile.avatar_url}
            label="Avatar"
            shape="circle"
          />
          <Field label="Bio" hint="Quelques lignes libres.">
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={4}
              placeholder="Une phrase ou deux sur toi…"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

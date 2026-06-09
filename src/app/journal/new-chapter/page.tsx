import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Card, PageTitle, Field, Button } from "@/components/ui";
import { createChapter } from "../chapter-actions";
import { redirect } from "next/navigation";

export default async function NewChapterPage() {
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect("/journal");

  return (
    <div>
      <PageTitle title="Nouveau chapitre" />
      <Card>
        <form action={createChapter} className="grid sm:grid-cols-2 gap-4">
          <Field label="Titre *" hint="ex: Chapitre 2">
            <input name="title" required placeholder="Chapitre 2" />
          </Field>
          <Field
            label="Sous-titre"
            hint="Optionnel — nom de l'arc narratif"
          >
            <input
              name="subtitle"
              placeholder="ex: Nouvelle vie"
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit">Créer le chapitre</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

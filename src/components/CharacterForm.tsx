"use client";

import { Button, Card, Field, PageTitle } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { Character } from "@/lib/types";
import { useState } from "react";

export function CharacterForm({
  initial,
  action,
}: {
  initial: Partial<Character>;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <form
        action={async (fd) => {
          setPending(true);
          setError(null);
          try {
            await action(fd);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
            setPending(false);
          }
        }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Field label="Nom">
          <input name="name" required defaultValue={initial.name ?? ""} />
        </Field>
        <div className="md:col-span-2">
          <ImageUpload
            name="photo_url"
            defaultValue={initial.photo_url}
            label="Photo d'Eitan"
            shape="square"
          />
        </div>
        <div className="md:col-span-2">
          <Field label="Biographie" hint="Markdown supporté : ## Titres, **gras**, *italique*, images">
            <RichTextEditor
              name="bio"
              defaultValue={initial.bio ?? ""}
              placeholder="Biographie, personnalité, histoire…"
              rows={8}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Famille / Origines" hint="Markdown supporté">
            <RichTextEditor
              name="background"
              defaultValue={initial.background ?? ""}
              placeholder="Famille, origines, contexte…"
              rows={6}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Traits" hint="séparés par des virgules">
            <input
              name="traits"
              defaultValue={(initial.traits ?? []).join(", ")}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Streamer (Twitch)"
            hint="Pseudo Twitch de la personne qui joue Eitan. URL ou @ supportés."
          >
            <input
              name="twitch_username"
              defaultValue={initial.twitch_username ?? ""}
              placeholder="ex: pseudostream"
            />
          </Field>
        </div>
        {error && (
          <p className="md:col-span-2 text-danger text-xs">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

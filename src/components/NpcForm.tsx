"use client";

import { Button, Card, Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { Npc } from "@/lib/types";
import { useState } from "react";

export function NpcForm({
  initial,
  action,
}: {
  initial?: Partial<Npc>;
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
            setError(e instanceof Error ? e.message : "Erreur inconnue");
            setPending(false);
          }
        }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Field label="Nom *">
          <input name="name" required defaultValue={initial?.name ?? ""} />
        </Field>
        <Field label="Famille">
          <input name="family" defaultValue={initial?.family ?? ""} />
        </Field>
        <Field label="Quartier">
          <input
            name="neighborhood"
            defaultValue={initial?.neighborhood ?? ""}
          />
        </Field>
        <Field label="Occupation / Métier">
          <input
            name="occupation"
            defaultValue={initial?.occupation ?? ""}
          />
        </Field>
        <Field label="Statut">
          <select name="status" defaultValue={initial?.status ?? "alive"}>
            <option value="alive">En vie</option>
            <option value="dead">Décédé</option>
            <option value="missing">Disparu</option>
            <option value="unknown">Inconnu</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <ImageUpload
            name="photo_url"
            defaultValue={initial?.photo_url}
            label="Photo"
            shape="circle"
          />
        </div>
        <Field label="Tags" hint="séparés par des virgules">
          <input
            name="tags"
            defaultValue={initial?.tags?.join(", ") ?? ""}
            placeholder="ex: famille, Richman Lane, dangereux"
          />
        </Field>
        <Field
          label="Streamer (Twitch)"
          hint="Pseudo Twitch de la personne qui joue ce perso. URL ou @ supportés."
        >
          <input
            name="twitch_username"
            defaultValue={initial?.twitch_username ?? ""}
            placeholder="ex: pseudostream"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description" hint="Markdown supporté : ## Titres, **gras**, *italique*, images">
            <RichTextEditor
              name="description"
              defaultValue={initial?.description ?? ""}
              placeholder="Biographie, apparence, notes…"
              rows={10}
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

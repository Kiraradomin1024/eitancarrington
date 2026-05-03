"use client";

import { Button, Card, Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { Npc, RelationType } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { useState } from "react";

export function NpcForm({
  initial,
  action,
  existingNpcs,
  initialRelations,
}: {
  initial?: Partial<Npc>;
  action: (formData: FormData) => Promise<void>;
  existingNpcs?: Pick<Npc, "id" | "name">[];
  initialRelations?: Record<string, RelationType>;
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
        <Field label="Numéro" hint="Numéro de téléphone RP">
          <input
            name="phone_number"
            defaultValue={initial?.phone_number ?? ""}
            placeholder="ex: 555-0123"
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
        {existingNpcs && existingNpcs.length > 0 && (
          <div className="md:col-span-2">
            <span className="text-sm text-muted mb-1.5 block">
              Relations avec les autres persos
            </span>
            <p className="text-xs text-muted italic mb-3">
              Par défaut : aucune relation. Change le menu déroulant pour
              définir un lien.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1 border border-border rounded p-3 bg-surface-2/40">
              {existingNpcs.map((n) => (
                <div key={n.id} className="flex items-center gap-2">
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    title={n.name}
                  >
                    {n.name}
                  </span>
                  <select
                    name={`relation_${n.id}`}
                    defaultValue={initialRelations?.[n.id] ?? ""}
                    className="text-sm shrink-0"
                    style={{ width: "10rem" }}
                  >
                    <option value="">— Aucune</option>
                    {(
                      Object.entries(RELATION_LABELS) as [
                        RelationType,
                        string,
                      ][]
                    ).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
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

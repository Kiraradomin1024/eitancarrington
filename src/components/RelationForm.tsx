"use client";

import { Button, Card, Field } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { useState } from "react";

export function RelationForm({
  npcs,
  action,
}: {
  npcs: Pick<Npc, "id" | "name">[];
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
            (
              document.getElementById("relation-form") as HTMLFormElement | null
            )?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
          } finally {
            setPending(false);
          }
        }}
        id="relation-form"
        className="grid md:grid-cols-2 gap-4"
      >
        <Field label="De">
          <select name="source_npc_id" defaultValue="EITAN">
            <option value="EITAN">Eitan (perso principal)</option>
            {npcs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vers *">
          <select name="target_npc_id" required defaultValue="">
            <option value="" disabled>
              choisir un personnage
            </option>
            {npcs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type *">
          <select name="type" required defaultValue="friend">
            {Object.entries(RELATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Intensité" hint="-5 (haine) à +5 (très proche)">
          <input
            type="number"
            name="intensity"
            min={-5}
            max={5}
            defaultValue={0}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Note">
            <input
              name="description"
              placeholder="ex: ami d'enfance, voisin de Richman Lane…"
            />
          </Field>
        </div>
        {error && (
          <p className="md:col-span-2 text-danger text-xs">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Ajouter"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

"use client";

import { Button, Card, Field } from "@/components/ui";
import type { Npc, Relation } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { RELATION_INK } from "@/lib/ink";
import { useState } from "react";

export function EditableRelationRow({
  relation,
  sourceName,
  targetName,
  npcs,
  canEdit = false,
  updateAction,
  deleteAction,
}: {
  relation: Relation;
  sourceName: string;
  targetName: string;
  npcs: Pick<Npc, "id" | "name">[];
  canEdit?: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap hand text-[22px] leading-[34px] py-0.5">
        <NameDisplay id={relation.source_npc_id} name={sourceName} />
        <span className="text-ink-faint">—</span>
        <NameDisplay id={relation.target_npc_id} name={targetName} />
        <span
          style={{
            textDecorationLine: "underline",
            textDecorationStyle: RELATION_INK[relation.type].decoration,
            textDecorationColor: RELATION_INK[relation.type].color,
            textDecorationThickness: "2px",
            textUnderlineOffset: "5px",
          }}
        >
          {RELATION_INK[relation.type].word}
        </span>
        {relation.description && (
          <span className="text-ink-soft text-[20px]">, {relation.description}</span>
        )}
        {canEdit && (
          <span className="ml-auto flex gap-4 text-[18px]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              corriger
            </button>
            <DeleteBtn action={deleteAction} />
          </span>
        )}
      </div>
    );
  }

  // Editing mode
  return (
    <Card className="!p-5 card-glow !pt-9">
      <form
        action={async (fd) => {
          setPending(true);
          setError(null);
          try {
            await updateAction(fd);
            setEditing(false);
          } catch (e) {
            if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
            setError(e instanceof Error ? e.message : "Erreur");
          } finally {
            setPending(false);
          }
        }}
        className="grid md:grid-cols-2 gap-3"
      >
        <Field label="De">
          <select
            name="source_npc_id"
            defaultValue={relation.source_npc_id ?? "EITAN"}
          >
            <option value="EITAN">Eitan (perso principal)</option>
            {npcs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vers *">
          <select
            name="target_npc_id"
            required
            defaultValue={relation.target_npc_id}
          >
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
          <select name="type" required defaultValue={relation.type}>
            {Object.entries(RELATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Intensité" hint="-5 à +5">
          <input
            type="number"
            name="intensity"
            min={-5}
            max={5}
            defaultValue={relation.intensity}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Note">
            <input
              name="description"
              defaultValue={relation.description ?? ""}
              placeholder="ex: ami d'enfance, voisin…"
            />
          </Field>
        </div>
        {error && (
          <p className="md:col-span-2 hand text-pen-red text-[18px]">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            laisser tomber
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function NameDisplay({ id, name }: { id: string | null; name: string }) {
  return (
    <span className="text-ink font-semibold">{name}</span>
  );
}

function DeleteBtn({ action }: { action: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Supprimer cette relation ?")) return;
        setPending(true);
        await action();
      }}
      className="text-pen-red/80 hover:text-pen-red underline underline-offset-4"
      title="Supprimer"
    >
      rayer
    </button>
  );
}

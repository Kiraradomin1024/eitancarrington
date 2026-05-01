"use client";

import { Button, Card, Field } from "@/components/ui";
import type { Npc, Relation } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
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
      <Card className="!p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <NameDisplay id={relation.source_npc_id} name={sourceName} />
          <span className="text-muted">→</span>
          <NameDisplay id={relation.target_npc_id} name={targetName} />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent">
            {RELATION_LABELS[relation.type]}
          </span>
          {relation.intensity !== 0 && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${relation.intensity > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
            >
              {relation.intensity > 0 ? "+" : ""}
              {relation.intensity}
            </span>
          )}
          {relation.description && (
            <span className="text-muted text-sm italic">
              — {relation.description}
            </span>
          )}
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-muted hover:text-accent transition-colors text-sm"
                title="Modifier"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </button>
              <DeleteBtn action={deleteAction} />
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Editing mode
  return (
    <Card className="!p-4 border-accent/40">
      <form
        action={async (fd) => {
          setPending(true);
          setError(null);
          try {
            await updateAction(fd);
            setEditing(false);
          } catch (e) {
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
          <p className="md:col-span-2 text-danger text-xs">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Annuler
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
    <span className="text-foreground font-medium">{name}</span>
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
      className="text-muted hover:text-danger transition-colors text-sm"
      title="Supprimer"
    >
      ×
    </button>
  );
}

"use client";

import { Button, Field } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { useState } from "react";

export function ClueForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
          (
            document.getElementById("clue-form") as HTMLFormElement | null
          )?.reset();
        } finally {
          setPending(false);
        }
      }}
      id="clue-form"
      className="flex gap-2 items-end"
    >
      <div className="flex-1">
        <Field label="Nouvel indice">
          <input
            name="content"
            required
            placeholder="ex: vu près du port à minuit…"
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        +
      </Button>
    </form>
  );
}

export function NpcLinker({
  npcs,
  action,
}: {
  npcs: Pick<Npc, "id" | "name">[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
          (
            document.getElementById(
              "npc-linker-form"
            ) as HTMLFormElement | null
          )?.reset();
        } finally {
          setPending(false);
        }
      }}
      id="npc-linker-form"
      className="space-y-2"
    >
      <Field label="Lier un personnage">
        <select name="npc_id" required defaultValue="">
          <option value="" disabled>
            choisir
          </option>
          {npcs.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rôle">
        <select name="role" defaultValue="suspect">
          <option value="investigator">🔍 Enquêteur</option>
          <option value="suspect">Suspect</option>
          <option value="witness">Témoin</option>
          <option value="victim">Victime</option>
          <option value="informant">Informateur</option>
          <option value="accomplice">Complice</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : "Lier"}
      </Button>
    </form>
  );
}

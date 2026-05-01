"use client";

import { Button, Card, Field } from "@/components/ui";
import type { Investigation } from "@/lib/types";
import { INVESTIGATION_STATUS_LABELS } from "@/lib/types";
import { useState } from "react";

export function InvestigationForm({
  initial,
  action,
}: {
  initial?: Partial<Investigation>;
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
        className="grid gap-4"
      >
        <Field label="Titre *">
          <input name="title" required defaultValue={initial?.title ?? ""} />
        </Field>
        <Field label="Statut">
          <select name="status" defaultValue={initial?.status ?? "open"}>
            {Object.entries(INVESTIGATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description / contexte">
          <textarea
            name="description"
            rows={6}
            defaultValue={initial?.description ?? ""}
          />
        </Field>
        {error && <p className="text-danger text-xs">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

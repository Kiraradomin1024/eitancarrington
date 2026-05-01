"use client";

import { Button, Card, Field } from "@/components/ui";
import {
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
} from "@/lib/types";
import { useState, useTransition } from "react";

export function IssueForm({
  action,
}: {
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
              document.getElementById("issue-form") as HTMLFormElement | null
            )?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
          } finally {
            setPending(false);
          }
        }}
        id="issue-form"
        className="grid md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-3">
          <Field label="Titre *">
            <input name="title" required />
          </Field>
        </div>
        <Field label="Sévérité">
          <select name="severity" defaultValue="medium">
            {Object.entries(ISSUE_SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select name="status" defaultValue="active">
            {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-3">
          <Field label="Description">
            <textarea name="description" rows={3} />
          </Field>
        </div>
        {error && (
          <p className="md:col-span-3 text-danger text-xs">{error}</p>
        )}
        <div className="md:col-span-3 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Ajouter"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function IssueRowActions({
  id,
  status,
  onUpdateStatus,
  onDelete,
}: {
  id: string;
  status: string;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2 items-start">
      {status !== "resolved" ? (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(() => onUpdateStatus(id, "resolved"))
          }
        >
          ✓ Résolu
        </Button>
      ) : (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(() => onUpdateStatus(id, "active"))
          }
        >
          Réactiver
        </Button>
      )}
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Supprimer ce souci ?")) return;
          startTransition(() => onDelete(id));
        }}
      >
        ×
      </Button>
    </div>
  );
}

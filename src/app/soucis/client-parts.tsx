"use client";

import { Button, Card, Field } from "@/components/ui";
import type { Issue } from "@/lib/types";
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
  onEdit,
}: {
  id: string;
  status: string;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2 items-start">
      <Button variant="ghost" disabled={pending} onClick={onEdit}>
        ✏️
      </Button>
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

export function EditableIssueCard({
  issue,
  canEdit,
  updateAction,
  onUpdateStatus,
  onDelete,
}: {
  issue: Issue;
  canEdit: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <Card className="!p-5 border-accent/40">
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
          className="grid md:grid-cols-3 gap-4"
        >
          <div className="md:col-span-3">
            <Field label="Titre *">
              <input name="title" required defaultValue={issue.title} />
            </Field>
          </div>
          <Field label="Sévérité">
            <select name="severity" defaultValue={issue.severity}>
              {Object.entries(ISSUE_SEVERITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select name="status" defaultValue={issue.status}>
              {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-3">
            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                defaultValue={issue.description ?? ""}
              />
            </Field>
          </div>
          {error && (
            <p className="md:col-span-3 text-danger text-xs">{error}</p>
          )}
          <div className="md:col-span-3 flex justify-end gap-2">
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

  return (
    <Card className="!p-5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-xl text-foreground">
              {issue.title}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                issue.severity === "critical"
                  ? "bg-red-500/10 text-red-400"
                  : issue.severity === "high"
                    ? "bg-orange-500/10 text-orange-400"
                    : issue.severity === "medium"
                      ? "bg-accent-soft text-accent"
                      : "bg-surface-2 text-muted"
              }`}
            >
              {ISSUE_SEVERITY_LABELS[issue.severity]}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                issue.status === "active"
                  ? "bg-orange-500/10 text-orange-400"
                  : issue.status === "resolved"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-surface-2 text-muted"
              }`}
            >
              {ISSUE_STATUS_LABELS[issue.status]}
            </span>
          </div>
          {issue.description && (
            <p className="text-foreground/80 text-sm mt-2 whitespace-pre-line">
              {issue.description}
            </p>
          )}
        </div>
        {canEdit && (
          <IssueRowActions
            id={issue.id}
            status={issue.status}
            onUpdateStatus={onUpdateStatus}
            onDelete={onDelete}
            onEdit={() => setEditing(true)}
          />
        )}
      </div>
    </Card>
  );
}

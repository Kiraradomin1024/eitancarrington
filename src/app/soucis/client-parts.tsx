"use client";

import { Button, Field } from "@/components/ui";
import { Sheet } from "@/components/paper";
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
    <Sheet className="!pt-8" rotate="-0.4deg">
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
        className="grid sm:grid-cols-2 gap-4"
      >
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea name="description" rows={3} />
          </Field>
        </div>
        {error && (
          <p className="sm:col-span-2 hand text-pen-red text-[18px]">{error}</p>
        )}
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Noter"}
          </Button>
        </div>
      </form>
    </Sheet>
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
  const link = "hand text-[18px] leading-none underline underline-offset-4 disabled:opacity-50";
  return (
    <div className="flex gap-4 items-baseline flex-wrap">
      <button type="button" className={link + " text-ink-soft hover:text-ink"} disabled={pending} onClick={onEdit}>
        corriger
      </button>
      {status !== "resolved" ? (
        <button
          type="button"
          className={link + " text-pen-green"}
          disabled={pending}
          onClick={() => startTransition(() => onUpdateStatus(id, "resolved"))}
        >
          réglé
        </button>
      ) : (
        <button
          type="button"
          className={link + " text-ink-soft hover:text-ink"}
          disabled={pending}
          onClick={() => startTransition(() => onUpdateStatus(id, "active"))}
        >
          ça revient
        </button>
      )}
      <button
        type="button"
        className={link + " text-pen-red/80 hover:text-pen-red"}
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Supprimer ce souci ?")) return;
          startTransition(() => onDelete(id));
        }}
      >
        rayer
      </button>
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
      <Sheet className="!pt-8" rotate="0.3deg">
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
          className="grid sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                defaultValue={issue.description ?? ""}
              />
            </Field>
          </div>
          {error && (
            <p className="sm:col-span-2 hand text-pen-red text-[18px]">{error}</p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
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
      </Sheet>
    );
  }

  const sev = SEVERITY_INK[issue.severity];
  const resolved = issue.status === "resolved";
  const paused = issue.status === "paused";

  return (
    <div id={"souci-" + issue.id} className="flex items-start gap-4 py-3 scroll-mt-24">
      {/* case à cocher tracée à la main */}
      <span
        aria-hidden
        className="mt-2 shrink-0 w-[22px] h-[22px] flex items-center justify-center hand text-[26px] leading-none text-pen-green"
        style={{ border: "2px solid var(--ink)", borderRadius: "3px 5px 4px 6px", transform: "rotate(-3deg)" }}
      >
        {resolved ? "✓" : ""}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
          <h3
            className={
              "hand text-[25px] md:text-[27px] font-semibold leading-[1.1] " +
              (resolved ? "line-through decoration-2 text-ink-faint" : "text-ink")
            }
          >
            {issue.title}
          </h3>
          {!resolved && (
            <span className="hand text-[21px] leading-none" style={{ color: sev.tone }} title={ISSUE_SEVERITY_LABELS[issue.severity]}>
              {sev.mark}
            </span>
          )}
          {paused && <span className="hand text-[19px] text-ink-faint">en pause</span>}
        </div>
        {issue.description && (
          <p className="print text-[15px] leading-[1.65] text-ink-soft mt-1 whitespace-pre-line max-w-[70ch]">
            {issue.description}
          </p>
        )}
        {canEdit && (
          <div className="mt-2">
            <IssueRowActions
              id={issue.id}
              status={issue.status}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
              onEdit={() => setEditing(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* La gravité, comme on la note : un mot, des points d'exclamation */
const SEVERITY_INK: Record<Issue["severity"], { mark: string; tone: string }> = {
  low: { mark: "· pas grave", tone: "var(--pen-grey)" },
  medium: { mark: "! à surveiller", tone: "var(--pen-amber)" },
  high: { mark: "!! sérieux", tone: "var(--pen-red)" },
  critical: { mark: "!!! urgent", tone: "var(--pen-red)" },
};

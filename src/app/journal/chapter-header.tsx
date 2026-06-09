"use client";

import type { Chapter } from "@/lib/types";
import { useState } from "react";
import { updateChapter, deleteChapter } from "./chapter-actions";

export function ChapterHeader({
  chapter,
  canEdit,
  maxDayNumber = 0,
}: {
  chapter: Chapter;
  canEdit: boolean;
  maxDayNumber?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className="mb-6 card p-4">
        <form
          action={async (fd) => {
            setPending(true);
            setError(null);
            try {
              await updateChapter(chapter.id, fd);
              setEditing(false);
              setPending(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erreur");
              setPending(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted mb-1 block font-medium">
                Titre
              </label>
              <input name="title" defaultValue={chapter.title} required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted mb-1 block font-medium">
                Sous-titre
              </label>
              <input
                name="subtitle"
                defaultValue={chapter.subtitle ?? ""}
                placeholder="ex: L'arrivée à Los Santos"
              />
            </div>
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1 text-sm text-muted hover:text-foreground transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 text-sm rounded-full bg-foreground text-background hover:opacity-90 transition"
            >
              {pending ? "..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-end gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl md:text-6xl text-gradient leading-none">
            {chapter.number}
          </span>
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-foreground leading-tight">
              {chapter.title}
              {maxDayNumber > 0 && (
                <span className="ml-2 text-sm font-sans font-normal text-muted">
                  Jour {maxDayNumber}
                </span>
              )}
            </h2>
            {chapter.subtitle && (
              <p className="text-muted text-sm mt-0.5 italic">
                {chapter.subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-accent/50 via-accent-2/30 to-transparent" />
      </div>
      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted hover:text-foreground transition px-2 py-1 rounded border border-border hover:border-accent/40"
          >
            Modifier
          </button>
          <form
            action={async () => {
              if (!confirm("Supprimer ce chapitre ? (seulement si vide)"))
                return;
              try {
                await deleteChapter(chapter.id);
              } catch (e) {
                alert(e instanceof Error ? e.message : "Erreur");
              }
            }}
          >
            <button
              type="submit"
              className="text-xs text-danger/70 hover:text-danger transition px-2 py-1 rounded border border-danger/20 hover:border-danger/40"
            >
              Suppr.
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

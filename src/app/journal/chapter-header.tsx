"use client";

import type { Chapter } from "@/lib/types";
import { useState } from "react";
import { updateChapter, deleteChapter } from "./chapter-actions";
import { roman } from "@/lib/ink";

/** L'intercalaire d'un chapitre : étiquette kraft, titre à la main */
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
      <div className="mb-6 sheet sheet--stapled px-6 pt-8 pb-5 max-w-[640px]">
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
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="typed mb-1 block">Titre</span>
              <input name="title" defaultValue={chapter.title} required />
            </label>
            <label className="block">
              <span className="typed mb-1 block">Sous-titre</span>
              <input
                name="subtitle"
                defaultValue={chapter.subtitle ?? ""}
                placeholder="ex: L'arrivée à Los Santos"
              />
            </label>
          </div>
          {error && <p className="hand text-pen-red text-[18px]">{error}</p>}
          <div className="flex gap-5 justify-end items-center">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="hand text-[20px] text-ink-soft underline underline-offset-4"
            >
              laisser tomber
            </button>
            <button
              type="submit"
              disabled={pending}
              className="stamp stamp--sm text-ink"
            >
              {pending ? "…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-end gap-4 flex-wrap pr-10">
      <div className="flex-1 min-w-0">
        <span className="label-kraft">
          Chapitre {roman(chapter.number)}
          {maxDayNumber > 0 && ` · jusqu'au jour ${maxDayNumber}`}
        </span>
        <h2 className="hand text-[32px] md:text-[38px] font-semibold leading-none mt-4">
          {chapter.title}
        </h2>
        {chapter.subtitle && (
          <p className="hand text-[20px] md:text-[22px] text-ink-soft mt-1">
            {chapter.subtitle}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex gap-4 shrink-0 items-baseline">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="hand text-[19px] text-ink-soft hover:text-ink underline underline-offset-4"
          >
            renommer
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
              className="hand text-[19px] text-pen-red/80 hover:text-pen-red underline underline-offset-4"
            >
              retirer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

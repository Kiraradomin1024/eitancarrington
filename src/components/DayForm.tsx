"use client";

import { Button, Card, Field } from "@/components/ui";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { Chapter, Day, Npc } from "@/lib/types";
import { useState } from "react";

export function DayForm({
  initial,
  initialNpcIds,
  npcs,
  chapters,
  action,
  nextDayNumber,
}: {
  initial?: Partial<Day>;
  initialNpcIds?: string[];
  npcs: Pick<Npc, "id" | "name">[];
  chapters?: Chapter[];
  action: (formData: FormData) => Promise<void>;
  nextDayNumber?: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(initialNpcIds ?? []);

  // Default to the initial chapter, or the latest chapter
  const sortedChapters = (chapters ?? []).sort((a, b) => b.number - a.number);
  const defaultChapterId =
    initial?.chapter_id ?? sortedChapters[0]?.id ?? "";

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  return (
    <Card>
      <form
        action={async (fd) => {
          setPending(true);
          setError(null);
          selected.forEach((id) => fd.append("npc_ids", id));
          try {
            await action(fd);
          } catch (e) {
            if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
            setError(e instanceof Error ? e.message : "Erreur");
            setPending(false);
          }
        }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Field label="Date *">
          <input
            type="date"
            name="date"
            required
            defaultValue={
              initial?.date ?? new Date().toISOString().slice(0, 10)
            }
          />
        </Field>
        <Field label="Jour N°" hint="ex: 1, 2, 3… (le numéro du jour RP)">
          <input
            type="number"
            name="day_number"
            min={1}
            defaultValue={initial?.day_number ?? nextDayNumber ?? ""}
            placeholder="ex: 5"
          />
        </Field>
        <Field label="Titre *">
          <input
            name="title"
            required
            defaultValue={initial?.title ?? ""}
            placeholder="ex: Première journée à Los Santos"
          />
        </Field>
        {sortedChapters.length > 0 && (
          <Field label="Chapitre">
            <select name="chapter_id" defaultValue={defaultChapterId}>
              <option value="">— Aucun —</option>
              {sortedChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.subtitle ? ` — ${c.subtitle}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="md:col-span-2">
          <Field label="Résumé court" hint="Une-deux phrases">
            <input name="summary" defaultValue={initial?.summary ?? ""} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Rediff du stream"
            hint="URL du VOD Twitch / YouTube de ce jour"
          >
            <input
              type="url"
              name="vod_url"
              defaultValue={initial?.vod_url ?? ""}
              placeholder="https://www.twitch.tv/videos/…"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Récit complet">
            <RichTextEditor
              name="content"
              defaultValue={initial?.content ?? ""}
              placeholder="Ce qui s'est passé ce jour-là… Tu peux ajouter des images !"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <span className="text-sm text-muted mb-1.5 block">
            Personnages impliqués
          </span>
          {npcs.length === 0 ? (
            <p className="text-xs text-muted italic">
              Aucun personnage encore créé — ajoute-en dans le wiki.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {npcs.map((n) => {
                const on = selected.includes(n.id);
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => toggle(n.id)}
                    className={
                      "px-3 py-1 rounded-full text-sm border transition " +
                      (on
                        ? "bg-accent/20 border-accent text-foreground"
                        : "bg-surface-2 border-border text-muted hover:text-foreground")
                    }
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && (
          <p className="md:col-span-2 text-danger text-xs">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}


"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NpcStatus } from "@/lib/types";
import { STATUS_INK, tilt } from "@/lib/ink";
import { Photo } from "@/components/paper";

export type AlbumPerson = {
  id: string;
  href: string;
  name: string;
  photo: string | null;
  status: NpcStatus;
  occupation: string | null;
  family: string | null;
  neighborhood: string | null;
  tags: string[];
  live: boolean;
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* « ou juste ceux qui sont disparus, dedans, partis, qu'on a perdus » */
const FILTERS: { status: NpcStatus; word: string }[] = [
  { status: "missing", word: "disparus" },
  { status: "jailed", word: "dedans" },
  { status: "gone", word: "partis" },
  { status: "dead", word: "qu'on a perdus" },
];

function noteFor(p: AlbumPerson): { text: string; tone: string } {
  if (p.status === "alive") {
    return {
      text: p.occupation ?? p.family ?? p.neighborhood ?? "en vie",
      tone: "var(--ink-soft)",
    };
  }
  const ink = STATUS_INK[p.status];
  return { text: ink.note, tone: ink.tone };
}

export function Album({ people }: { people: AlbumPerson[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<NpcStatus | null>(null);

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    return people.filter((p) => {
      if (only && p.status !== only) return false;
      if (!needle) return true;
      const hay = norm(
        [p.name, p.occupation, p.family, p.neighborhood, ...p.tags]
          .filter(Boolean)
          .join(" ")
      );
      return hay.includes(needle);
    });
  }, [people, q, only]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-10">
        <div className="min-w-0">
          <h1 className="hand text-[34px] md:text-[40px] font-semibold leading-none">
            les gens que je croise
          </h1>
          <div className="hand-line mt-3 w-full max-w-[400px]">
            <span className="hand-line__lead">je cherche…</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="trois lettres suffisent"
              aria-label="Chercher quelqu'un dans l'album"
              autoComplete="off"
            />
          </div>
          <p className="typed mt-1.5">
            {shown.length} {shown.length > 1 ? "fiches" : "fiche"} dans l&apos;album
          </p>
        </div>

        <div className="hand text-[20px] md:text-[21px] leading-[29px] text-ink-soft lg:text-right">
          <div>
            ou juste ceux qui sont{" "}
            <FilterWord f={FILTERS[0]} only={only} setOnly={setOnly} />
          </div>
          <div>
            ceux <FilterWord f={FILTERS[1]} only={only} setOnly={setOnly} />, les{" "}
            <FilterWord f={FILTERS[2]} only={only} setOnly={setOnly} />, ceux{" "}
            <FilterWord f={FILTERS[3]} only={only} setOnly={setOnly} />
          </div>
          {only && (
            <button
              type="button"
              onClick={() => setOnly(null)}
              className="hand text-[18px] text-ink-faint underline underline-offset-4"
            >
              non, tout le monde
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="hand text-[24px] md:text-[26px] text-ink-faint mt-14">
          personne de ce nom dans l&apos;album. page blanche.
        </p>
      ) : (
        <div className="mt-8 md:mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8 md:gap-x-8 md:gap-y-9">
          {shown.map((p) => {
            const note = noteFor(p);
            return (
              <Link
                key={p.id}
                href={p.href}
                className="block group"
                style={{ transform: `rotate(${tilt(p.id, 2)})` }}
              >
                <Photo
                  src={p.photo}
                  alt={p.name}
                  status={p.status}
                  className="w-full aspect-[3/4] transition-transform group-hover:-translate-y-1"
                  live={p.live}
                  initial={p.name[0]}
                />
                <div className="hand mt-2 text-[21px] md:text-[23px] font-semibold leading-[1.1]">
                  {p.name}
                </div>
                <div
                  className="hand text-[17px] md:text-[18px] leading-[1.2] truncate"
                  style={{ color: note.tone }}
                >
                  {note.text}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p
        className="hand text-pen-red text-[20px] mt-12 text-right"
        style={{ transform: "rotate(-1.2deg)" }}
      >
        les coins noirs, c&apos;est ceux qui manquent
      </p>
    </div>
  );
}

function FilterWord({
  f,
  only,
  setOnly,
}: {
  f: { status: NpcStatus; word: string };
  only: NpcStatus | null;
  setOnly: (s: NpcStatus | null) => void;
}) {
  const active = only === f.status;
  const tone = STATUS_INK[f.status].tone;
  return (
    <button
      type="button"
      onClick={() => setOnly(active ? null : f.status)}
      aria-pressed={active}
      className="hand leading-none"
      style={{
        color: tone,
        borderBottom: `2px ${active ? "double" : "solid"} ${tone}`,
        borderBottomWidth: active ? 4 : 2,
        fontWeight: active ? 600 : 400,
      }}
    >
      {f.word}
    </button>
  );
}

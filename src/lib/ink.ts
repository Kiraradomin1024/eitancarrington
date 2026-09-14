import type { NpcStatus, RelationType } from "@/lib/types";

/**
 * Le vocabulaire du cahier : chaque statut est un tampon, chaque type de
 * lien est un trait. Les couleurs pointent vers des variables CSS pour
 * suivre les thèmes (clair, sombre, intrusion).
 */

export type StampBorder = "solid" | "double" | "dashed";

export const STATUS_INK: Record<
  NpcStatus,
  {
    stamp: string;
    tone: string;
    border: StampBorder;
    faint?: boolean;
    /** Ce qu'on écrit à la main sous le cliché quand on n'a rien de mieux */
    note: string;
  }
> = {
  alive: { stamp: "en vie", tone: "var(--pen-green)", border: "solid", note: "en vie" },
  dead: { stamp: "décédé", tone: "var(--pen-black)", border: "solid", note: "· en mémoire ·" },
  missing: { stamp: "disparu", tone: "var(--pen-red)", border: "double", note: "disparu" },
  gone: { stamp: "parti", tone: "var(--pen-grey)", border: "solid", faint: true, note: "parti de L.S." },
  jailed: { stamp: "en prison", tone: "var(--pen-amber)", border: "solid", note: "en prison" },
  unknown: { stamp: "inconnu", tone: "var(--pen-dust)", border: "dashed", note: "on ne sait pas" },
};

export type RelationInk = {
  /** Mot écrit à la main */
  word: string;
  color: string;
  /** Style de soulignement pour le texte */
  decoration: "solid" | "double" | "dashed" | "dotted" | "wavy";
  /** Tracé SVG pour la mindmap */
  dash?: string;
  double?: boolean;
  width: number;
};

export const RELATION_INK: Record<RelationType, RelationInk> = {
  family: { word: "famille", color: "var(--ink-soft)", decoration: "double", double: true, width: 1.5 },
  friend: { word: "ami·e", color: "var(--pen-green)", decoration: "solid", width: 2 },
  romance: { word: "romance", color: "var(--pen-red)", decoration: "wavy", dash: "14 5 2 5", width: 2 },
  business: { word: "affaires", color: "var(--pen-violet)", decoration: "dashed", dash: "9 8", width: 2 },
  contact: { word: "contact", color: "var(--pen-amber)", decoration: "solid", width: 1.5 },
  rival: { word: "rival", color: "var(--pen-red)", decoration: "dashed", dash: "6 6", width: 1.8 },
  enemy: { word: "ennemi", color: "var(--pen-red)", decoration: "solid", width: 3 },
  mentor: { word: "mentor", color: "var(--ink)", decoration: "solid", width: 2.4 },
  colleague: { word: "collègue", color: "var(--ink-soft)", decoration: "dotted", dash: "2 5", width: 2 },
  other: { word: "autre", color: "var(--pen-dust)", decoration: "dotted", dash: "3 7", width: 1.6 },
};

/** Ceux qui ne répondent plus : trait pointillé noir */
export const SILENT_INK = { color: "var(--pen-black)", dash: "3 6", width: 2 };

/** Petite inclinaison stable, dérivée d'une clé (id, nom…) */
export function tilt(key: string, max = 2): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const unit = ((Math.abs(h) % 1000) / 1000) * 2 - 1;
  return `${(unit * max).toFixed(2)}deg`;
}

export function roman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = Math.floor(n);
  for (const [v, s] of table) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/** « jeudi 11 sept. » */
export function handDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
    .replace(/\.$/, ".");
}

/** « 11.09 » ou « 11.09.2026 » */
export function typedDate(date: string | Date, withYear = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear ? `${dd}.${mm}.${d.getFullYear()}` : `${dd}.${mm}`;
}

export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`|~\[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Espace fine entre milliers, à la française : « 3 140 » */
export function frNumber(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ");
}

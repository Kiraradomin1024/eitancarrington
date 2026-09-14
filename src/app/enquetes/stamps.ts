import type { InvestigationStatus } from "@/lib/types";

/** Le tampon posé sur la chemise d'un dossier d'enquête */
export const INVESTIGATION_STAMP: Record<
  InvestigationStatus,
  { word: string; tone: string; border: "solid" | "double" | "dashed" }
> = {
  open: { word: "ouverte", tone: "var(--pen-violet)", border: "solid" },
  in_progress: { word: "en cours", tone: "var(--pen-red)", border: "double" },
  closed: { word: "résolue", tone: "var(--pen-green)", border: "solid" },
  cold: { word: "au point mort", tone: "var(--pen-dust)", border: "dashed" },
};

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { STATUS_INK } from "@/lib/ink";
import {
  INVESTIGATION_STATUS_LABELS,
  ISSUE_SEVERITY_LABELS,
  MAP_CATEGORY_LABELS,
  type InvestigationStatus,
  type IssueSeverity,
  type MapCategory,
  type NpcStatus,
} from "@/lib/types";

/**
 * Index compact de tout ce qui est noté dans le cahier, pour la recherche
 * globale. Lu avec la clé publique (lecture ouverte à tous par RLS), sans
 * cookies : la réponse peut donc être mise en cache et régénérée toutes
 * les cinq minutes, ce qui garde la recherche gratuite côté Vercel.
 */
export const revalidate = 300;

export type SearchEntry = {
  kind: "Personne" | "Jour" | "Enquête" | "Souci" | "Lieu";
  label: string;
  /** Mots en plus qui matchent sans s'afficher */
  extra?: string;
  meta: string;
  tone: string;
  href: string;
};

const INV_TONE: Record<InvestigationStatus, string> = {
  open: "var(--pen-violet)",
  in_progress: "var(--pen-violet)",
  closed: "var(--pen-green)",
  cold: "var(--pen-grey)",
};
const SEVERITY_TONE: Record<IssueSeverity, string> = {
  low: "var(--pen-grey)",
  medium: "var(--pen-amber)",
  high: "var(--pen-red)",
  critical: "var(--pen-red)",
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entries: [] });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const [npcs, days, invs, issues, markers] = await Promise.all([
    supabase.from("npcs").select("id, slug, name, status, occupation, family").order("name"),
    supabase
      .from("days")
      .select("id, slug, day_number, title, date")
      .order("date", { ascending: false }),
    supabase.from("investigations").select("id, slug, title, status"),
    supabase.from("issues").select("id, title, severity, status"),
    supabase.from("map_markers").select("id, label, category"),
  ]);

  const entries: SearchEntry[] = [
    {
      kind: "Personne",
      label: "Eitan Carrington",
      extra: "moi richman lane",
      meta: "moi",
      tone: "var(--ink)",
      href: "/wiki/eitan",
    },
  ];

  for (const n of (npcs.data ?? []) as {
    id: string;
    slug: string | null;
    name: string;
    status: NpcStatus;
    occupation: string | null;
    family: string | null;
  }[]) {
    const ink = STATUS_INK[n.status] ?? STATUS_INK.unknown;
    entries.push({
      kind: "Personne",
      label: n.name,
      extra: [n.occupation, n.family].filter(Boolean).join(" "),
      meta: n.status === "dead" ? "en mémoire" : ink.stamp,
      tone: ink.tone,
      href: `/wiki/${n.slug ?? n.id}`,
    });
  }

  for (const d of (days.data ?? []) as {
    id: string;
    slug: string | null;
    day_number: number | null;
    title: string;
    date: string;
  }[]) {
    const dt = new Date(d.date);
    entries.push({
      kind: "Jour",
      label: d.day_number ? `Jour ${d.day_number} — ${d.title}` : d.title,
      meta: `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`,
      tone: "var(--typed)",
      href: `/journal/${d.slug ?? d.id}`,
    });
  }

  for (const i of (invs.data ?? []) as {
    id: string;
    slug: string | null;
    title: string;
    status: InvestigationStatus;
  }[]) {
    entries.push({
      kind: "Enquête",
      label: i.title,
      meta: INVESTIGATION_STATUS_LABELS[i.status]?.toLowerCase() ?? "",
      tone: INV_TONE[i.status] ?? "var(--pen-violet)",
      href: `/enquetes/${i.slug ?? i.id}`,
    });
  }

  for (const s of (issues.data ?? []) as {
    id: string;
    title: string;
    severity: IssueSeverity;
    status: string;
  }[]) {
    entries.push({
      kind: "Souci",
      label: s.title,
      meta:
        s.status === "resolved"
          ? "résolu"
          : ISSUE_SEVERITY_LABELS[s.severity]?.toLowerCase() ?? "",
      tone: s.status === "resolved" ? "var(--pen-green)" : SEVERITY_TONE[s.severity],
      href: `/soucis#souci-${s.id}`,
    });
  }

  for (const m of (markers.data ?? []) as {
    id: string;
    label: string;
    category: MapCategory;
  }[]) {
    entries.push({
      kind: "Lieu",
      label: m.label,
      meta: MAP_CATEGORY_LABELS[m.category]?.toLowerCase() ?? "",
      tone: m.category === "danger" ? "var(--pen-red)" : "var(--typed)",
      href: `/map?lieu=${m.id}`,
    });
  }

  return NextResponse.json({ entries });
}

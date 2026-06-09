/**
 * Three layout strategies for the mindmap. Each takes the same input
 * (main character + NPCs + relations) and returns a Map of node id → {x,y}.
 *
 *   - "dagre"     : graph auto-layout — minimizes edge crossings, packs nodes
 *                   logically based on the relation graph
 *   - "family"    : groups NPCs by their `family` field, each cluster placed
 *                   in its own region around Eitan
 *   - "intimacy"  : concentric rings keyed off relation type & intensity —
 *                   close family / strong friends near Eitan, ennemis far out
 */

import dagre from "dagre";
import type { Npc, Relation } from "@/lib/types";

export type LayoutKind = "dagre" | "family" | "intimacy";

export type LayoutPositions = Map<string, { x: number; y: number }>;

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;
const MAIN_WIDTH = 240;
const MAIN_HEIGHT = 180;

/* ────────────────────────────────────────────────────────────
 * 1) Dagre auto-layout
 * ──────────────────────────────────────────────────────────── */
export function dagreLayout(
  npcs: Npc[],
  relations: Relation[]
): LayoutPositions {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB", // top to bottom
    nodesep: 60,
    ranksep: 110,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  g.setNode("MAIN", { width: MAIN_WIDTH, height: MAIN_HEIGHT });
  for (const n of npcs) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const r of relations) {
    const source = r.source_npc_id ?? "MAIN";
    if (g.hasNode(source) && g.hasNode(r.target_npc_id)) {
      g.setEdge(source, r.target_npc_id);
    }
  }

  dagre.layout(g);

  const out: LayoutPositions = new Map();
  g.nodes().forEach((id) => {
    const node = g.node(id);
    if (node) out.set(id, { x: node.x, y: node.y });
  });
  return out;
}

/* ────────────────────────────────────────────────────────────
 * 2) Family clusters
 * ──────────────────────────────────────────────────────────── */
export function familyClusterLayout(
  npcs: Npc[],
  _relations: Relation[]
): LayoutPositions {
  // Group NPCs by family (or by "Sans famille" / occupation if missing)
  const groups = new Map<string, Npc[]>();
  for (const n of npcs) {
    const key = n.family?.trim() || n.neighborhood?.trim() || "Sans famille";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  // Sort groups by size descending so big clusters get more central placement
  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const out: LayoutPositions = new Map();
  out.set("MAIN", { x: 0, y: 0 });

  const baseRadius = 600;
  const groupCount = sortedGroups.length || 1;

  sortedGroups.forEach(([, members], gi) => {
    const angle = (gi / groupCount) * Math.PI * 2 - Math.PI / 2;
    const groupCenterX = Math.cos(angle) * baseRadius;
    const groupCenterY = Math.sin(angle) * baseRadius;

    // Lay members of the group in a tight inner ring around their cluster center
    const memberCount = members.length;
    if (memberCount === 1) {
      out.set(members[0].id, { x: groupCenterX, y: groupCenterY });
      return;
    }

    const innerRadius = 90 + memberCount * 18;
    members.forEach((m, mi) => {
      const a = (mi / memberCount) * Math.PI * 2;
      out.set(m.id, {
        x: groupCenterX + Math.cos(a) * innerRadius,
        y: groupCenterY + Math.sin(a) * innerRadius,
      });
    });
  });

  return out;
}

/* ────────────────────────────────────────────────────────────
 * 3) Intimacy rings
 * ──────────────────────────────────────────────────────────── */
const INTIMACY_BANDS: Record<string, number> = {
  // band index — 0 = closest, 3 = farthest
  family: 0,
  romance: 0,
  friend: 1,
  mentor: 1,
  business: 2,
  contact: 2,
  rival: 3,
  enemy: 3,
  other: 2,
};

export function intimacyRingsLayout(
  npcs: Npc[],
  relations: Relation[]
): LayoutPositions {
  // Find each NPC's strongest relation type with the main character
  const directRel = new Map<string, { type: string; intensity: number }>();
  for (const r of relations) {
    if (r.source_npc_id !== null) continue; // only Eitan-anchored
    const cur = directRel.get(r.target_npc_id);
    if (!cur || Math.abs(r.intensity) > Math.abs(cur.intensity)) {
      directRel.set(r.target_npc_id, {
        type: r.type,
        intensity: r.intensity ?? 0,
      });
    }
  }

  // Bucket NPCs by band
  const bands: Npc[][] = [[], [], [], []];
  for (const n of npcs) {
    const rel = directRel.get(n.id);
    let band: number;
    if (!rel) {
      band = 3; // unknown / no direct relation → outer
    } else {
      band = INTIMACY_BANDS[rel.type] ?? 2;
      // Bump up if strong negative intensity (push enemies further)
      if (rel.intensity <= -3) band = 3;
      // Pull strongly positive ones inward
      if (rel.intensity >= 4 && band > 0) band = Math.max(0, band - 1);
    }
    bands[band].push(n);
  }

  const out: LayoutPositions = new Map();
  out.set("MAIN", { x: 0, y: 0 });

  const radii = [260, 480, 720, 980];
  bands.forEach((bandNpcs, bi) => {
    const r = radii[bi];
    const count = bandNpcs.length || 1;
    bandNpcs.forEach((n, i) => {
      // Slight angular offset per band so they don't all line up
      const offset = bi * 0.18;
      const a = (i / count) * Math.PI * 2 + offset;
      out.set(n.id, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    });
  });

  return out;
}

/* ────────────────────────────────────────────────────────────
 * Dispatcher
 * ──────────────────────────────────────────────────────────── */
export function computeLayout(
  kind: LayoutKind,
  npcs: Npc[],
  relations: Relation[]
): LayoutPositions {
  switch (kind) {
    case "dagre":
      return dagreLayout(npcs, relations);
    case "family":
      return familyClusterLayout(npcs, relations);
    case "intimacy":
      return intimacyRingsLayout(npcs, relations);
  }
}

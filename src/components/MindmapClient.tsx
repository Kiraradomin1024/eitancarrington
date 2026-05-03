"use client";

import { useMemo, useCallback, memo, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Character, Npc, Relation } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveMyLayout, resetMyLayout } from "@/app/mindmap/actions";

/* ── Relation edge colors ── */
const TYPE_COLOR: Record<string, string> = {
  family: "#7c5dfa",
  friend: "#5db98a",
  enemy: "#e35d6a",
  romance: "#f472b6",
  business: "#5e9bbf",
  contact: "#9c95ad",
  rival: "#d4a04e",
  mentor: "#c084fc",
  other: "#9c95ad",
};

/* ── NPC Card Node ── */
type NpcNodeData = {
  id: string;
  slug: string | null;
  name: string;
  photoUrl: string | null;
  family: string | null;
  occupation: string | null;
  note: string;
  status: string;
  canEdit: boolean;
};

const NpcNode = memo(function NpcNode({ data }: { data: NpcNodeData }) {
  const subtitle = data.family || data.occupation || null;
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(data.note || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function saveNote() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("npcs")
        .update({ mindmap_note: note || null })
        .eq("id", data.id);
    } catch {
      // silent fail
    }
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveNote();
    }
    if (e.key === "Escape") {
      setNote(data.note || "");
      setEditing(false);
    }
  }

  return (
    <div className="npc-node">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Photo */}
      <div className="npc-node__photo">
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photoUrl} alt={data.name} />
        ) : (
          <span className="npc-node__initial">{data.name[0]}</span>
        )}
      </div>

      {/* Info */}
      <div className="npc-node__info">
        <div className="npc-node__name-row">
          <span className="npc-node__name">{data.name}</span>
          {data.canEdit && (
            <button
              type="button"
              className="npc-node__edit-btn"
              title="Ajouter / modifier une note"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(!editing);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>
          )}
        </div>
        {subtitle && <div className="npc-node__subtitle">{subtitle}</div>}

        {/* Note display or edit */}
        {editing ? (
          <div className="npc-node__note-edit" onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={inputRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Ajouter une note…"
              className="npc-node__note-input"
            />
            <div className="npc-node__note-actions">
              <button type="button" onClick={saveNote} disabled={saving} className="npc-node__note-save">
                {saving ? "…" : "✓"}
              </button>
              <button type="button" onClick={() => { setNote(data.note || ""); setEditing(false); }} className="npc-node__note-cancel">
                ✕
              </button>
            </div>
          </div>
        ) : (
          note && <div className="npc-node__note">{note}</div>
        )}
      </div>
    </div>
  );
});

/* ── Main Character Node (Eitan) ── */
type MainNodeData = {
  name: string;
  photoUrl: string | null;
};

const MainNode = memo(function MainNode({ data }: { data: MainNodeData }) {
  return (
    <div className="main-node">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      <div className="main-node__photo">
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photoUrl} alt={data.name} />
        ) : (
          <span className="main-node__initial">{data.name[0]}</span>
        )}
      </div>
      <div className="main-node__name">{data.name}</div>
    </div>
  );
});

/* ── Custom node type registry ── */
const nodeTypes = {
  npc: NpcNode,
  main: MainNode,
};

/* ── Component ── */
export function MindmapClient({
  mainCharacter,
  npcs,
  relations,
  canEdit = false,
  isLoggedIn = false,
  savedLayout = {},
}: {
  mainCharacter: Pick<Character, "id" | "name" | "photo_url">;
  npcs: Npc[];
  relations: Relation[];
  canEdit?: boolean;
  isLoggedIn?: boolean;
  savedLayout?: Record<string, { x: number; y: number }>;
}) {
  const router = useRouter();
  const hasSaved = Object.keys(savedLayout).length > 0;
  const [savePending, setSavePending] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"full" | "explore">("full");
  const [focusId, setFocusId] = useState<string>("MAIN");
  const [filterFamily, setFilterFamily] = useState<string>("");
  const [filterRelType, setFilterRelType] = useState<string>("");
  const [search, setSearch] = useState("");

  // Quick lookups
  const npcById = useMemo(
    () => new Map(npcs.map((n) => [n.id, n])),
    [npcs]
  );
  const families = useMemo(() => {
    const set = new Set<string>();
    npcs.forEach((n) => {
      if (n.family) set.add(n.family);
    });
    return Array.from(set).sort();
  }, [npcs]);
  const relTypes = useMemo(() => {
    const set = new Set<string>();
    relations.forEach((r) => set.add(r.type));
    return Array.from(set).sort();
  }, [relations]);

  // In explore mode: compute the focus' name + visible neighbors after filters
  const focusName = useMemo(() => {
    if (focusId === "MAIN") return mainCharacter.name;
    return npcById.get(focusId)?.name ?? "?";
  }, [focusId, mainCharacter.name, npcById]);

  const exploreView = useMemo(() => {
    if (mode !== "explore") return null;
    const visibleIds = new Set<string>([focusId]);
    const visibleRels: Relation[] = [];
    const seenPairs = new Set<string>();
    for (const r of relations) {
      const src = r.source_npc_id ?? "MAIN";
      const tgt = r.target_npc_id;
      if (src !== focusId && tgt !== focusId) continue;
      if (filterRelType && r.type !== filterRelType) continue;
      const otherId = src === focusId ? tgt : src;
      if (otherId !== "MAIN" && filterFamily) {
        const otherNpc = npcById.get(otherId);
        if (otherNpc?.family !== filterFamily) continue;
      }
      const pairKey = [src, tgt].sort().join("::");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      visibleIds.add(src);
      visibleIds.add(tgt);
      visibleRels.push(r);
    }
    return { visibleIds, visibleRels };
  }, [mode, focusId, filterFamily, filterRelType, relations, npcById]);

  // Search results — top 8 matches by name
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return npcs
      .filter((n) => n.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, npcs]);

  // Default layout: concentric rings — inner = NPCs directly tied to Eitan,
  // outer = the rest. User-saved positions override per node (full mode only).
  const positions = useMemo(() => {
    if (mode === "explore" && exploreView) {
      // Focus at center, neighbors in a single tidy ring around it
      const out = new Map<string, { x: number; y: number }>();
      out.set(focusId, { x: 0, y: 0 });
      const neighbors = Array.from(exploreView.visibleIds).filter(
        (id) => id !== focusId
      );
      const count = neighbors.length || 1;
      const radius = Math.max(320, 220 + neighbors.length * 14);
      neighbors.forEach((id, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        out.set(id, { x: Math.cos(a) * radius, y: Math.sin(a) * radius });
      });
      return out;
    }

    const out = new Map<string, { x: number; y: number }>();
    const directlyLinked = new Set<string>();
    relations.forEach((r) => {
      // Eitan is encoded as source_npc_id=null. Treat the relation as
      // touching Eitan in either direction (target_npc_id is never null
      // for Eitan, but be defensive).
      if (!r.source_npc_id && r.target_npc_id) {
        directlyLinked.add(r.target_npc_id);
      }
    });
    const inner = npcs.filter((n) => directlyLinked.has(n.id));
    const outer = npcs.filter((n) => !directlyLinked.has(n.id));

    out.set("MAIN", { x: 0, y: 0 });

    function ring(items: Npc[], radius: number, offset = 0) {
      const count = items.length || 1;
      items.forEach((npc, i) => {
        const a = (i / count) * Math.PI * 2 + offset;
        out.set(npc.id, {
          x: Math.cos(a) * radius,
          y: Math.sin(a) * radius,
        });
      });
    }
    ring(inner, 380);
    ring(outer, 680, 0.3);

    // Apply user's saved overrides (full mode only)
    if (hasSaved) {
      for (const [id, pos] of Object.entries(savedLayout)) {
        out.set(id, pos);
      }
    }
    return out;
  }, [
    mode,
    exploreView,
    focusId,
    npcs,
    relations,
    hasSaved,
    savedLayout,
  ]);

  const initial = useMemo(() => {
    const mainPos = positions.get("MAIN") ?? { x: 0, y: 0 };
    const visibleSet = exploreView?.visibleIds ?? null;

    const npcNodes: Node[] = npcs
      .filter((npc) => !visibleSet || visibleSet.has(npc.id))
      .map((npc) => {
        const pos = positions.get(npc.id) ?? { x: 0, y: 0 };
        return {
          id: npc.id,
          type: "npc",
          position: pos,
          data: {
            id: npc.id,
            slug: npc.slug,
            name: npc.name,
            photoUrl: npc.photo_url,
            family: npc.family,
            occupation: npc.occupation,
            note: (npc as Npc & { mindmap_note?: string }).mindmap_note ?? "",
            status: npc.status,
            canEdit,
          } satisfies NpcNodeData,
        };
      });

    const nodes: Node[] = [];
    if (!visibleSet || visibleSet.has("MAIN")) {
      nodes.push({
        id: "MAIN",
        type: "main",
        position: mainPos,
        data: {
          name: mainCharacter.name,
          photoUrl: mainCharacter.photo_url,
        } satisfies MainNodeData,
      });
    }
    nodes.push(...npcNodes);

    const allVisibleRels = exploreView ? exploreView.visibleRels : relations;
    // Dedupe edges so A↔B is rendered once even if both directions exist.
    const seenPairs = new Set<string>();
    const visibleRels = allVisibleRels.filter((r) => {
      const src = r.source_npc_id ?? "MAIN";
      const tgt = r.target_npc_id;
      const pairKey = [src, tgt].sort().join("::");
      if (seenPairs.has(pairKey)) return false;
      seenPairs.add(pairKey);
      return true;
    });
    const edges: Edge[] = visibleRels.map((r) => ({
      id: r.id,
      source: r.source_npc_id ?? "MAIN",
      target: r.target_npc_id,
      label: RELATION_LABELS[r.type],
      labelStyle: {
        fill: "#7a7388",
        fontSize: 11,
        fontFamily: "Inter, system-ui",
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.9,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [6, 3] as [number, number],
      style: {
        stroke: TYPE_COLOR[r.type] ?? "#666",
        strokeWidth: 1.5 + Math.abs(r.intensity ?? 0) * 0.4,
      },
      animated: r.type === "enemy" || r.type === "rival",
    }));

    return { nodes, edges };
  }, [mainCharacter, npcs, relations, canEdit, positions, exploreView]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // Rebuild nodes/edges whenever the visible graph changes
  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial.nodes, initial.edges, setNodes, setEdges]);

  async function onSave() {
    setSavePending(true);
    setSaveMsg(null);
    try {
      const positions = nodes.map((n) => ({
        node_id: n.id,
        x: n.position.x,
        y: n.position.y,
      }));
      await saveMyLayout(positions);
      setSaveMsg("Layout enregistré ✓");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavePending(false);
    }
  }

  async function onReset() {
    if (!window.confirm("Revenir au layout par défaut ?")) return;
    setSavePending(true);
    setSaveMsg(null);
    try {
      await resetMyLayout();
      // Force re-render with default positions
      router.refresh();
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavePending(false);
    }
  }

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (mode === "explore") {
        // In explore mode, clicking refocuses on that node instead of
        // navigating to the wiki. Use the dedicated "Voir la fiche" button
        // in the toolbar to go to the wiki.
        if (node.id !== focusId) setFocusId(node.id);
        return;
      }
      if (node.id === "MAIN") {
        router.push("/wiki/eitan");
      } else {
        const slug = (node.data as NpcNodeData)?.slug;
        router.push(`/wiki/${slug ?? node.id}`);
      }
    },
    [router, mode, focusId]
  );

  const focusedNpc = focusId !== "MAIN" ? npcById.get(focusId) : null;
  const focusHref =
    focusId === "MAIN"
      ? "/wiki/eitan"
      : `/wiki/${focusedNpc?.slug ?? focusId}`;

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 card !p-1 w-fit">
        {(["full", "explore"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "px-4 py-1.5 rounded-full text-xs transition-all " +
              (mode === m
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground")
            }
          >
            {m === "full" ? "Vue complète" : "Exploration"}
          </button>
        ))}
      </div>

      {mode === "full" ? (
        /* ── Toolbar full mode — save / reset perso layout ── */
        <div className="flex flex-wrap items-center gap-3 p-3 card !p-3">
          <span className="text-xs text-muted">
            {hasSaved
              ? "Tu visualises ton layout perso."
              : "Drag les nœuds, sauvegarde ton arrangement."}
          </span>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 ml-auto text-xs">
              {saveMsg && (
                <span className="font-hand text-accent text-base">
                  {saveMsg}
                </span>
              )}
              {hasSaved && (
                <button
                  type="button"
                  onClick={onReset}
                  disabled={savePending}
                  className="px-3 py-1 rounded-full border border-border text-muted hover:text-danger hover:border-danger/40 disabled:opacity-50 transition-all"
                  title="Effacer ton layout perso et revenir au défaut"
                >
                  Réinitialiser
                </button>
              )}
              <button
                type="button"
                onClick={onSave}
                disabled={savePending}
                className="px-4 py-1 rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-all font-medium"
              >
                {savePending ? "..." : "Sauvegarder mon layout"}
              </button>
            </div>
          ) : (
            <span className="ml-auto text-xs text-muted italic">
              Connecte-toi pour sauvegarder ton arrangement perso
            </span>
          )}
        </div>
      ) : (
        /* ── Toolbar explore mode — focus / search / filters ── */
        <div className="card !p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Focus :</span>
            <span className="font-medium text-foreground">{focusName}</span>
            <a
              href={focusHref}
              className="text-accent hover:underline"
              title="Ouvrir la fiche complète"
            >
              → Voir la fiche
            </a>
            {focusId !== "MAIN" && (
              <button
                type="button"
                onClick={() => setFocusId("MAIN")}
                className="ml-2 px-3 py-1 rounded-full border border-border text-muted hover:text-foreground hover:border-accent/40 transition-all"
              >
                ← Retour à Eitan
              </button>
            )}
            <span className="ml-auto text-muted italic">
              Clique un nœud pour le mettre au centre
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un perso…"
                className="!py-1.5 !text-sm"
              />
              {searchResults.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-auto bg-surface border border-border rounded-lg shadow-lg z-20">
                  {searchResults.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusId(n.id);
                          setSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent-soft hover:text-accent"
                      >
                        {n.name}
                        {n.family && (
                          <span className="text-muted ml-2 text-xs">
                            · {n.family}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Family filter */}
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
              className="!py-1.5 !text-sm !w-auto"
            >
              <option value="">Toutes les familles</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {/* Relation type filter */}
            <select
              value={filterRelType}
              onChange={(e) => setFilterRelType(e.target.value)}
              className="!py-1.5 !text-sm !w-auto"
            >
              <option value="">Tous les types</option>
              {relTypes.map((t) => (
                <option key={t} value={t}>
                  {RELATION_LABELS[t as keyof typeof RELATION_LABELS] ?? t}
                </option>
              ))}
            </select>

            {(filterFamily || filterRelType) && (
              <button
                type="button"
                onClick={() => {
                  setFilterFamily("");
                  setFilterRelType("");
                }}
                className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-danger transition-all"
              >
                × filtres
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className="w-full h-[78vh] rounded-2xl border border-border overflow-hidden card !p-0"
        style={{
          background: "linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)",
        }}
      >
      <ReactFlow
        key={
          mode === "explore"
            ? `explore-${focusId}-${filterFamily}-${filterRelType}`
            : "full"
        }
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="var(--border)" gap={24} />
        <Controls
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
          maskColor="rgba(0,0,0,0.1)"
          nodeColor={(n) => (n.id === "MAIN" ? "#7c5dfa" : "#c084fc")}
        />
      </ReactFlow>
      </div>
    </div>
  );
}

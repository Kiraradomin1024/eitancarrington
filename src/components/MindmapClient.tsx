"use client";

import { useMemo, useCallback, memo, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  type EdgeProps,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Character, Npc, NpcStatus, Relation, RelationType } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { RELATION_INK, SILENT_INK, STATUS_INK } from "@/lib/ink";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveMyLayout, resetMyLayout } from "@/app/mindmap/actions";

/* Poignées invisibles au centre des bulles : les traits partent du milieu
   et disparaissent sous le papier de la bulle. */
const CENTER_HANDLE = {
  top: "50%",
  left: "50%",
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  background: "transparent",
  transform: "translate(-50%, -50%)",
} as const;

/* ── Bulle d'un personnage ── */
type NpcNodeData = {
  id: string;
  slug: string | null;
  name: string;
  photoUrl: string | null;
  sub: string;
  note: string;
  status: NpcStatus;
  canEdit: boolean;
};

const NpcNode = memo(function NpcNode({ data }: { data: NpcNodeData }) {
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
      // échec silencieux
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
    <div className={`pencil-node pencil-node--${data.status}`} data-no-lightbox="">
      <Handle type="target" position={Position.Top} style={CENTER_HANDLE} />
      <Handle type="source" position={Position.Bottom} style={CENTER_HANDLE} />

      <div className="pencil-node__photo">
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photoUrl} alt={data.name} data-no-lightbox="" />
        ) : (
          <span className="pencil-node__initial">
            {data.status === "unknown" ? "?" : data.name[0]}
          </span>
        )}
      </div>

      <div className="pencil-node__text">
        <div className="pencil-node__name">{data.name}</div>
        {data.sub && <div className="pencil-node__sub">{data.sub}</div>}
        {editing ? (
          <div className="pencil-node__note-edit" onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={inputRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="une note au crayon…"
            />
            <div className="pencil-node__note-actions">
              <button
                type="button"
                onClick={() => {
                  setNote(data.note || "");
                  setEditing(false);
                }}
              >
                non
              </button>
              <button type="button" onClick={saveNote} disabled={saving}>
                {saving ? "…" : "noter"}
              </button>
            </div>
          </div>
        ) : (
          note && <div className="pencil-node__note">{note}</div>
        )}
      </div>

      {data.canEdit && !editing && (
        <button
          type="button"
          className="pencil-node__pen"
          title="Ajouter ou corriger une note"
          aria-label={`Note sur ${data.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden>
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </button>
      )}
    </div>
  );
});

/* ── moi, au centre ── */
type MainNodeData = {
  name: string;
  photoUrl: string | null;
};

const MainNode = memo(function MainNode({ data }: { data: MainNodeData }) {
  return (
    <div className="pencil-node pencil-node--main" data-no-lightbox="">
      <Handle type="target" position={Position.Top} style={CENTER_HANDLE} />
      <Handle type="source" position={Position.Bottom} style={CENTER_HANDLE} />
      <div className="pencil-node__photo">
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photoUrl} alt={data.name} data-no-lightbox="" />
        ) : (
          <span className="pencil-node__initial">E</span>
        )}
      </div>
      <div className="pencil-node__text">
        <div className="pencil-node__name">moi</div>
        <div className="pencil-node__sub">Richman Lane</div>
      </div>
    </div>
  );
});

/* ── Trait au crayon : plein, double, rayé, pointillé ── */
type PencilEdgeData = {
  type: RelationType;
  silent: boolean;
  label: string;
  showLabel: boolean;
};

function PencilEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<PencilEdgeData>) {
  if (!data) return null;
  const ink = RELATION_INK[data.type];
  const color = data.silent ? SILENT_INK.color : ink.color;
  const dash = data.silent ? SILENT_INK.dash : ink.dash;
  const width = data.silent ? SILENT_INK.width : ink.width;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 2.4;
  const ny = (dx / len) * 2.4;
  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;

  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeDasharray: dash,
    opacity: 0.85,
  };

  return (
    <g>
      {!data.silent && ink.double ? (
        <>
          <path id={id} d={`M${sourceX + nx},${sourceY + ny} L${targetX + nx},${targetY + ny}`} {...common} />
          <path d={`M${sourceX - nx},${sourceY - ny} L${targetX - nx},${targetY - ny}`} {...common} />
        </>
      ) : (
        <path id={id} d={`M${sourceX},${sourceY} L${targetX},${targetY}`} {...common} />
      )}
      {data.showLabel && (
        <text x={mx} y={my - 6} textAnchor="middle" className="pencil-edge-label">
          {data.label}
        </text>
      )}
    </g>
  );
}

const nodeTypes = {
  npc: NpcNode,
  main: MainNode,
};
const edgeTypes = {
  pencil: PencilEdge,
};

const LEGEND: { label: string; type?: RelationType; silent?: boolean }[] = [
  { label: "ami, proche", type: "friend" },
  { label: "famille", type: "family" },
  { label: "affaires", type: "business" },
  { label: "romance", type: "romance" },
  { label: "ennemi, rival", type: "enemy" },
  { label: "ceux qui ne répondent plus", silent: true },
];

/* ── Composant ── */
export function MindmapClient({
  mainCharacter,
  npcs,
  relations,
  canEdit = false,
  isLoggedIn = false,
  savedLayout = {},
  hasUserLayout = false,
}: {
  mainCharacter: Pick<Character, "id" | "name" | "photo_url">;
  npcs: Npc[];
  relations: Relation[];
  canEdit?: boolean;
  isLoggedIn?: boolean;
  savedLayout?: Record<string, { x: number; y: number }>;
  hasUserLayout?: boolean;
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

  /* Ce que chaque personnage est pour moi, quand c'est écrit */
  const tieToMe = useMemo(() => {
    const m = new Map<string, RelationType>();
    relations.forEach((r) => {
      if (!r.source_npc_id) m.set(r.target_npc_id, r.type);
    });
    return m;
  }, [relations]);

  const focusName = useMemo(() => {
    if (focusId === "MAIN") return "moi";
    return npcById.get(focusId)?.name ?? "?";
  }, [focusId, npcById]);

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

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const q = norm(search);
    return npcs.filter((n) => norm(n.name).includes(q)).slice(0, 8);
  }, [search, npcs]);

  // Disposition par défaut : deux cercles, les proches d'abord, le reste
  // autour. Les positions enregistrées l'emportent (vue complète seulement).
  const positions = useMemo(() => {
    if (mode === "explore" && exploreView) {
      const out = new Map<string, { x: number; y: number }>();
      out.set(focusId, { x: 0, y: 0 });
      const neighbors = Array.from(exploreView.visibleIds).filter(
        (id) => id !== focusId
      );
      const count = neighbors.length || 1;
      const radius = Math.max(340, 240 + neighbors.length * 16);
      neighbors.forEach((id, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        out.set(id, { x: Math.cos(a) * radius, y: Math.sin(a) * radius });
      });
      return out;
    }

    const out = new Map<string, { x: number; y: number }>();
    const directlyLinked = new Set<string>();
    relations.forEach((r) => {
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
    ring(inner, 400);
    ring(outer, 720, 0.3);

    if (hasSaved) {
      for (const [id, pos] of Object.entries(savedLayout)) {
        out.set(id, pos);
      }
    }
    return out;
  }, [mode, exploreView, focusId, npcs, relations, hasSaved, savedLayout]);

  const initial = useMemo(() => {
    const mainPos = positions.get("MAIN") ?? { x: 0, y: 0 };
    const visibleSet = exploreView?.visibleIds ?? null;

    const npcNodes: Node[] = npcs
      .filter((npc) => !visibleSet || visibleSet.has(npc.id))
      .map((npc) => {
        const pos = positions.get(npc.id) ?? { x: 0, y: 0 };
        const tie = tieToMe.get(npc.id);
        const sub =
          npc.status !== "alive"
            ? STATUS_INK[npc.status].note
            : tie
              ? RELATION_INK[tie].word
              : npc.occupation ?? npc.family ?? "";
        return {
          id: npc.id,
          type: "npc",
          position: pos,
          data: {
            id: npc.id,
            slug: npc.slug,
            name: npc.name,
            photoUrl: npc.photo_url,
            sub,
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
    // Un seul trait par paire, même si le lien est noté dans les deux sens
    const seenPairs = new Set<string>();
    const visibleRels = allVisibleRels.filter((r) => {
      const src = r.source_npc_id ?? "MAIN";
      const tgt = r.target_npc_id;
      const pairKey = [src, tgt].sort().join("::");
      if (seenPairs.has(pairKey)) return false;
      seenPairs.add(pairKey);
      return true;
    });
    const edges: Edge[] = visibleRels.map((r) => {
      const src = r.source_npc_id ? npcById.get(r.source_npc_id) : null;
      const tgt = npcById.get(r.target_npc_id);
      const silent = src?.status === "dead" || tgt?.status === "dead";
      return {
        id: r.id,
        source: r.source_npc_id ?? "MAIN",
        target: r.target_npc_id,
        type: "pencil",
        data: {
          type: r.type,
          silent,
          label: RELATION_LABELS[r.type].toLowerCase(),
          showLabel: mode === "explore",
        } satisfies PencilEdgeData,
      };
    });

    return { nodes, edges };
  }, [mainCharacter, npcs, relations, canEdit, positions, exploreView, tieToMe, npcById, mode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

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
      setSaveMsg("c'est noté, ça reste comme ça");
      setTimeout(() => setSaveMsg(null), 2600);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavePending(false);
    }
  }

  async function onReset() {
    if (!window.confirm("Effacer ta disposition et revenir au schéma par défaut ?")) return;
    setSavePending(true);
    setSaveMsg(null);
    try {
      await resetMyLayout();
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
        // En exploration, cliquer une bulle la met au centre
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
    <div data-no-lightbox="">
      {/* En-tête manuscrit et bascule de mode */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-6">
        <div>
          <h1 className="hand text-[34px] md:text-[38px] font-semibold leading-none">
            comment tout se tient
          </h1>
          <p className="hand text-[20px] md:text-[21px] text-ink-soft mt-1">
            je redessine cette page tous les deux mois
          </p>
        </div>
        <div className="md:text-right">
          <div>
            <button
              type="button"
              className="hand-toggle"
              data-active={mode === "full"}
              onClick={() => setMode("full")}
            >
              tout le schéma
            </button>
          </div>
          <div>
            <button
              type="button"
              className="hand-toggle"
              data-active={mode === "explore"}
              onClick={() => setMode("explore")}
            >
              ou juste autour de quelqu&apos;un
            </button>
          </div>
        </div>
      </div>

      {mode === "explore" && (
        <div className="mb-5 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-8">
          <div className="hand text-[21px] leading-snug min-w-0">
            autour de{" "}
            <a href={focusHref} className="font-semibold underline decoration-2 underline-offset-4">
              {focusName}
            </a>
            {focusId !== "MAIN" && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setFocusId("MAIN")}
                  className="text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  revenir à moi
                </button>
              </>
            )}
            <div className="text-[18px] text-ink-faint">
              clique une bulle pour la mettre au milieu
            </div>
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-[360px]">
            <div className="hand-line">
              <span className="hand-line__lead">je cherche…</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="un nom"
                aria-label="Chercher quelqu'un"
              />
            </div>
            {searchResults.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-auto sheet z-20 py-1">
                {searchResults.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusId(n.id);
                        setSearch("");
                      }}
                      className="w-full text-left px-3 py-0.5 hand text-[20px] hover:bg-surface-2"
                    >
                      {n.name}
                      {n.family && (
                        <span className="text-ink-faint text-[17px]"> · {n.family}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
              className="!w-auto"
              aria-label="Filtrer par famille"
            >
              <option value="">toutes les familles</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              value={filterRelType}
              onChange={(e) => setFilterRelType(e.target.value)}
              className="!w-auto"
              aria-label="Filtrer par type de lien"
            >
              <option value="">tous les liens</option>
              {relTypes.map((t) => (
                <option key={t} value={t}>
                  {RELATION_INK[t as RelationType]?.word ?? t}
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
                className="hand text-[19px] text-pen-red underline underline-offset-4"
              >
                effacer
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pencil-board w-full h-[520px] md:h-[78vh]">
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
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.15}
          maxZoom={2}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-between">
        <div className="sheet sheet--stapled px-5 pt-8 pb-5 w-full max-w-[320px]" style={{ transform: "rotate(-1.4deg)" }}>
          <span className="tape" style={{ top: -11, left: 110, transform: "rotate(-3deg)" }} />
          <div className="typed">ce que veut dire chaque trait</div>
          <div className="sheet__rule" />
          <ul className="flex flex-col gap-2 hand text-[19px]">
            {LEGEND.map((l) => {
              const ink = l.silent ? SILENT_INK : RELATION_INK[l.type!];
              const isDouble = !l.silent && l.type && RELATION_INK[l.type].double;
              return (
                <li key={l.label} className="flex items-center gap-2.5">
                  <svg width="44" height="8" className="shrink-0" aria-hidden>
                    {isDouble ? (
                      <>
                        <line x1="0" y1="1.5" x2="44" y2="1.5" stroke={ink.color} strokeWidth={1.5} />
                        <line x1="0" y1="6.5" x2="44" y2="6.5" stroke={ink.color} strokeWidth={1.5} />
                      </>
                    ) : (
                      <line
                        x1="0"
                        y1="4"
                        x2="44"
                        y2="4"
                        stroke={ink.color}
                        strokeWidth={ink.width}
                        strokeDasharray={"dash" in ink ? ink.dash : undefined}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {l.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:text-right max-w-[320px]">
          <p className="hand text-[20px] leading-[26px] text-pen-red" style={{ transform: "rotate(1.4deg)" }}>
            on peut déplacer les bulles, ça reste où je les ai mises
          </p>
          {mode === "full" && (
            <div className="mt-4 hand text-[19px] text-ink-soft">
              {isLoggedIn ? (
                <div className="flex lg:justify-end gap-5 flex-wrap items-baseline">
                  {hasUserLayout && (
                    <button
                      type="button"
                      onClick={onReset}
                      disabled={savePending}
                      className="underline underline-offset-4 hover:text-pen-red disabled:opacity-50"
                    >
                      tout remettre en place
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={savePending}
                    className="stamp stamp--sm text-ink disabled:opacity-50"
                  >
                    {savePending ? "…" : "garder ma disposition"}
                  </button>
                </div>
              ) : (
                <span>connecte-toi pour garder ta propre disposition</span>
              )}
              {saveMsg && <div className="text-ink mt-2">{saveMsg}</div>}
            </div>
          )}
          <p className="hand text-[19px] text-ink-faint mt-4">
            la liste au propre :{" "}
            <a href="/relations" className="underline underline-offset-4 hover:text-ink">
              toutes les relations
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

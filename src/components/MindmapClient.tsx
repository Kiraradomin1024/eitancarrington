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
}: {
  mainCharacter: Pick<Character, "id" | "name" | "photo_url">;
  npcs: Npc[];
  relations: Relation[];
  canEdit?: boolean;
}) {
  const router = useRouter();

  const initial = useMemo(() => {
    const cx = 0;
    const cy = 0;

    const directlyLinked = new Set<string>();
    relations.forEach((r) => {
      if (!r.source_npc_id) directlyLinked.add(r.target_npc_id);
    });

    const inner = npcs.filter((n) => directlyLinked.has(n.id));
    const outer = npcs.filter((n) => !directlyLinked.has(n.id));

    function ring(items: Npc[], radius: number, offset = 0): Node[] {
      const count = items.length || 1;
      return items.map((npc, i) => {
        const a = (i / count) * Math.PI * 2 + offset;
        return {
          id: npc.id,
          type: "npc",
          position: {
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
          },
          data: {
            id: npc.id,
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
    }

    const nodes: Node[] = [
      {
        id: "MAIN",
        type: "main",
        position: { x: cx, y: cy },
        data: {
          name: mainCharacter.name,
          photoUrl: mainCharacter.photo_url,
        } satisfies MainNodeData,
      },
      ...ring(inner, 380),
      ...ring(outer, 680, 0.3),
    ];

    const edges: Edge[] = relations.map((r) => ({
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
  }, [mainCharacter, npcs, relations]);

  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.id === "MAIN") {
        router.push("/wiki/eitan");
      } else {
        router.push(`/wiki/${node.id}`);
      }
    },
    [router]
  );

  return (
    <div
      className="w-full h-[80vh] rounded-2xl border border-border overflow-hidden card !p-0"
      style={{
        background: "linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)",
      }}
    >
      <ReactFlow
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
  );
}

"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Character, Npc, Relation } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";

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

export function MindmapClient({
  mainCharacter,
  npcs,
  relations,
}: {
  mainCharacter: Pick<Character, "id" | "name">;
  npcs: Npc[];
  relations: Relation[];
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
      const n = items.length || 1;
      return items.map((npc, i) => {
        const a = (i / n) * Math.PI * 2 + offset;
        return {
          id: npc.id,
          position: { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius },
          data: { label: npc.name, status: npc.status },
          style: {
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #e6dcc4",
            color: "#1a1830",
            borderRadius: 12,
            padding: "10px 14px",
            fontFamily: "Inter, system-ui",
            fontSize: 13,
            minWidth: 120,
            textAlign: "center" as const,
            boxShadow: "0 2px 8px rgba(26,24,48,0.05)",
            backdropFilter: "blur(8px)",
          },
        };
      });
    }

    const nodes: Node[] = [
      {
        id: "MAIN",
        position: { x: cx, y: cy },
        data: { label: mainCharacter.name },
        style: {
          background: "linear-gradient(135deg, #7c5dfa, #c084fc, #f472b6)",
          color: "#fff",
          border: "none",
          borderRadius: 16,
          padding: "14px 20px",
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 18,
          fontWeight: 500,
          minWidth: 180,
          textAlign: "center" as const,
          boxShadow: "0 8px 32px rgba(124,93,250,0.35)",
        },
      },
      ...ring(inner, 280),
      ...ring(outer, 520, 0.3),
    ];

    const edges: Edge[] = relations.map((r) => ({
      id: r.id,
      source: r.source_npc_id ?? "MAIN",
      target: r.target_npc_id,
      label: RELATION_LABELS[r.type],
      labelStyle: {
        fill: "#7a7388",
        fontSize: 10,
        fontFamily: "Inter, system-ui",
      },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
      style: {
        stroke: TYPE_COLOR[r.type] ?? "#666",
        strokeWidth: 1 + Math.abs(r.intensity ?? 0) * 0.4,
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
        router.push("/");
      } else {
        router.push(`/wiki/${node.id}`);
      }
    },
    [router]
  );

  return (
    <div
      className="w-full h-[75vh] rounded-2xl border border-border overflow-hidden card !p-0"
      style={{ background: "linear-gradient(180deg, #faf6ed 0%, #f3ecdc 100%)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d4c8a8" gap={24} />
        <Controls
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid #e6dcc4",
            borderRadius: 8,
            backdropFilter: "blur(8px)",
          }}
        />
        <MiniMap
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid #e6dcc4",
            borderRadius: 8,
          }}
          maskColor="rgba(250,246,237,0.6)"
          nodeColor={(n) => (n.id === "MAIN" ? "#7c5dfa" : "#c084fc")}
        />
      </ReactFlow>
    </div>
  );
}

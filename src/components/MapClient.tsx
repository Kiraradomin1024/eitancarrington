"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MapMarker,
  MapCategory,
  Npc,
  Investigation,
  Character,
} from "@/lib/types";
import {
  MAP_CATEGORY_LABELS,
  MAP_CATEGORY_COLORS,
} from "@/lib/types";
import {
  createMapMarker,
  updateMapMarker,
  deleteMapMarker,
} from "@/app/map/actions";

/**
 * ─── Map background source ──────────────────────────────────────────────
 * Tiles from the plebmasters Forge style. If these ever stop working,
 * swap MAP_TILE_URL for any other Leaflet-compatible Los Santos tile set,
 * or use IMAGE_OVERLAY_URL + set USE_TILES to false.
 */
/**
 * Plebmasters Forge tile servers. Reverse-engineered from forge.plebmasters.de.
 * Each style has its own CRS ("small" or "big") and zoom range.
 */
type TileStyle = "realmap" | "atlas" | "satellite" | "road";
type StyleConfig = {
  label: string;
  url: string;
  maxZoom: number;
  crs: "small" | "big";
};
const STYLES: Record<TileStyle, StyleConfig> = {
  realmap: {
    label: "Realmap",
    url: "https://maps.plebmasters.de/gta5/realmap/M{z}/mapC_{x}_{y}.png",
    maxZoom: 8,
    crs: "big",
  },
  atlas: {
    label: "Atlas",
    url: "https://maps.plebmasters.de/gta5/atlas/{z}/{x}_{y}.png",
    maxZoom: 6,
    crs: "small",
  },
  satellite: {
    label: "Satellite",
    url: "https://maps.plebmasters.de/gta5/satellite/{z}/{x}_{y}.png",
    maxZoom: 6,
    crs: "small",
  },
  road: {
    label: "Route",
    url: "https://maps.plebmasters.de/gta5/road/{z}/{x}_{y}.png",
    maxZoom: 6,
    crs: "small",
  },
};
const DEFAULT_STYLE: TileStyle = "realmap";

/**
 * Custom CRS values extracted from forge.plebmasters.de.
 *   pixel_x =  scale * gameX + offX
 *   pixel_y = -scale * gameY + offY
 */
const CRS_VALUES = {
  small: { scale: 0.0284, offX: 117.7, offY: 239 },
  big: { scale: 0.04444, offX: 157.94, offY: 341.66 },
};

/**
 * GTA V world bounds, in game coordinates (lat = gameX, lng = gameY).
 *   X : -4000 (west) → +4500 (east)
 *   Y : -4500 (south) → +8000 (north)
 */
const GAME_BOUNDS: [[number, number], [number, number]] = [
  [-4000, -4500],
  [4500, 8000],
];

const CATEGORIES: MapCategory[] = [
  "home",
  "work",
  "important",
  "danger",
  "other",
];

/**
 * Lucide-style SVG path content per category. Drawn at 24x24 viewBox,
 * stroke-width 2.4 for crispness at small marker sizes.
 */
const CATEGORY_ICON_PATHS: Record<MapCategory, string> = {
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  important: '<path d="m12 3 2.9 6 6.6.95-4.8 4.7L17.8 21 12 17.8 6.2 21l1.1-6.35L2.5 9.95 9.1 9 12 3Z"/>',
  danger:
    '<path d="m10.3 3.7-8.2 14.2A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  other:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

function categoryIconSvg(category: MapCategory, size = 14, color = "white"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CATEGORY_ICON_PATHS[category]}</svg>`;
}

type LeafletNS = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;

type EditingState =
  | { mode: "create"; x: number; y: number }
  | { mode: "edit"; marker: MapMarker }
  | null;

export function MapClient({
  markers,
  npcs,
  characters,
  investigations,
  canEdit,
}: {
  markers: MapMarker[];
  npcs: Pick<Npc, "id" | "name">[];
  characters: Pick<Character, "id" | "name">[];
  investigations: Pick<Investigation, "id" | "title">[];
  canEdit: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<LeafletNS | null>(null);
  const markerLayerRef = useRef<Record<string, LeafletMarker>>({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);
  const [hidden, setHidden] = useState<Set<MapCategory>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [style, setStyle] = useState<TileStyle>(DEFAULT_STYLE);
  const [mapVersion, setMapVersion] = useState(0);

  const filteredMarkers = useMemo(
    () => markers.filter((m) => !hidden.has(m.category)),
    [markers, hidden]
  );

  // Init Leaflet — re-creates the map whenever the style (and therefore CRS) changes.
  useEffect(() => {
    let cancelled = false;
    let createdMap: LeafletMap | null = null;
    let prevCenter: import("leaflet").LatLng | null = null;
    let prevZoom: number | null = null;

    // Save existing view so we can restore it after recreate
    if (mapRef.current) {
      prevCenter = mapRef.current.getCenter();
      prevZoom = mapRef.current.getZoom();
      mapRef.current.remove();
      mapRef.current = null;
    }

    (async () => {
      const Lmod = await import("leaflet");
      const L = (Lmod.default ?? Lmod) as LeafletNS;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      const cfg = STYLES[style];
      const crsVals = CRS_VALUES[cfg.crs];
      const crs = L.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(
          crsVals.scale,
          crsVals.offX,
          -crsVals.scale,
          crsVals.offY
        ),
        projection: {
          project: (latlng: import("leaflet").LatLng) =>
            new L.Point(latlng.lat, latlng.lng),
          unproject: (point: import("leaflet").Point) =>
            L.latLng(point.x, point.y),
          bounds: L.bounds([-20000, -20000], [20000, 20000]),
        },
        distance: (a: import("leaflet").LatLng, b: import("leaflet").LatLng) => {
          const dx = b.lng - a.lng;
          const dy = b.lat - a.lat;
          return Math.sqrt(dx * dx + dy * dy);
        },
      });

      const map = L.map(containerRef.current, {
        crs,
        minZoom: 0,
        maxZoom: cfg.maxZoom,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        attributionControl: true,
        zoomControl: true,
      });
      createdMap = map;
      mapRef.current = map;

      L.tileLayer(cfg.url, {
        minZoom: 0,
        maxZoom: cfg.maxZoom,
        noWrap: true,
        tileSize: 256,
        // Constrain tile requests to the actual GTA V world so we don't
        // spam 404s for tiles outside the map.
        bounds: L.latLngBounds(GAME_BOUNDS[0], GAME_BOUNDS[1]),
        attribution:
          '<a href="https://forge.plebmasters.de/map" target="_blank" rel="noopener">Pleb Masters: Forge</a>',
      }).addTo(map);

      if (prevCenter && prevZoom !== null) {
        // Re-clamp prev zoom to new style's max
        map.setView(prevCenter, Math.min(prevZoom, cfg.maxZoom));
      } else {
        map.fitBounds(GAME_BOUNDS);
      }
      map.setMaxBounds([
        [GAME_BOUNDS[0][0] - 500, GAME_BOUNDS[0][1] - 500],
        [GAME_BOUNDS[1][0] + 500, GAME_BOUNDS[1][1] + 500],
      ]);

      (map as unknown as { _gameToLatLng: (x: number, y: number) => import("leaflet").LatLng })._gameToLatLng = (
        gx: number,
        gy: number
      ) => L.latLng(gx, gy);
      (map as unknown as { _latLngToGame: (lat: number, lng: number) => { x: number; y: number } })._latLngToGame = (
        lat: number,
        lng: number
      ) => ({ x: lat, y: lng });

      // Bump version so dependent effects (markers, click) re-bind.
      setMapVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
      if (createdMap) {
        createdMap.remove();
        if (mapRef.current === createdMap) mapRef.current = null;
      }
    };
  }, [style]);

  // Toggle crosshair cursor imperatively so React doesn't touch the container className
  // and call invalidateSize so Leaflet re-syncs tiles after the re-render.
  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (el) {
      el.style.cursor = adding ? "crosshair" : "";
    }
    if (map) {
      // Small delay to ensure the DOM has settled after React re-render
      requestAnimationFrame(() => map.invalidateSize());
    }
  }, [adding, mapVersion]);

  // Click (in adding mode) OR right-click anywhere → open create form
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const conv = map as unknown as {
      _latLngToGame: (lat: number, lng: number) => { x: number; y: number };
    };
    const onClick = (e: import("leaflet").LeafletMouseEvent) => {
      if (!adding) return;
      const { x, y } = conv._latLngToGame(e.latlng.lat, e.latlng.lng);
      setEditing({ mode: "create", x, y });
      setAdding(false);
    };
    const onContextMenu = (e: import("leaflet").LeafletMouseEvent) => {
      if (!canEdit) return;
      // e.originalEvent.preventDefault() is handled by Leaflet already
      const { x, y } = conv._latLngToGame(e.latlng.lat, e.latlng.lng);
      setEditing({ mode: "create", x, y });
      setAdding(false);
    };
    map.on("click", onClick);
    map.on("contextmenu", onContextMenu);
    return () => {
      map.off("click", onClick);
      map.off("contextmenu", onContextMenu);
    };
  }, [adding, canEdit, mapVersion]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    // Remove old
    for (const id in markerLayerRef.current) {
      markerLayerRef.current[id].remove();
    }
    markerLayerRef.current = {};

    const game = map as unknown as { _gameToLatLng: (x: number, y: number) => import("leaflet").LatLng };

    const npcNameById = new Map(npcs.map((n) => [n.id, n.name]));
    const charNameById = new Map(characters.map((c) => [c.id, c.name]));

    for (const m of filteredMarkers) {
      const color = m.color || MAP_CATEGORY_COLORS[m.category];
      const icon = L.divIcon({
        className: "ls-marker",
        html: `<span class="ls-marker-pin" style="--c:${color}">${categoryIconSvg(m.category, 16)}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker(game._gameToLatLng(m.x, m.y), {
        icon,
        title: m.label,
      }).addTo(map);
      const peopleNames = (m.people ?? [])
        .map((p) =>
          p.character_id
            ? charNameById.get(p.character_id)
            : p.npc_id
              ? npcNameById.get(p.npc_id)
              : null
        )
        .filter((v): v is string => Boolean(v));
      const peopleHtml = peopleNames.length
        ? `<div class="ls-popup-people">${peopleNames
            .map((n) => `<span class="ls-popup-chip">${escapeHtml(n)}</span>`)
            .join("")}</div>`
        : "";
      marker.bindPopup(
        `<div class="ls-popup">
          <div class="ls-popup-title">${escapeHtml(m.label)}</div>
          <div class="ls-popup-cat" style="color:${color}">${categoryIconSvg(m.category, 12, color)}<span>${MAP_CATEGORY_LABELS[m.category]}</span></div>
          ${m.description ? `<div class="ls-popup-desc">${escapeHtml(m.description).replace(/\n/g, "<br/>")}</div>` : ""}
          ${peopleHtml}
          ${canEdit ? `<div class="ls-popup-actions">
            <button data-action="edit" data-id="${m.id}">Modifier</button>
            <button data-action="delete" data-id="${m.id}">Supprimer</button>
          </div>` : ""}
        </div>`
      );
      markerLayerRef.current[m.id] = marker;
    }

    // Popup action delegation
    const onPopupClick = (e: Event) => {
      const t = e.target as HTMLElement;
      const btn = t.closest("button[data-action]") as HTMLButtonElement | null;
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;
      const m = markers.find((x) => x.id === id);
      if (!m) return;
      if (action === "edit") {
        map.closePopup();
        setEditing({ mode: "edit", marker: m });
      } else if (action === "delete") {
        if (confirm(`Supprimer "${m.label}" ?`)) {
          deleteMapMarker(id).catch((err) =>
            alert(err instanceof Error ? err.message : "Erreur")
          );
        }
      }
    };
    map.getContainer().addEventListener("click", onPopupClick);
    return () => {
      map.getContainer().removeEventListener("click", onPopupClick);
    };
  }, [filteredMarkers, markers, canEdit, mapVersion, npcs, characters]);

  // Focus a marker from sidebar
  const focusMarker = useCallback(
    (m: MapMarker) => {
      const map = mapRef.current;
      if (!map) return;
      const game = map as unknown as { _gameToLatLng: (x: number, y: number) => import("leaflet").LatLng };
      map.flyTo(game._gameToLatLng(m.x, m.y), Math.max(map.getZoom(), 2), {
        duration: 0.6,
      });
      const layer = markerLayerRef.current[m.id];
      if (layer) layer.openPopup();
      setFocusId(m.id);
    },
    []
  );

  function toggleCategory(c: MapCategory) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div className="relative">
        {canEdit && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100] flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className={
                "px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] shadow-lg transition-colors border " +
                (adding
                  ? "bg-accent text-background border-accent"
                  : "bg-background text-muted border-border hover:text-accent hover:border-accent/60")
              }
            >
              {adding ? "✕ Annuler" : "+ Ajouter un lieu"}
            </button>
            {adding && (
              <span className="px-3 py-2.5 bg-background text-[11px] uppercase tracking-[0.16em] text-muted border border-border shadow-lg">
                Clique sur la carte pour placer le marqueur
              </span>
            )}
          </div>
        )}

        <div className="absolute top-3 right-3 z-[1100] flex gap-px bg-border border border-border shadow-md">
          {(Object.keys(STYLES) as TileStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={
                "px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors bg-background " +
                (style === s
                  ? "text-accent"
                  : "text-muted hover:text-foreground")
              }
            >
              {STYLES[s].label}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="w-full h-[380px] md:h-[78vh] border border-border overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)",
          }}
          data-no-lightbox=""
        />
      </div>

      {/* Sidebar */}
      <aside className="space-y-3">
        <div className="card !p-3">
          <div className="text-xs uppercase tracking-wider text-muted mb-2 font-medium">
            Catégories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const off = hidden.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] border transition-colors " +
                    (off
                      ? "border-border text-muted opacity-50"
                      : "border-border text-foreground hover:bg-accent-soft")
                  }
                >
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full"
                    style={{ background: MAP_CATEGORY_COLORS[c] }}
                    dangerouslySetInnerHTML={{
                      __html: categoryIconSvg(c, 10, "white"),
                    }}
                  />
                  {MAP_CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card !p-3">
          <div className="text-xs uppercase tracking-wider text-muted mb-2 font-medium flex items-center justify-between">
            <span>Lieux ({filteredMarkers.length})</span>
          </div>
          {filteredMarkers.length === 0 ? (
            <p className="text-sm text-muted italic">
              Aucun marqueur pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto -mx-1 px-1">
              {filteredMarkers.map((m) => {
                const color = m.color || MAP_CATEGORY_COLORS[m.category];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => focusMarker(m)}
                      className={
                        "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors " +
                        (focusId === m.id
                          ? "bg-accent-soft text-accent"
                          : "hover:bg-surface-2 text-foreground/85")
                      }
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                        style={{ background: color }}
                        dangerouslySetInnerHTML={{
                          __html: categoryIconSvg(m.category, 12, "white"),
                        }}
                      />
                      <span className="truncate">{m.label}</span>
                      <span className="ml-auto text-[10px] text-muted shrink-0">
                        {MAP_CATEGORY_LABELS[m.category]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Marker form modal */}
      {editing && (
        <MarkerForm
          state={editing}
          npcs={npcs}
          characters={characters}
          investigations={investigations}
          onClose={() => setEditing(null)}
        />
      )}

      <style jsx global>{`
        .ls-marker {
          background: transparent;
          border: none;
        }
        .ls-marker-pin {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--c);
          border: 2.5px solid white;
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.25),
            0 4px 10px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .ls-marker-pin svg {
          display: block;
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35));
        }
        .ls-marker:hover .ls-marker-pin {
          transform: scale(1.15);
        }
        .leaflet-container .leaflet-popup-content-wrapper {
          background: var(--surface) !important;
          color: var(--foreground) !important;
          border-radius: 12px !important;
          border: 1px solid var(--border);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .leaflet-container .leaflet-popup-tip {
          background: var(--surface) !important;
          border: 1px solid var(--border);
        }
        .leaflet-container .leaflet-popup-content {
          color: var(--foreground) !important;
        }
        .leaflet-container .leaflet-popup-close-button {
          color: var(--muted) !important;
        }
        .leaflet-container {
          background: transparent;
          font-family: inherit;
        }
        .ls-popup-title {
          font-weight: 700;
          font-size: 15px;
          color: var(--foreground);
          margin-bottom: 2px;
        }
        .ls-popup-cat {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }
        .ls-popup-cat svg {
          flex-shrink: 0;
        }
        .leaflet-container .leaflet-popup-content .ls-popup-desc {
          font-size: 13px;
          line-height: 1.5;
          color: var(--foreground) !important;
          opacity: 1 !important;
          font-weight: 500;
          margin-bottom: 10px;
          max-width: 240px;
          white-space: pre-wrap;
        }
        .ls-popup-people {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
          max-width: 240px;
        }
        .ls-popup-chip {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid rgba(124, 93, 250, 0.25);
        }
        .ls-popup-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .ls-popup-actions button {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--foreground);
          cursor: pointer;
          transition: all 0.15s;
        }
        .ls-popup-actions button:hover {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .ls-popup-actions button[data-action="delete"]:hover {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
          border-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}

function MarkerForm({
  state,
  npcs,
  characters,
  investigations,
  onClose,
}: {
  state: { mode: "create"; x: number; y: number } | { mode: "edit"; marker: MapMarker };
  npcs: Pick<Npc, "id" | "name">[];
  characters: Pick<Character, "id" | "name">[];
  investigations: Pick<Investigation, "id" | "title">[];
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const m = isEdit ? state.marker : null;

  const personOptions = useMemo(() => {
    const items: { value: string; label: string }[] = [];
    for (const c of characters) items.push({ value: `char:${c.id}`, label: c.name });
    for (const n of npcs) items.push({ value: `npc:${n.id}`, label: n.name });
    return items;
  }, [characters, npcs]);

  const [people, setPeople] = useState<string[]>(() => {
    if (!m?.people) return [];
    return m.people.map((p) =>
      p.character_id ? `char:${p.character_id}` : `npc:${p.npc_id}`
    );
  });

  const personLabel = (value: string) =>
    personOptions.find((o) => o.value === value)?.label ?? "Inconnu";

  function addPerson(value: string) {
    if (!value || people.includes(value)) return;
    setPeople((prev) => [...prev, value]);
  }
  function removePerson(value: string) {
    setPeople((prev) => prev.filter((v) => v !== value));
  }
  const availableOptions = personOptions.filter((o) => !people.includes(o.value));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      if (isEdit && m) await updateMapMarker(m.id, fd);
      else await createMapMarker(fd);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="font-display text-2xl text-foreground">
          {isEdit ? "Modifier le lieu" : "Nouveau lieu"}
        </h2>

        <input
          type="hidden"
          name="x"
          defaultValue={isEdit ? m!.x : state.x}
        />
        <input
          type="hidden"
          name="y"
          defaultValue={isEdit ? m!.y : state.y}
        />

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Nom *
          </span>
          <input
            name="label"
            required
            defaultValue={m?.label ?? ""}
            autoFocus
            placeholder="Planque, garage, lieu de RDV…"
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Catégorie
          </span>
          <select name="category" defaultValue={m?.category ?? "other"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MAP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Description
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={m?.description ?? ""}
            placeholder="Notes, contexte, à savoir…"
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Personnes liées
          </span>
          {people.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {people.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-soft text-accent text-xs border border-accent/30"
                >
                  <input type="hidden" name="person" value={p} />
                  {personLabel(p)}
                  <button
                    type="button"
                    onClick={() => removePerson(p)}
                    aria-label={`Retirer ${personLabel(p)}`}
                    className="ml-0.5 -mr-1 w-4 h-4 rounded-full hover:bg-accent/20 inline-flex items-center justify-center text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {availableOptions.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                addPerson(e.target.value);
                e.currentTarget.value = "";
              }}
            >
              <option value="">+ ajouter une personne…</option>
              {availableOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted italic">
              Tout le monde est déjà lié.
            </p>
          )}
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Liée à une enquête
          </span>
          <select
            name="investigation_id"
            defaultValue={m?.investigation_id ?? ""}
          >
            <option value="">— aucune —</option>
            {investigations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm text-muted hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

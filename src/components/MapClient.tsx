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

/* La légende, écrite à la main */
const CATEGORY_HAND: Record<MapCategory, string> = {
  home: "chez quelqu'un",
  work: "là où on bosse",
  important: "à retenir",
  danger: "danger",
  other: "le reste",
};

/* Cercle tracé au crayon : jamais tout à fait rond */
function wobbleRadius(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const v = (n: number) => 46 + (Math.abs(h >> n) % 9);
  return `${v(0)}% ${100 - v(0)}% ${v(3)}% ${100 - v(3)}% / ${v(6)}% ${v(9)}% ${100 - v(9)}% ${100 - v(6)}%`;
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
      const wobble = wobbleRadius(m.id);
      const icon = L.divIcon({
        className: "ls-marker",
        html: `<span class="ls-marker-ring" style="--c:${color};border-radius:${wobble}">${categoryIconSvg(m.category, 14, color)}</span><span class="ls-marker-label" style="color:${color}">${escapeHtml(m.label)}</span>`,
        iconSize: [34, 30],
        iconAnchor: [17, 15],
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
            .map((n) => escapeHtml(n))
            .join(" · ")}</div>`
        : "";
      marker.bindPopup(
        `<div class="ls-popup">
          <div class="ls-popup-cat" style="color:${color}">${MAP_CATEGORY_LABELS[m.category]}</div>
          <div class="ls-popup-title">${escapeHtml(m.label)}</div>
          ${m.description ? `<div class="ls-popup-desc">${escapeHtml(m.description).replace(/\n/g, "<br/>")}</div>` : ""}
          ${peopleHtml}
          ${canEdit ? `<div class="ls-popup-actions">
            <button data-action="edit" data-id="${m.id}">corriger</button>
            <button data-action="delete" data-id="${m.id}">rayer</button>
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

  // Arrivée depuis la recherche globale : /map?lieu=<id>
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !mapRef.current || mapVersion === 0) return;
    const id = new URLSearchParams(window.location.search).get("lieu");
    if (!id) return;
    const m = markers.find((x) => x.id === id);
    if (!m) return;
    openedFromUrl.current = true;
    const t = setTimeout(() => focusMarker(m), 250);
    return () => clearTimeout(t);
  }, [mapVersion, markers, focusMarker]);

  function toggleCategory(c: MapCategory) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  return (
    <div data-no-lightbox="">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="hand text-[34px] md:text-[38px] font-semibold leading-none">
            Los Santos, ce que j&apos;en connais
          </h1>
          <p className="hand text-[20px] md:text-[21px] text-ink-soft mt-1">
            la carte pliée, annotée à la main
          </p>
        </div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="typed">fond de carte</span>
          {(Object.keys(STYLES) as TileStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStyle(st)}
              className="hand-toggle !text-[20px]"
              data-active={style === st}
            >
              {STYLES[st].label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="map-sheet grid lg:grid-cols-[1fr_270px]">
        <div className="relative min-w-0">
          {/* Pas de backdrop-filter au-dessus de Leaflet : les plis sont de simples dégradés */}
          <div className="map-fold map-fold--v1" aria-hidden />
          <div className="map-fold map-fold--v2" aria-hidden />
          <div className="map-fold map-fold--h" aria-hidden />

          {canEdit && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100] flex gap-3 flex-wrap justify-center items-center">
              <button
                type="button"
                onClick={() => setAdding((v) => !v)}
                className={
                  "stamp stamp--sm " +
                  (adding ? "text-pen-red" : "text-ink")
                }
                style={{ background: "var(--sheet)", opacity: 1, mixBlendMode: "normal" }}
              >
                {adding ? "laisser tomber" : "noter un endroit"}
              </button>
              {adding && (
                <span className="hand text-[19px] px-2.5 py-0.5 text-ink" style={{ background: "var(--sheet)" }}>
                  clique sur la carte pour le placer
                </span>
              )}
            </div>
          )}

          <div
            ref={containerRef}
            className="w-full h-[440px] md:h-[76vh]"
            style={{ background: "var(--paper)" }}
            data-no-lightbox=""
          />
        </div>

        {/* Le volet des lieux, rabattu sur la droite */}
        <aside className="map-flap px-5 py-6">
          <div className="hand text-[27px] font-semibold leading-none">
            les endroits notés
          </div>
          <div className="sheet__rule mt-3" />
          {filteredMarkers.length === 0 ? (
            <p className="hand text-[20px] text-ink-faint">
              aucun endroit noté pour l&apos;instant.
            </p>
          ) : (
            <ul className="max-h-[36vh] lg:max-h-[42vh] overflow-y-auto -mx-1 px-1">
              {filteredMarkers.map((m) => {
                const color = m.color || MAP_CATEGORY_COLORS[m.category];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => focusMarker(m)}
                      className={
                        "w-full text-left font-typed text-[12px] leading-[1.9] uppercase tracking-[0.04em] truncate " +
                        (focusId === m.id ? "text-ink underline" : "text-typed-strong hover:text-ink")
                      }
                      title={m.label}
                    >
                      {m.label} <span style={{ color }}>· {MAP_CATEGORY_LABELS[m.category]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && (
            <p className="hand text-[19px] leading-[25px] text-ink-soft mt-4">
              clic droit sur la carte pour en ajouter un
            </p>
          )}

          <div className="mt-6">
            <div className="typed">légende · touche pour masquer</div>
            <ul className="mt-2.5 flex flex-col gap-1.5 hand text-[19px]">
              {CATEGORIES.map((c) => {
                const off = hidden.has(c);
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(c)}
                      aria-pressed={!off}
                      className={"flex items-center gap-2.5 " + (off ? "opacity-40 line-through" : "")}
                    >
                      <span
                        className="w-4 h-4 shrink-0"
                        style={{ border: `2px solid ${MAP_CATEGORY_COLORS[c]}`, borderRadius: "50%" }}
                      />
                      {CATEGORY_HAND[c]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

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
        .ls-marker-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 30px;
          border: 2.5px solid var(--c);
          background: color-mix(in srgb, var(--paper) 70%, transparent);
          cursor: pointer;
          transform: rotate(-6deg);
          transition: transform 0.15s ease;
        }
        .ls-marker-ring svg {
          display: block;
        }
        .ls-marker-label {
          position: absolute;
          left: 38px;
          top: 2px;
          white-space: nowrap;
          font-family: var(--font-caveat), cursive;
          font-size: 19px;
          font-weight: 600;
          line-height: 1;
          padding: 1px 5px;
          background: color-mix(in srgb, var(--paper) 80%, transparent);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }
        .ls-marker:hover .ls-marker-ring {
          transform: rotate(4deg) scale(1.12);
        }
        .ls-marker:hover .ls-marker-label {
          opacity: 1;
        }
        .leaflet-container .leaflet-popup-content-wrapper {
          background: var(--sheet) !important;
          color: var(--print) !important;
          border-radius: 0 !important;
          border: 0;
          box-shadow: var(--shadow-sheet);
          transform: rotate(-0.8deg);
        }
        .leaflet-container .leaflet-popup-tip {
          background: var(--sheet) !important;
          box-shadow: none;
        }
        .leaflet-container .leaflet-popup-content {
          color: var(--print) !important;
          margin: 14px 18px 14px 16px;
        }
        .leaflet-container .leaflet-popup-close-button {
          color: var(--typed) !important;
        }
        .leaflet-container {
          background: transparent;
          font-family: inherit;
        }
        .leaflet-container .leaflet-control-zoom a {
          background: var(--sheet);
          color: var(--ink);
          border-color: var(--sheet-rule);
          border-radius: 0 !important;
        }
        .leaflet-container .leaflet-control-attribution {
          background: color-mix(in srgb, var(--sheet) 80%, transparent);
          color: var(--typed);
          font-family: var(--font-courier), monospace;
          font-size: 10px;
        }
        .leaflet-container .leaflet-control-attribution a {
          color: var(--ink-soft);
        }
        .ls-popup-cat {
          font-family: var(--font-courier), monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 2px;
        }
        .ls-popup-title {
          font-family: var(--font-caveat), cursive;
          font-weight: 600;
          font-size: 24px;
          line-height: 1.05;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .leaflet-container .leaflet-popup-content .ls-popup-desc {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 14px;
          line-height: 1.6;
          color: var(--print) !important;
          opacity: 1 !important;
          margin-bottom: 8px;
          max-width: 240px;
          white-space: pre-wrap;
        }
        .ls-popup-people {
          font-family: var(--font-caveat), cursive;
          font-size: 18px;
          color: var(--ink-soft);
          margin-bottom: 6px;
          max-width: 240px;
        }
        .ls-popup-actions {
          display: flex;
          gap: 14px;
          margin-top: 6px;
        }
        .ls-popup-actions button {
          font-family: var(--font-caveat), cursive;
          font-size: 19px;
          color: var(--ink-soft);
          background: none;
          border: 0;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .ls-popup-actions button:hover {
          color: var(--ink);
        }
        .ls-popup-actions button[data-action="delete"]:hover {
          color: var(--pen-red);
        }
        .map-sheet {
          position: relative;
          background: var(--paper);
          box-shadow: var(--shadow-sheet);
        }
        .map-fold {
          position: absolute;
          z-index: 450;
          pointer-events: none;
        }
        .map-fold--v1,
        .map-fold--v2 {
          top: 0;
          bottom: 0;
          width: 14px;
        }
        .map-fold--v1 {
          left: 33.3%;
          background: linear-gradient(90deg, rgba(60, 48, 30, 0.16), rgba(255, 255, 255, 0.2));
        }
        .map-fold--v2 {
          left: 66.6%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(60, 48, 30, 0.16));
        }
        .map-fold--h {
          left: 0;
          right: 0;
          top: 50%;
          height: 14px;
          background: linear-gradient(180deg, rgba(60, 48, 30, 0.14), rgba(255, 255, 255, 0.18));
        }
        .map-flap {
          position: relative;
          z-index: 2;
          background: var(--sheet);
          box-shadow: -12px 0 22px rgba(50, 40, 25, 0.22);
        }
        @media (max-width: 1023px) {
          .map-flap {
            box-shadow: 0 -10px 20px rgba(50, 40, 25, 0.18);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-marker-ring,
          .ls-marker-label {
            transition: none;
          }
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
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: "rgba(20, 16, 10, 0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="sheet sheet--stapled w-full max-w-md px-6 pt-9 pb-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ transform: "rotate(-0.6deg)" }}
      >
        <h2 className="hand text-[30px] font-semibold leading-none text-ink">
          {isEdit ? "corriger cet endroit" : "noter un endroit"}
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
          <span className="typed mb-1 block">
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
          <span className="typed mb-1 block">
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
          <span className="typed mb-1 block">
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
          <span className="typed mb-1 block">
            Personnes liées
          </span>
          {people.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {people.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 hand text-[19px] text-ink"
                >
                  <input type="hidden" name="person" value={p} />
                  {personLabel(p)}
                  <button
                    type="button"
                    onClick={() => removePerson(p)}
                    aria-label={`Retirer ${personLabel(p)}`}
                    className="text-pen-red leading-none px-0.5"
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
            <p className="hand text-[18px] text-ink-faint">
              tout le monde est déjà noté ici.
            </p>
          )}
        </div>

        <div>
          <span className="typed mb-1 block">
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
          <p className="hand text-[19px] text-pen-red">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="hand text-[20px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            laisser tomber
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="stamp stamp--sm text-ink disabled:opacity-50"
          >
            {submitting ? "…" : isEdit ? "Enregistrer" : "Noter"}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LightboxState = {
  src: string;
  alt: string;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

export function ImageLightbox() {
  const [state, setState] = useState<LightboxState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const close = useCallback(() => {
    setState(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Delegated click listener: open lightbox on any <img> click,
  // unless inside an <a>, <button>, or marked data-no-lightbox.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== "IMG") return;
      const img = target as HTMLImageElement;
      if (img.closest("a, button, [data-no-lightbox]")) return;
      if (!img.src) return;
      e.preventDefault();
      setState({ src: img.currentSrc || img.src, alt: img.alt || "" });
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Mark all eligible images with a zoom-in cursor.
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .markdown-content img,
      img.lightbox-enabled {
        cursor: zoom-in;
      }
      a img, button img, [data-no-lightbox] img, [data-no-lightbox] {
        cursor: inherit;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "+" || e.key === "=") setZoom(z => clamp(z * 1.25));
      else if (e.key === "-" || e.key === "_") setZoom(z => clamp(z / 1.25));
      else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  if (!state) return null;

  function onWheel(e: React.WheelEvent) {
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(z => clamp(z * factor));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setPan({
      x: d.panX + (e.clientX - d.startX),
      y: d.panY + (e.clientY - d.startY),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onDoubleClick() {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={state.alt || "Aperçu image"}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onWheel={onWheel}
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm flex items-center justify-center select-none"
      style={{ animation: "lightbox-fade 120ms ease-out" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.src}
        alt={state.alt}
        draggable={false}
        data-no-lightbox=""
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: dragRef.current ? "none" : "transform 80ms ease-out",
          cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "zoom-in",
          maxWidth: "92vw",
          maxHeight: "92vh",
        }}
        className="rounded-lg shadow-2xl object-contain touch-none"
      />

      {/* Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-1.5 text-white text-sm border border-white/10"
      >
        <ToolbarButton title="Dézoomer (-)" onClick={() => setZoom(z => clamp(z / 1.25))}>
          −
        </ToolbarButton>
        <span className="px-2 tabular-nums text-xs min-w-[3.5rem] text-center text-white/80">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton title="Zoomer (+)" onClick={() => setZoom(z => clamp(z * 1.25))}>
          +
        </ToolbarButton>
        <span className="w-px h-5 bg-white/15 mx-1" />
        <ToolbarButton
          title="Réinitialiser (0)"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          ⟲
        </ToolbarButton>
        <ToolbarButton title="Ouvrir l'original" onClick={() => window.open(state.src, "_blank", "noopener")}>
          ↗
        </ToolbarButton>
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={close}
        title="Fermer (Échap)"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xl flex items-center justify-center border border-white/10 transition-colors"
      >
        ×
      </button>

      <style>{`
        @keyframes lightbox-fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}

function clamp(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

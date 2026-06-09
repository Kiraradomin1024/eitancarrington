"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#0123456789ABCDEF░▒▓";

type Dossier = "target" | "closed" | null;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function DossierAccess({
  on,
  fileName,
  dossier,
}: {
  on: boolean;
  fileName: string;
  dossier: Dossier;
}) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(on);
  const [phase, setPhase] = useState<"idle" | "intro" | "stamp" | "done">(
    "idle"
  );
  const [scrambled, setScrambled] = useState(fileName);
  const [progress, setProgress] = useState(0);

  useEffect(() => setMounted(true), []);

  // React to SC292 being toggled live (class on <html>) as well as the prop.
  useEffect(() => {
    const el = document.documentElement;
    const update = () =>
      setActive(on || el.classList.contains("hacking-active"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [on]);

  // Decryption sequence: hides the page content, then reveals it.
  useIsoLayoutEffect(() => {
    const el = document.documentElement;
    if (!active) {
      el.classList.remove("hk-decrypting", "hk-revealing");
      setPhase("done");
      return;
    }

    el.classList.add("hk-decrypting");
    setPhase("intro");
    setProgress(0);
    setScrambled("");

    let p = 0;
    const pid = setInterval(() => {
      p = Math.min(100, p + Math.floor(5 + Math.random() * 14));
      setProgress(p);
      if (p >= 100) clearInterval(pid);
    }, 70);

    let frame = 0;
    const len = Math.max(fileName.length, 1);
    const sid = setInterval(() => {
      frame++;
      const revealCount = Math.floor((frame / 16) * len);
      setScrambled(
        fileName
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < revealCount) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );
      if (revealCount >= len) {
        setScrambled(fileName);
        clearInterval(sid);
      }
    }, 45);

    // reveal the page content
    const t1 = setTimeout(() => {
      el.classList.remove("hk-decrypting");
      el.classList.add("hk-revealing");
      setPhase("stamp");
    }, 1350);
    const t2 = setTimeout(() => el.classList.remove("hk-revealing"), 2050);
    const t3 = setTimeout(() => setPhase("done"), 2200);

    return () => {
      clearInterval(pid);
      clearInterval(sid);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      el.classList.remove("hk-decrypting", "hk-revealing");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const overlay =
    mounted && active && (phase === "intro" || phase === "stamp")
      ? createPortal(
          <>
            {phase === "intro" && (
              <div className="hk-dossier" aria-hidden="true">
                <div className="hk-dossier__panel">
                  <div className="hk-dossier__head">
                    <span className="hk-dossier__dot" /> SC292 // ACCÈS DOSSIER
                  </div>
                  <div className="hk-dossier__file">{scrambled || "…"}</div>
                  <div className="hk-dossier__bar">
                    <span style={{ width: progress + "%" }} />
                  </div>
                  <div className="hk-dossier__status">
                    DÉCHIFFREMENT_ {progress}%
                  </div>
                </div>
              </div>
            )}
            {phase === "stamp" && (
              <div className="hk-stamp" aria-hidden="true">
                <span>DOSSIER COMPROMIS — SC292</span>
              </div>
            )}
          </>,
          document.body
        )
      : null;

  return (
    <>
      {overlay}
      {active && dossier === "target" && (
        <div className="hk-dossier-banner hk-dossier-banner--target" role="note">
          ⊗ CIBLE VERROUILLÉE — SURVEILLANCE SC292 ACTIVE
        </div>
      )}
      {active && dossier === "closed" && (
        <div className="hk-dossier-banner hk-dossier-banner--closed" role="note">
          ✕ DOSSIER CLOS — SUJET DÉCÉDÉ
        </div>
      )}
    </>
  );
}

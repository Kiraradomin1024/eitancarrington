"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { setHackingMode, forceReloadAll } from "@/app/hacking/actions";

/** Fake trace log lines — SC292 hunting the Carrington/Suarez circle. */
const LOG_LINES = [
  "SC292 // session établie",
  "cibles verrouillées: 02",
  "cible_01: E. CARRINGTON [LOCALISÉ]",
  "cible_02: D. SUAREZ [RECHERCHÉ]",
  "réf: L. SUAREZ — [DÉCÉDÉE]",
  "motif: trace héritée",
  "géoloc: Richman Lane, Los Santos",
  "interception des paquets…",
  "accès journal: PARTIEL",
  "déchiffrement: brute-force 64%",
  "« Diego sera le prochain. »",
  "« je sais où tu dors, Eitan. »",
  "capture clavier: ON",
  "pare-feu: CONTOURNÉ",
  "trace active — ne ferme pas.",
];

const BURST_MSGS = [
  "// CONNEXION INTERCEPTÉE",
  "SC292 EST LÀ",
  "ON VOUS REGARDE",
  "L. SUAREZ N'ÉTAIT QUE LE DÉBUT",
  "CARRINGTON · SUAREZ : LOCALISÉS",
  "DIEGO, TU ES LE SUIVANT",
];

const TICKER =
  "⚠ SYSTÈME COMPROMIS — SC292 // ACCÈS NON AUTORISÉ // CIBLES VERROUILLÉES : E. CARRINGTON · D. SUAREZ // RÉF : L. SUAREZ [DÉCÉDÉE] // TRACE EN COURS // NE FERMEZ PAS CETTE PAGE ";

export function HackingMode({
  initialOn,
  canToggle,
  initialReloadNonce,
}: {
  initialOn: boolean;
  canToggle: boolean;
  initialReloadNonce: string | null;
}) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const reloadNonceRef = useRef(initialReloadNonce);
  const [collapsed, setCollapsed] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [burst, setBurst] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const historyRef = useRef<string[]>([]);
  const matrixRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Toggle the global class that repaints the whole site into "hacked" mode.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("hacking-active", on);
    return () => el.classList.remove("hacking-active");
  }, [on]);

  // Boot terminal: play when SC292 switches on (live) or on first arrival
  // while it's already active (once per session, so navigating doesn't replay).
  useEffect(() => {
    if (!on) {
      setBooting(false);
      try {
        sessionStorage.removeItem("sc292-booted");
      } catch {}
      return;
    }
    const first = !mountedRef.current;
    mountedRef.current = true;
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem("sc292-booted") === "1";
    } catch {}
    if (first && alreadyBooted) return; // arrived mid-session, already saw boot
    try {
      sessionStorage.setItem("sc292-booted", "1");
    } catch {}
    setBooting(true);
  }, [on]);

  // Real-time: react instantly when Kirara flips the switch.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sc292-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          const row = payload.new as {
            hacking_mode?: boolean;
            reload_nonce?: string;
          } | null;
          if (row && typeof row.hacking_mode === "boolean") {
            setOn(row.hacking_mode);
          }
          if (
            row?.reload_nonce &&
            reloadNonceRef.current &&
            row.reload_nonce !== reloadNonceRef.current
          ) {
            window.location.reload();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Poll fallback (in case realtime isn't enabled).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function check() {
      const { data } = await supabase
        .from("site_settings")
        .select("hacking_mode, reload_nonce")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled || !data) return;
      setOn(Boolean(data.hacking_mode));
      const nonce = (data.reload_nonce as string | null) ?? null;
      if (nonce && reloadNonceRef.current && nonce !== reloadNonceRef.current) {
        window.location.reload();
      }
    }
    const id = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Typewriter trace log.
  useEffect(() => {
    if (!on) {
      historyRef.current = [];
      setLines([]);
      return;
    }
    let li = Math.floor(Math.random() * LOG_LINES.length);
    let ci = 0;
    const id = setInterval(() => {
      const full = LOG_LINES[li % LOG_LINES.length];
      ci++;
      const partial = full.slice(0, ci);
      setLines([...historyRef.current.slice(-6), partial + "▋"]);
      if (ci >= full.length) {
        historyRef.current = [...historyRef.current, full].slice(-7);
        li++;
        ci = 0;
      }
    }, 50);
    return () => clearInterval(id);
  }, [on]);

  // Occasional brief full-screen glitch burst + screen jolt.
  useEffect(() => {
    if (!on) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 270000 + Math.random() * 120000;
      timeoutId = setTimeout(() => {
        setBurst(BURST_MSGS[Math.floor(Math.random() * BURST_MSGS.length)]);
        document.documentElement.classList.add("hk-jolt");
        setTimeout(() => {
          setBurst(null);
          document.documentElement.classList.remove("hk-jolt");
        }, 700);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      clearTimeout(timeoutId);
      document.documentElement.classList.remove("hk-jolt");
    };
  }, [on]);

  // Matrix rain.
  useEffect(() => {
    if (!on) return;
    const canvas = matrixRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    function resize() {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 45) return;
      last = t;
      ctx.clearRect(0, 0, w, h);

      // fine RGB static specks
      const count = Math.floor((w * h) / 9000);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random();
        ctx.fillStyle =
          r > 0.66
            ? "rgba(255,0,102,0.5)"
            : r > 0.33
              ? "rgba(0,240,255,0.45)"
              : "rgba(255,255,255,0.4)";
        ctx.fillRect(x, y, 2, 2);
      }

      // occasional horizontal glitch tear bars
      if (Math.random() > 0.78) {
        const bars = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < bars; b++) {
          const y = Math.random() * h;
          const bh = 2 + Math.random() * 11;
          const off = (Math.random() - 0.5) * 50;
          ctx.fillStyle =
            Math.random() > 0.5
              ? "rgba(255,0,102,0.22)"
              : "rgba(0,240,255,0.20)";
          ctx.fillRect(off, y, w, bh);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [on, mounted]);

  const toggle = useCallback(async () => {
    setBusy(true);
    const next = !on;
    try {
      await setHackingMode(next);
      setOn(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, [on]);

  const forceReload = useCallback(async () => {
    if (!confirm("Forcer le rechargement de toutes les pages ouvertes ?")) return;
    setReloading(true);
    try {
      await forceReloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
      setReloading(false);
    }
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {on && booting && <BootSequence onDone={() => setBooting(false)} />}

      {on && (
        <>
          <canvas ref={matrixRef} className="hk-matrix" aria-hidden="true" />
          <div className="hk-tint" aria-hidden="true" />
          <div className="hk-scanlines" aria-hidden="true" />

          {/* Top compromised banner */}
          <div className="hk-ticker" aria-hidden="true">
            <div className="hk-ticker__track">
              <span>{TICKER}</span>
              <span>{TICKER}</span>
            </div>
          </div>

          {/* Trace HUD */}
          <div className={"hk-hud" + (collapsed ? " hk-hud--min" : "")}>
            <div className="hk-hud__bar">
              <span className="hk-hud__dot" />
              <span className="hk-hud__title">SC292 // TRACE ACTIVE</span>
              <button
                type="button"
                className="hk-hud__min"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Déplier" : "Réduire"}
              >
                {collapsed ? "▢" : "—"}
              </button>
            </div>
            {!collapsed && (
              <>
                <div className="hk-hud__targets">
                  <div className="hk-hud__t hk-hud__t--hot">
                    ▸ E. CARRINGTON <span>LOCALISÉ</span>
                  </div>
                  <div className="hk-hud__t hk-hud__t--hot">
                    ▸ D. SUAREZ <span>RECHERCHÉ</span>
                  </div>
                  <div className="hk-hud__t hk-hud__t--dead">
                    × L. SUAREZ <span>DÉCÉDÉE</span>
                  </div>
                </div>
                <div className="hk-hud__body">
                  {lines.map((l, i) => (
                    <div key={i} className="hk-hud__line">
                      <span className="hk-hud__prompt">&gt;</span> {l}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {burst && (
            <div className="hk-burst" aria-hidden="true">
              <svg
                className="hk-burst__skull"
                viewBox="0 0 64 64"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              >
                <path d="M32 3C18.7 3 8 13.4 8 26.6c0 6.6 2.7 11.5 6.6 15.4.9.9 1.4 2 1.4 3.2v5.4a3 3 0 0 0 3 3h3.5v-5h3v5h4.9v-5h3v5H40v-5h3.5a3 3 0 0 0 3-3v-5.4c0-1.2.5-2.3 1.4-3.2C51.3 38.1 56 33.2 56 26.6 56 13.4 45.3 3 32 3Zm-9.5 19.5a6.2 6.2 0 1 1 0 12.4 6.2 6.2 0 0 1 0-12.4Zm19 0a6.2 6.2 0 1 1 0 12.4 6.2 6.2 0 0 1 0-12.4ZM32 37l3.2 6.5h-6.4L32 37Z" />
              </svg>
              <span className="hk-burst__msg">{burst}</span>
            </div>
          )}
        </>
      )}

      {canToggle && (
        <>
          <button
            type="button"
            onClick={forceReload}
            disabled={reloading}
            className="hk-admin-btn hk-admin-btn--reload"
            title="Forcer le rechargement de toutes les pages ouvertes"
          >
            {reloading ? "↻ rechargement…" : "↻ refresh tous"}
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="hk-admin-btn"
            title="Réservé à Kirara — activer/désactiver SC292"
          >
            {busy ? "…" : on ? "● SC292 actif" : "○ activer SC292"}
          </button>
        </>
      )}
    </>,
    document.body
  );
}

/* ── Procedural boot-stream generators ── */
const HEX = "0123456789ABCDEF";
const rint = (a: number, b: number) =>
  a + Math.floor(Math.random() * (b - a + 1));
const rhex = (n: number) =>
  Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join("");
const rip = () => `${rint(10, 254)}.${rint(0, 255)}.${rint(0, 255)}.${rint(1, 254)}`;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rascii = () =>
  Array.from({ length: 8 }, () => String.fromCharCode(rint(33, 126))).join("");

const LINE_GENS: (() => string)[] = [
  () =>
    `0x${rhex(8)}  ${Array.from({ length: 8 }, () => rhex(2)).join(" ")}  ${rascii()}`,
  () =>
    `exec /usr/sbin/${pick(["netd", "netscan", "cryptd", "gw-probe", "keylogd", "spoofd"])} --force`,
  () =>
    `[OK] module ${pick(["aes256", "rsa-2048", "tunnel", "proxy", "spoof", "sniffer"])} charge`,
  () => `GET sys://${rip()}/node/${rhex(4)} :: 200`,
  () => `bypass node ${rip()} ............ OK`,
  () => `decrypt block #${rint(1000, 9999)} :: ${rhex(16)}`,
  () => `ssh root@${rip()} :: cle acceptee`,
  () => `scan secteur ${rint(1, 511)}/512 ...`,
  () => `inject payload @0x${rhex(6)}`,
  () => `trace ${rip()} -> ${rip()} -> ${rip()}`,
  () => `mem dump ${rhex(4)}:${rhex(4)} ... OK`,
  () => `brute-force ${rhex(2)} :: ${rint(0, 99)}% match`,
  () => `intercept pkt ${rhex(4)} len=${rint(40, 1480)}`,
  () => `unlink /var/log/${pick(["auth", "net", "sys", "kern"])}.log`,
];

const PHASES: [number, string][] = [
  [20, "ETABLISSEMENT DE LA LIAISON"],
  [44, "CONTOURNEMENT DU PARE-FEU"],
  [70, "DECHIFFREMENT DES DONNEES"],
  [90, "EXTRACTION DES CIBLES"],
  [101, "ACCES ROOT"],
];

type BootLine = { t: string; hot?: boolean };
const FINAL_LINES: BootLine[] = [
  { t: "" },
  { t: "################  ACCES ROOT OBTENU", hot: true },
  { t: "cibles verrouillees: 02" },
  { t: "  > E. CARRINGTON   [LOCALISE]", hot: true },
  { t: "  > D. SUAREZ       [RECHERCHE]", hot: true },
  { t: "  x L. SUAREZ       [DECEDEE]" },
  { t: "" },
  { t: "> bonjour, Eitan.", hot: true },
];

const BOOT_DURATION = 6000;

function BootSequence({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [header, setHeader] = useState("INITIALISATION…");
  const [closing, setClosing] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let lastPush = 0;
    let finalized = false;

    const push = (items: BootLine[]) =>
      setLines((prev) => {
        const next = [...prev, ...items];
        return next.length > 160 ? next.slice(next.length - 160) : next;
      });

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, Math.round((elapsed / BOOT_DURATION) * 100));
      setProgress(p);
      setHeader(PHASES.find(([thr]) => p < thr)?.[1] ?? "ACCES ROOT");

      if (p < 100 && now - lastPush > 22) {
        lastPush = now;
        const n = rint(1, 3);
        push(Array.from({ length: n }, () => ({ t: pick(LINE_GENS)() })));
      }

      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }

      if (p >= 100 && !finalized) {
        finalized = true;
        FINAL_LINES.forEach((l, i) => setTimeout(() => push([l]), i * 240));
        const tail = FINAL_LINES.length * 240;
        setTimeout(() => setClosing(true), tail + 900);
        setTimeout(onDone, tail + 1400);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={"hk-boot" + (closing ? " hk-boot--out" : "")}
      onClick={onDone}
      role="presentation"
      title="Cliquer pour passer"
    >
      <div className="hk-boot__top">
        <div className="hk-boot__phase">
          SC292 // SECURE SHELL v2.9.2 — {header}
        </div>
        <div className="hk-boot__progress">
          <div className="hk-boot__bar2">
            <span style={{ width: progress + "%" }} />
          </div>
          <span className="hk-boot__pct">{progress}%</span>
        </div>
      </div>
      <div className="hk-boot__stream" ref={streamRef}>
        {lines.map((l, i) => (
          <div
            key={i}
            className={"hk-boot__row" + (l.hot ? " hk-boot__row--hot" : "")}
          >
            {l.t || " "}
          </div>
        ))}
        <span className="hk-boot__cursor">█</span>
      </div>
      <div className="hk-boot__skip">cliquer pour passer</div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { ChatAlias } from "@/lib/chat";

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** Detects image / gif URLs so they render as pictures instead of text. */
const IMG_URL_RE =
  /(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?)|(https?:\/\/(?:[^\s]*\.)?(?:giphy\.com|media\d?\.giphy\.com|i\.imgur\.com|tenor\.com|media\.tenor\.com|cdn\.imgchest\.com)\/[^\s]+)/gi;

/** Splits a message into text + image segments. */
function parseSegments(body: string): { type: "text" | "img"; value: string }[] {
  const segs: { type: "text" | "img"; value: string }[] = [];
  let last = 0;
  for (const m of body.matchAll(IMG_URL_RE)) {
    const url = m[0];
    const start = m.index ?? 0;
    if (start > last) {
      const t = body.slice(last, start).trim();
      if (t) segs.push({ type: "text", value: t });
    }
    segs.push({ type: "img", value: url });
    last = start + url.length;
  }
  if (last < body.length) {
    const t = body.slice(last).trim();
    if (t) segs.push({ type: "text", value: t });
  }
  if (segs.length === 0) segs.push({ type: "text", value: body });
  return segs;
}

/** Short two-note notification blip via Web Audio (no asset needed). */
function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.start(t);
      o.stop(t + 0.14);
    });
    setTimeout(() => ctx.close(), 400);
  } catch {}
}

export function PrivateChat({
  myUserId,
  myAlias,
  initialHackOn,
}: {
  myUserId: string;
  myAlias: ChatAlias;
  initialHackOn: boolean;
}) {
  const otherAlias: ChatAlias = myAlias === "sc292" ? "Eitan" : "sc292";
  const [active, setActive] = useState(initialHackOn);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [unread, setUnread] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Chat is only available while SC292 has breached the site.
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setActive(el.classList.contains("hacking-active"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Initial load + authenticated realtime + poll fallback.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function notify(items: Msg[]) {
      const hidden = typeof document !== "undefined" && document.hidden;
      const closed = !openRef.current;
      if (closed || hidden) playBeep();
      if (closed) setUnread((u) => u + items.length);
      if (
        hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const last = items[items.length - 1];
        const body =
          last.body.length > 80 ? last.body.slice(0, 80) + "…" : last.body;
        try {
          new Notification(otherAlias, { body });
        } catch {}
      }
    }

    const merge = (incoming: Msg[]) =>
      setMsgs((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter((m) => !ids.has(m.id));
        if (fresh.length === 0) return prev;
        const fromOthers = fresh.filter((m) => m.sender_id !== myUserId);
        if (fromOthers.length > 0) {
          queueMicrotask(() => notify(fromOthers));
        }
        return [...prev, ...fresh].sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        );
      });

    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: true })
        .limit(500);
      if (active && data) setMsgs(data as Msg[]);
    }

    (async () => {
      // Authenticate the realtime socket so RLS (is_chat_participant) passes.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      await load();
      if (!active) return;
      channel = supabase
        .channel("private-chat")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => merge([payload.new as Msg])
        )
        .subscribe();
    })();

    // Fallback: poll recent messages in case realtime isn't delivering.
    const pollId = setInterval(async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (active && data) merge((data as Msg[]).slice().reverse());
    }, 20000);

    return () => {
      active = false;
      clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [myUserId, otherAlias]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [msgs, open]);

  function openChat() {
    setOpen(true);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }

  async function postMessage(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ sender_id: myUserId, body: trimmed })
      .select("id, sender_id, body, created_at")
      .single();
    if (error) throw error;
    if (data) {
      const m = data as Msg;
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    }
  }

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await postMessage(text);
      setText("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await postMessage(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/")
    );
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        sendImage(file);
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/")
    );
    if (file) sendImage(file);
  }

  if (!active) return null;

  if (!open) {
    return (
      <div className="pchat">
        <button
          type="button"
          className={
            "pchat__open-btn" + (unread > 0 ? " pchat__open-btn--alert" : "")
          }
          onClick={openChat}
        >
          <span className="pchat__open-icon">▣</span>
          <span>canal · {otherAlias}</span>
          {unread > 0 && <span className="pchat__badge">{unread}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="pchat pchat--open">
      <div
        className={"pchat__panel" + (dragOver ? " pchat__panel--drag" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="pchat__head">
          <span className="pchat__title">
            <span className="pchat__dot" /> CANAL SÉCURISÉ
          </span>
          <button
            type="button"
            className="pchat__close"
            onClick={() => setOpen(false)}
            aria-label="Réduire"
          >
            —
          </button>
        </div>

        <div className="pchat__body" ref={bodyRef}>
          {msgs.length === 0 ? (
            <p className="pchat__empty">
              Liaison établie. Aucun message — pour l&apos;instant.
            </p>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === myUserId;
              const alias = mine ? myAlias : otherAlias;
              const segs = parseSegments(m.body);
              return (
                <div
                  key={m.id}
                  className={"pchat__msg" + (mine ? " pchat__msg--me" : "")}
                >
                  <span className={"pchat__alias pchat__alias--" + alias}>
                    {alias}
                  </span>
                  {segs.map((s, idx) =>
                    s.type === "img" ? (
                      <a
                        key={idx}
                        href={s.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pchat__img-link"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.value}
                          alt=""
                          className="pchat__img"
                          loading="lazy"
                          data-no-lightbox=""
                        />
                      </a>
                    ) : (
                      <span key={idx} className="pchat__bubble">
                        {s.value}
                      </span>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        <form className="pchat__form" onSubmit={send}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendImage(f);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className="pchat__attach"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Envoyer une image / GIF"
          >
            {uploading ? "…" : "🖼"}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder={uploading ? "envoi de l'image…" : "message…"}
            maxLength={2000}
            autoComplete="off"
          />
          <button type="submit" disabled={sending || !text.trim()}>
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}

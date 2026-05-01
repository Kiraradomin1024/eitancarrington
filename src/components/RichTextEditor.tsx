"use client";

import { uploadImage } from "@/lib/upload";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Computes the (x,y) coordinates of a given character index inside a textarea
 * by mirroring the textarea into a hidden div and measuring a marker span.
 * Returns coords relative to the textarea's top-left (already accounting for scroll).
 */
function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  const div = document.createElement("div");
  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  const props = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "whiteSpace",
    "wordBreak",
    "wordWrap",
  ] as const;

  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.top = "0";
  style.left = "-9999px";
  for (const p of props) {
    (style as unknown as Record<string, string>)[p] = computed.getPropertyValue(
      p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
    );
  }

  document.body.appendChild(div);
  div.textContent = textarea.value.substring(0, position);
  const span = document.createElement("span");
  // Single character so offsetHeight = exactly one line of text
  span.textContent = ".";
  div.appendChild(span);

  // span.offsetHeight is the real rendered line height in px
  const lineHeight = span.offsetHeight || parseFloat(computed.fontSize) * 1.5 || 18;

  const coords = {
    top: span.offsetTop - textarea.scrollTop,
    left: span.offsetLeft - textarea.scrollLeft,
    height: lineHeight,
  };

  document.body.removeChild(div);
  return coords;
}

type FormatKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "spoiler"
  | "code"
  | "quote"
  | "h2"
  | "h3"
  | "ul"
  | "ol"
  | "link";

const FORMATS: Record<
  FormatKey,
  {
    label: string;
    title: string;
    /** Wrap selection or, if line-mode, prefix the line. */
    wrap?: { before: string; after: string; placeholder?: string };
    /** Line-level format: prefix added to start of each selected line. */
    linePrefix?: string;
    /** Special: link prompts the user. */
    isLink?: boolean;
  }
> = {
  bold: { label: "B", title: "Gras (Ctrl+B)", wrap: { before: "**", after: "**", placeholder: "gras" } },
  italic: { label: "I", title: "Italique (Ctrl+I)", wrap: { before: "*", after: "*", placeholder: "italique" } },
  underline: { label: "U", title: "Souligné (Ctrl+U)", wrap: { before: "__", after: "__", placeholder: "souligné" } },
  strike: { label: "S", title: "Barré", wrap: { before: "~~", after: "~~", placeholder: "barré" } },
  spoiler: { label: "◼", title: "Spoiler", wrap: { before: "||", after: "||", placeholder: "spoiler" } },
  code: { label: "</>", title: "Code", wrap: { before: "`", after: "`", placeholder: "code" } },
  quote: { label: "❝", title: "Citation", linePrefix: "> " },
  h2: { label: "H2", title: "Titre", linePrefix: "## " },
  h3: { label: "H3", title: "Sous-titre", linePrefix: "### " },
  ul: { label: "•", title: "Liste", linePrefix: "- " },
  ol: { label: "1.", title: "Liste numérotée", linePrefix: "1. " },
  link: { label: "🔗", title: "Lien", isLink: true },
};

const ORDER: FormatKey[][] = [
  ["bold", "italic", "underline", "strike"],
  ["code", "spoiler", "link"],
  ["h2", "h3", "quote", "ul", "ol"],
];

export function RichTextEditor({
  name,
  defaultValue = "",
  rows = 12,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [popup, setPopup] = useState<{
    top: number;
    left: number;
    flip: boolean;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  // The direct positioned ancestor of the popup — used as the coordinate reference.
  const popupAnchorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preserve preview scroll position when content updates (avoid auto-jump)
  const preservedScrollRef = useRef<number>(0);
  useEffect(() => {
    const pv = previewRef.current;
    if (!pv) return;
    pv.scrollTop = preservedScrollRef.current;
  }, [value]);

  // Track selection state + position the floating popup
  const checkSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const hasSel = ta.selectionStart !== ta.selectionEnd;
    setHasSelection(hasSel);
    if (!hasSel) {
      setPopup(null);
      return;
    }
    // Compute coords of the selection start (top-left corner of selection)
    const coords = getCaretCoordinates(ta, ta.selectionStart);
    const taRect = ta.getBoundingClientRect();
    // Anchor = the textarea's positioned parent (where the popup is rendered)
    const anchorRect = popupAnchorRef.current?.getBoundingClientRect();
    if (!anchorRect) return;
    // Selection-line top, in coordinates relative to the popup anchor
    const lineTop = taRect.top - anchorRect.top + coords.top;
    const lineBottom = lineTop + coords.height;
    const left = taRect.left - anchorRect.left + coords.left;
    // Popup geometry: ~42px tall + 5px caret + 12px breathing space
    const POPUP_HEIGHT = 44;
    const GAP = 12;
    const flip = lineTop < POPUP_HEIGHT + GAP + 4;
    setPopup({
      top: flip ? lineBottom + GAP : lineTop - POPUP_HEIGHT - GAP,
      left,
      flip,
    });
  }, []);

  // Apply markdown formatting to current selection
  function applyFormat(key: FormatKey) {
    const ta = textareaRef.current;
    if (!ta) return;
    const fmt = FORMATS[key];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);

    // Link — prompt for URL
    if (fmt.isLink) {
      const url = window.prompt("URL du lien :", "https://");
      if (!url) return;
      const text = selected || "texte";
      const insert = `[${text}](${url})`;
      const next = value.slice(0, start) + insert + value.slice(end);
      setValue(next);
      requestAnimationFrame(() => {
        ta.focus();
        const cursor = start + insert.length;
        ta.setSelectionRange(cursor, cursor);
      });
      return;
    }

    // Line-prefix formats: prefix every selected line (or current line)
    if (fmt.linePrefix) {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const lineStart = before.lastIndexOf("\n") + 1; // 0 if not found
      const lineEnd = end + (value.slice(end).indexOf("\n") === -1
        ? value.length - end
        : value.slice(end).indexOf("\n"));
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      // Toggle: if every line already has the prefix, remove it
      const allPrefixed = lines.every((l) => l.startsWith(fmt.linePrefix!));
      const newBlock = allPrefixed
        ? lines.map((l) => l.slice(fmt.linePrefix!.length)).join("\n")
        : lines.map((l) => fmt.linePrefix! + l).join("\n");
      const next =
        value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
      setValue(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(lineStart, lineStart + newBlock.length);
      });
      return;
    }

    // Wrap formats: surround selection with before/after
    if (fmt.wrap) {
      const { before: b, after: a, placeholder: ph = "" } = fmt.wrap;

      // Toggle: if selection is already wrapped, unwrap
      if (
        selected.startsWith(b) &&
        selected.endsWith(a) &&
        selected.length >= b.length + a.length
      ) {
        const inner = selected.slice(b.length, selected.length - a.length);
        const next = value.slice(0, start) + inner + value.slice(end);
        setValue(next);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(start, start + inner.length);
        });
        return;
      }
      // Or if surrounding chars are already the wrappers
      const outerBefore = value.slice(Math.max(0, start - b.length), start);
      const outerAfter = value.slice(end, end + a.length);
      if (outerBefore === b && outerAfter === a) {
        const next =
          value.slice(0, start - b.length) +
          selected +
          value.slice(end + a.length);
        setValue(next);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(start - b.length, end - b.length);
        });
        return;
      }

      const text = selected || ph;
      const insert = b + text + a;
      const next = value.slice(0, start) + insert + value.slice(end);
      setValue(next);
      requestAnimationFrame(() => {
        ta.focus();
        // Select the inner text so the user can keep typing or replace
        ta.setSelectionRange(start + b.length, start + b.length + text.length);
      });
    }
  }

  // Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      applyFormat("bold");
    } else if (k === "i") {
      e.preventDefault();
      applyFormat("italic");
    } else if (k === "u") {
      e.preventDefault();
      applyFormat("underline");
    } else if (k === "k") {
      e.preventDefault();
      applyFormat("link");
    }
  }

  async function insertImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? value.length;
        const before = value.slice(0, start);
        const after = value.slice(start);
        const insert = `\n![image](${url})\n`;
        const next = before + insert + after;
        setValue(next);
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + insert.length;
          ta.setSelectionRange(pos, pos);
        });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) insertImage(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) insertImage(file);
        return;
      }
    }
  }

  // Re-check selection when textarea value changes
  useEffect(() => {
    checkSelection();
  }, [value]);

  const editorHeight = `${rows * 1.5 + 2}rem`;

  return (
    <>
      <div className="space-y-1.5">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ORDER.map((group, gi) => (
            <div
              key={gi}
              className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-surface"
            >
              {group.map((key) => {
                const fmt = FORMATS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    title={fmt.title}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      applyFormat(key);
                    }}
                    className={
                      "min-w-[2rem] h-7 px-2 rounded text-xs font-medium transition-all " +
                      (hasSelection
                        ? "text-foreground hover:bg-accent-soft hover:text-accent"
                        : "text-muted hover:bg-accent-soft hover:text-foreground") +
                      (key === "bold"
                        ? " font-bold"
                        : key === "italic"
                          ? " italic"
                          : key === "underline"
                            ? " underline"
                            : key === "strike"
                              ? " line-through"
                              : key === "code"
                                ? " font-mono"
                                : "")
                    }
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Image button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              fileRef.current?.click();
            }}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium
                     border border-border bg-surface hover:bg-accent-soft hover:border-accent/40
                     text-muted hover:text-foreground transition-all disabled:opacity-50"
            title="Insérer une image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 00-1.06 0L2.5 11.06zm6.024-5.548a1.5 1.5 0 11-2.999-.001 1.5 1.5 0 012.999.001z"
                clipRule="evenodd"
              />
            </svg>
            {uploading ? "Upload…" : "Image"}
          </button>

          <span className="text-xs text-muted italic hidden md:inline ml-auto">
            {hasSelection
              ? "✨ texte sélectionné — clique un format"
              : "sélectionne du texte ou utilise Ctrl+B / I / U"}
          </span>
        </div>

        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={value} />

        {/* Split pane: Editor | Preview — fixed height so each pane scrolls independently */}
        <div
          className="rte-split"
          style={{ ["--rte-height" as string]: editorHeight }}
        >
          {/* Left: editor */}
          <div className="rte-split__editor" ref={editorPaneRef}>
            <div className="rte-split__label">Éditeur</div>
            <div className="relative flex-1 min-h-0" ref={popupAnchorRef}>
              {/* Floating selection toolbar */}
              {popup && hasSelection && (
                <div
                  className={"rte-popup" + (popup.flip ? " rte-popup--flip" : "")}
                  style={{
                    top: popup.top,
                    left: Math.max(8, popup.left),
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {(
                    [
                      ["bold", "italic", "underline", "strike"],
                      ["code", "spoiler"],
                      ["link"],
                    ] as FormatKey[][]
                  ).map((group, gi) => (
                    <div
                      key={gi}
                      style={{ display: "contents" }}
                    >
                      {gi > 0 && <span className="rte-popup__sep" aria-hidden />}
                      {group.map((key) => {
                        const fmt = FORMATS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            title={fmt.title}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              applyFormat(key);
                            }}
                            className={"rte-popup__btn rte-popup__btn--" + key}
                          >
                            {fmt.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                rows={rows}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  checkSelection();
                }}
                onSelect={checkSelection}
                onKeyUp={checkSelection}
                onMouseUp={checkSelection}
                onKeyDown={handleKeyDown}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onPaste={handlePaste}
                onBlur={() => {
                  // Delay so popup button clicks register first
                  setTimeout(() => {
                    const ta = textareaRef.current;
                    if (!ta) return;
                    if (document.activeElement !== ta) setPopup(null);
                  }, 150);
                }}
                placeholder={placeholder}
                className="w-full h-full font-mono text-sm leading-relaxed !rounded-none !border-0 !bg-transparent resize-none"
              />
              {uploading && (
                <div className="absolute bottom-3 right-3 text-xs text-accent font-hand animate-pulse">
                  upload en cours…
                </div>
              )}
            </div>
          </div>

          {/* Right: live preview */}
          <div className="rte-split__preview">
            <div className="rte-split__label">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              Aperçu
            </div>
            <div
              ref={previewRef}
              onScroll={(e) => {
                preservedScrollRef.current = e.currentTarget.scrollTop;
              }}
              className="rte-split__preview-content flex-1 min-h-0"
            >
              {value.trim() ? (
                <MarkdownContent content={value} />
              ) : (
                <p className="text-muted italic text-sm">
                  L&apos;aperçu apparaîtra ici en temps réel…
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Syntax hint */}
        <p className="text-xs text-muted">
          <strong>Markdown :</strong>{" "}
          <code className="text-accent/80">**gras**</code>{" "}
          <code className="text-accent/80">*italique*</code>{" "}
          <code className="text-accent/80">__souligné__</code>{" "}
          <code className="text-accent/80">~~barré~~</code>{" "}
          <code className="text-accent/80">||spoiler||</code>{" "}
          <code className="text-accent/80">&gt; citation</code>{" "}
          <code className="text-accent/80">- liste</code>{" "}
          <code className="text-accent/80">```code```</code>
        </p>
      </div>

      {/* File input placed outside the main container to avoid label click forwarding */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) insertImage(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

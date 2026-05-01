"use client";

import { uploadImage } from "@/lib/upload";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useRef, useState } from "react";

/**
 * A split-pane editor: Markdown textarea on the left, live preview on the right.
 * Supports drag & drop and paste of images directly into the editor.
 */
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const editorHeight = `${rows * 1.5 + 2}rem`;

  return (
    <>
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); fileRef.current?.click(); }}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     border border-border bg-surface hover:bg-accent-soft hover:border-accent/40
                     text-muted hover:text-foreground transition-all disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 00-1.06 0L2.5 11.06zm6.024-5.548a1.5 1.5 0 11-2.999-.001 1.5 1.5 0 012.999.001z" clipRule="evenodd" />
          </svg>
          {uploading ? "Upload…" : "Image"}
        </button>
        <span className="text-xs text-muted italic hidden sm:inline">
          Tu peux coller ou glisser-déposer une image
        </span>
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Split pane: Editor | Preview */}
      <div className="rte-split" style={{ minHeight: editorHeight }}>
        {/* Left: editor */}
        <div className="rte-split__editor">
          <div className="rte-split__label">Éditeur</div>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={rows}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="w-full h-full font-mono text-sm leading-relaxed !rounded-none !border-0 !bg-transparent resize-none"
              style={{ minHeight: editorHeight }}
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            Aperçu
          </div>
          <div className="rte-split__preview-content" style={{ minHeight: editorHeight }}>
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

"use client";

import { uploadImage } from "@/lib/upload";
import { useRef, useState } from "react";

/**
 * A textarea with a toolbar for inserting images inline (Markdown style).
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
        // Move cursor after the inserted text
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

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
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
          Tu peux aussi coller ou glisser-déposer une image
        </span>
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
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="w-full font-mono text-sm leading-relaxed"
        />
        {uploading && (
          <div className="absolute bottom-3 right-3 text-xs text-accent font-hand animate-pulse">
            upload en cours…
          </div>
        )}
      </div>

      {/* Syntax hint */}
      <p className="text-xs text-muted">
        <strong>Markdown :</strong>{" "}
        <code className="text-accent/80">## Titre</code>{" "}
        <code className="text-accent/80">**gras**</code>{" "}
        <code className="text-accent/80">*italique*</code>{" "}
        <code className="text-accent/80">![](url)</code>
      </p>
    </div>
  );
}

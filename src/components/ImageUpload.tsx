"use client";

import { uploadImage } from "@/lib/upload";
import { useRef, useState } from "react";

export function ImageUpload({
  name,
  defaultValue,
  label = "Image",
  shape = "square",
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
  shape?: "square" | "circle" | "wide";
}) {
  const [url, setUrl] = useState<string | null>(defaultValue ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const newUrl = await uploadImage(file);
      setUrl(newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass =
    shape === "circle"
      ? "rounded-full aspect-square"
      : shape === "wide"
        ? "rounded-xl aspect-[16/9]"
        : "rounded-xl aspect-square";

  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
        {label}
      </span>
      <input type="hidden" name={name} value={url ?? ""} />
      <div
        className="flex gap-4 items-start"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files?.[0]);
        }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={
            "relative overflow-hidden border-2 border-dashed border-border hover:border-accent transition-colors w-32 shrink-0 group cursor-pointer " +
            aspectClass
          }
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted group-hover:text-accent transition-colors p-2 text-center">
              <span className="text-2xl">+</span>
              <span className="text-xs mt-1">choisir / déposer</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-surface/80 backdrop-blur flex items-center justify-center font-hand text-accent text-lg">
              upload…
            </div>
          )}
        </button>
        <div className="flex-1 text-xs text-muted space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          {url && (
            <div className="space-y-1">
              <p className="break-all text-foreground/70 line-clamp-2">{url}</p>
              <button
                type="button"
                onClick={() => setUrl(null)}
                className="text-danger hover:underline"
              >
                retirer
              </button>
            </div>
          )}
          {error && <p className="text-danger">{error}</p>}
          <p className="italic">
            Glisse-dépose une image ou clique. JPG/PNG/WebP, max 10 Mo. Hébergée
            sur ImgChest.
          </p>
        </div>
      </div>
    </div>
  );
}

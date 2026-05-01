"use client";

import { Button, Field } from "@/components/ui";
import { uploadImage } from "@/lib/upload";
import type { Npc } from "@/lib/types";
import { useRef, useState } from "react";

export function ClueForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
          (
            document.getElementById("clue-form") as HTMLFormElement | null
          )?.reset();
          setImageUrl(null);
        } finally {
          setPending(false);
        }
      }}
      id="clue-form"
      className="space-y-2"
    >
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Field label="Nouvel indice">
            <input
              name="content"
              required
              placeholder="ex: vu près du port à minuit…"
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); fileRef.current?.click(); }}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                     border border-border bg-surface hover:bg-accent-soft hover:border-accent/40
                     text-muted hover:text-foreground transition-all disabled:opacity-50 shrink-0"
          title="Ajouter une photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 00-1.06 0L2.5 11.06zm6.024-5.548a1.5 1.5 0 11-2.999-.001 1.5 1.5 0 012.999.001z" clipRule="evenodd" />
          </svg>
          {uploading ? "…" : "📷"}
        </button>
        <Button type="submit" disabled={pending || uploading}>
          +
        </Button>
      </div>

      {/* Image preview */}
      {imageUrl && (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Aperçu"
            className="h-20 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      <input type="hidden" name="image_url" value={imageUrl ?? ""} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = "";
        }}
      />
    </form>
  );
}

export function NpcLinker({
  npcs,
  action,
}: {
  npcs: Pick<Npc, "id" | "name">[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
          (
            document.getElementById(
              "npc-linker-form"
            ) as HTMLFormElement | null
          )?.reset();
        } finally {
          setPending(false);
        }
      }}
      id="npc-linker-form"
      className="space-y-2"
    >
      <Field label="Lier un personnage">
        <select name="npc_id" required defaultValue="">
          <option value="" disabled>
            choisir
          </option>
          {npcs.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rôle">
        <select name="role" defaultValue="suspect">
          <option value="investigator">🔍 Enquêteur</option>
          <option value="suspect">Suspect</option>
          <option value="witness">Témoin</option>
          <option value="victim">Victime</option>
          <option value="informant">Informateur</option>
          <option value="accomplice">Complice</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : "Lier"}
      </Button>
    </form>
  );
}

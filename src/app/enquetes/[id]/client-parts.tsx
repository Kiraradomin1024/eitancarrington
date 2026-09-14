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
          <Field label="Nouvelle pièce au dossier">
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
          className="hand text-[19px] text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-50 shrink-0 pb-2"
          title="Ajouter une photo"
        >
          {uploading ? "…" : "+ un cliché"}
        </button>
        <Button type="submit" disabled={pending || uploading}>
          Verser
        </Button>
      </div>

      {/* Image preview */}
      {imageUrl && (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Aperçu"
            className="h-20 object-cover shadow"
          />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute -top-2 -right-3 hand text-[18px] text-pen-red"
            aria-label="Retirer le cliché"
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
          <option value="investigator">Enquêteur</option>
          <option value="suspect">Suspect</option>
          <option value="witness">Témoin</option>
          <option value="victim">Victime</option>
          <option value="informant">Informateur</option>
          <option value="accomplice">Complice</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : "Ajouter au dossier"}
      </Button>
    </form>
  );
}

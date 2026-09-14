"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button, Card, Field } from "@/components/ui";

export default function SignupPage() {
  const supabase = createClient();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = pseudo.trim();
    if (!trimmed) {
      setError("Le pseudo est requis");
      return;
    }
    if (trimmed.length < 3) {
      setError("Le pseudo doit faire au moins 3 caractères");
      return;
    }

    setLoading(true);
    // Generate a deterministic fake email from the pseudo
    const fakeEmail = `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "")}@eitan.local`;

    const { error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: { data: { display_name: trimmed } },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        setError("Ce pseudo est déjà pris.");
      } else {
        setError(error.message);
      }
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-4">
          Compte créé
        </h1>
        <p className="text-muted text-sm">
          Ton compte a été créé avec le pseudo{" "}
          <strong className="text-foreground">{pseudo}</strong>. Tu peux
          maintenant te connecter et contribuer au dossier.
        </p>
        <Link
          href="/login"
          className="text-accent hover:text-foreground mt-6 inline-block"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="hand text-[44px] font-semibold leading-none">se présenter</h1>
      <p className="hand text-[21px] text-ink-soft mt-2 mb-8">
        une fois inscrit·e, un admin valide et tu pourras écrire dans le cahier.
      </p>
      <Card className="card-glow !pt-9">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Pseudo" hint="Sera ton identifiant de connexion">
            <input
              type="text"
              required
              minLength={3}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="ex: kira, elias, blair…"
            />
          </Field>
          <Field label="Mot de passe" hint="6 caractères minimum">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="hand text-pen-red text-[18px]">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Créer le compte"}
          </Button>
          <Link
            href="/login"
            className="text-center hand text-[19px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Déjà inscrit ? Se connecter
          </Link>
        </form>
      </Card>
    </div>
  );
}

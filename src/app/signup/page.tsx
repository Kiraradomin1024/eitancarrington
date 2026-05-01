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
          Ton compte a été créé avec le pseudo <strong className="text-foreground">{pseudo}</strong>.
          Un admin devra t&apos;accorder le droit de contribuer.
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
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="font-serif text-3xl text-foreground text-center mb-2">
        Inscription
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Tu pourras consulter le dossier. Pour contribuer, il faudra qu&apos;un
        admin t&apos;y autorise.
      </p>
      <Card>
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
          {error && <p className="text-danger text-xs">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Créer le compte"}
          </Button>
          <Link
            href="/login"
            className="text-center text-xs text-muted hover:text-accent"
          >
            Déjà inscrit ? Se connecter
          </Link>
        </form>
      </Card>
    </div>
  );
}

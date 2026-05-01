"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button, Card, Field } from "@/components/ui";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
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
          Vérifie ta boite mail pour confirmer ton adresse. Une fois confirmé,
          un admin devra t&apos;accorder le droit de contribuer.
        </p>
        <Link
          href="/login"
          className="text-accent hover:text-foreground mt-6 inline-block"
        >
          Retour à la connexion
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
          <Field label="Pseudo">
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

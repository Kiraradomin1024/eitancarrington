"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="font-serif text-3xl text-foreground text-center mb-2">
        Connexion
      </h1>
      <p className="text-muted text-sm text-center mb-8">
        Pour contribuer au dossier d&apos;Eitan.
      </p>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-danger text-xs">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Se connecter"}
          </Button>
          <Link
            href="/signup"
            className="text-center text-xs text-muted hover:text-accent"
          >
            Pas encore de compte ? S&apos;inscrire
          </Link>
        </form>
      </Card>
    </div>
  );
}

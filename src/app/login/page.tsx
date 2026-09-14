"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Reconstruct the fake email from the pseudo
    const fakeEmail = `${pseudo.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@eitan.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });
    setLoading(false);
    if (error) {
      setError("Pseudo ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="hand text-[44px] font-semibold leading-none">montrer patte blanche</h1>
      <p className="hand text-[21px] text-ink-soft mt-2 mb-8">
        le cahier se lit sans compte. pour y écrire, il faut se présenter.
      </p>
      <Card className="card-glow !pt-9">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Pseudo">
            <input
              type="text"
              required
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo"
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
          {error && <p className="hand text-pen-red text-[18px]">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Se connecter"}
          </Button>
          <Link
            href="/signup"
            className="text-center hand text-[19px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Pas encore de compte ? S&apos;inscrire
          </Link>
        </form>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui";

export function SetupNotice() {
  return (
    <Card className="max-w-2xl mx-auto mt-12">
      <h2 className="font-serif text-3xl text-foreground mb-4">
        Configuration Supabase requise
      </h2>
      <p className="text-muted text-sm mb-4">
        Le dossier ne peut pas s&apos;ouvrir tant que la base de données
        n&apos;est pas branchée. Suis ces étapes :
      </p>
      <ol className="list-decimal list-inside space-y-3 text-sm text-foreground/85">
        <li>
          Crée un projet sur{" "}
          <a
            className="text-accent hover:text-foreground underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com
          </a>
          .
        </li>
        <li>
          Copie <code className="text-accent">.env.local.example</code> en{" "}
          <code className="text-accent">.env.local</code> et remplis les valeurs
          (Project Settings → API).
        </li>
        <li>
          Ouvre l&apos;éditeur SQL Supabase, copie tout le contenu de{" "}
          <code className="text-accent">supabase/schema.sql</code>, exécute.
        </li>
        <li>
          Dans Authentication → Providers, active Email (par défaut OK).
        </li>
        <li>Redémarre le serveur de dev (npm run dev).</li>
        <li>
          Inscris-toi avec ton email{" "}
          <code className="text-accent">belcourtanastasia@gmail.com</code> — tu
          seras automatiquement promu admin.
        </li>
      </ol>
    </Card>
  );
}

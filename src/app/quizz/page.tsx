import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import type { QuizQuestion, QuizAttempt } from "@/lib/types";
import { QuizClient } from "@/components/QuizClient";

export const metadata = {
  title: "Quizz",
  description:
    "Teste tes connaissances sur Eitan, ses proches et ses enquêtes.",
};

// Always render fresh — leaderboard and answers update at every load
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { user, role } = await getCurrentUserAndRole();
  const admin = isAdmin(role);

  const [
    { data: questionsRaw },
    { data: myAttemptsRaw },
    { data: leaderboardRaw },
  ] = await Promise.all([
    supabase
      .from("quiz_questions")
      .select("*")
      .order("created_at", { ascending: true }),
    user
      ? supabase
          .from("quiz_attempts")
          .select("*")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    // Aggregated server-side via a SQL view → bypasses PostgREST's 1000-row cap.
    supabase
      .from("quiz_leaderboard")
      .select("user_id, score, total"),
  ]);

  const questions = (questionsRaw ?? []) as QuizQuestion[];
  const myAttempts = (myAttemptsRaw ?? []) as QuizAttempt[];

  type Row = { user_id: string; score: number; total: number };
  const ranked = ((leaderboardRaw ?? []) as Row[]).sort(
    (a, b) => b.score - a.score || a.total - b.total
  );

  // Fetch display names for ranked users
  const userIds = ranked.map((r) => r.user_id);
  const { data: profilesRaw } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds)
      : { data: [] };
  const profileById = new Map(
    ((profilesRaw ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p]
    )
  );
  const leaderboard = ranked.map((r) => ({
    ...r,
    display_name: profileById.get(r.user_id)?.display_name ?? "Anonyme",
    avatar_url: profileById.get(r.user_id)?.avatar_url ?? null,
  }));

  return (
    <div>
      <PageTitle
        title="Quizz"
        subtitle="Réponds aux questions sur l'univers d'Eitan. Une seule chance par question."
        scribble="combien tu sais ?"
      />
      <QuizClient
        questions={questions}
        myAttempts={myAttempts}
        leaderboard={leaderboard}
        isLoggedIn={!!user}
        userId={user?.id ?? null}
        isAdmin={admin}
      />
    </div>
  );
}

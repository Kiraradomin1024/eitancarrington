"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuizOption } from "@/lib/types";

const OPTIONS: QuizOption[] = ["a", "b", "c", "d"];
function asOption(v: unknown): QuizOption {
  const s = String(v ?? "").trim().toLowerCase();
  if ((OPTIONS as string[]).includes(s)) return s as QuizOption;
  throw new Error("Option invalide");
}

function parseQuestion(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) throw new Error("Question requise");
  const option_a = String(formData.get("option_a") ?? "").trim();
  const option_b = String(formData.get("option_b") ?? "").trim();
  const option_c = String(formData.get("option_c") ?? "").trim();
  const option_d = String(formData.get("option_d") ?? "").trim();
  if (!option_a || !option_b || !option_c || !option_d) {
    throw new Error("Les 4 réponses doivent être remplies");
  }
  const correct_option = asOption(formData.get("correct_option"));
  const category =
    (formData.get("category") as string)?.trim() || null;
  return { question, option_a, option_b, option_c, option_d, correct_option, category };
}

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("Réservé aux admins");
  return { supabase, user };
}

export async function createQuizQuestion(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const payload = parseQuestion(formData);
  const { error } = await supabase
    .from("quiz_questions")
    .insert({ ...payload, created_by: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/quizz");
}

export async function updateQuizQuestion(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = parseQuestion(formData);
  const { error } = await supabase
    .from("quiz_questions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quizz");
}

export async function deleteQuizQuestion(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quizz");
}

export async function submitQuizAnswer(
  questionId: string,
  chosen: string
): Promise<{ correct: boolean; correct_option: QuizOption }> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Connecte-toi pour répondre");
  const option = asOption(chosen);

  // Look up correct answer (server-side, can't be tampered with)
  const { data: q, error: qErr } = await supabase
    .from("quiz_questions")
    .select("correct_option")
    .eq("id", questionId)
    .maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (!q) throw new Error("Question introuvable");
  const correct_option = q.correct_option as QuizOption;
  const is_correct = option === correct_option;

  const { error: insErr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      question_id: questionId,
      chosen_option: option,
      is_correct,
    });
  // Unique violation = already answered. Just return current state.
  if (insErr && !/duplicate|unique/i.test(insErr.message)) {
    throw new Error(insErr.message);
  }
  revalidatePath("/quizz");
  return { correct: is_correct, correct_option };
}

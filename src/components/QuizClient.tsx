"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QuizQuestion, QuizAttempt, QuizOption } from "@/lib/types";
import {
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  submitQuizAnswer,
} from "@/app/quizz/actions";

const OPTIONS: QuizOption[] = ["a", "b", "c", "d"];
const OPTION_LABEL: Record<QuizOption, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

type LeaderboardRow = {
  user_id: string;
  score: number;
  total: number;
  display_name: string;
  avatar_url: string | null;
};

type Phase = "intro" | "playing" | "feedback" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizClient({
  questions,
  myAttempts,
  leaderboard,
  isLoggedIn,
  userId,
  isAdmin,
}: {
  questions: QuizQuestion[];
  myAttempts: QuizAttempt[];
  leaderboard: LeaderboardRow[];
  isLoggedIn: boolean;
  userId: string | null;
  isAdmin: boolean;
}) {
  const answeredIds = useMemo(
    () => new Set(myAttempts.map((a) => a.question_id)),
    [myAttempts]
  );
  const remaining = useMemo(
    () => questions.filter((q) => !answeredIds.has(q.id)),
    [questions, answeredIds]
  );

  const previousScore = myAttempts.filter((a) => a.is_correct).length;

  const [phase, setPhase] = useState<Phase>("intro");
  const [order, setOrder] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<QuizOption | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<QuizOption | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminPanel, setAdminPanel] = useState(false);
  const [editing, setEditing] = useState<QuizQuestion | "new" | null>(null);

  const current = order[index] ?? null;

  function start() {
    if (remaining.length === 0) {
      setPhase("done");
      return;
    }
    setOrder(shuffle(remaining));
    setIndex(0);
    setSessionScore(0);
    setChosen(null);
    setRevealedCorrect(null);
    setPhase("playing");
    setError(null);
  }

  async function answer(opt: QuizOption) {
    if (!current || submitting || phase !== "playing") return;
    if (!isLoggedIn) {
      setError("Connecte-toi pour répondre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setChosen(opt);
    try {
      const res = await submitQuizAnswer(current.id, opt);
      setRevealedCorrect(res.correct_option);
      setWasCorrect(res.correct);
      if (res.correct) setSessionScore((s) => s + 1);
      setPhase("feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setChosen(null);
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    setChosen(null);
    setRevealedCorrect(null);
    if (index + 1 >= order.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setPhase("playing");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {error && (
          <div className="card p-3 text-sm text-danger bg-danger/10 border border-danger/30 mb-3">
            {error}
          </div>
        )}

        {phase === "intro" && (
          <IntroScreen
            isLoggedIn={isLoggedIn}
            totalQuestions={questions.length}
            remaining={remaining.length}
            previousScore={previousScore}
            previousTotal={myAttempts.length}
            onStart={start}
          />
        )}

        {phase === "playing" && current && (
          <QuestionCard
            question={current}
            indexInOrder={index}
            orderTotal={order.length}
            chosen={chosen}
            revealedCorrect={null}
            disabled={submitting}
            onChoose={answer}
          />
        )}

        {phase === "feedback" && current && (
          <>
            <QuestionCard
              question={current}
              indexInOrder={index}
              orderTotal={order.length}
              chosen={chosen}
              revealedCorrect={revealedCorrect}
              disabled
              onChoose={() => {}}
            />
            <FeedbackBar
              wasCorrect={wasCorrect}
              revealedCorrect={revealedCorrect}
              isLast={index + 1 >= order.length}
              onNext={nextQuestion}
            />
          </>
        )}

        {phase === "done" && (
          <DoneScreen
            sessionScore={sessionScore}
            sessionTotal={order.length}
            totalScore={myAttempts.filter((a) => a.is_correct).length}
            totalAnswered={myAttempts.length}
            totalQuestions={questions.length}
            onRestart={() => setPhase("intro")}
          />
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-3">
        {isAdmin && (
          <div className="card p-3">
            <button
              type="button"
              onClick={() => setAdminPanel(true)}
              className="w-full px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] border border-border text-muted hover:border-accent/60 hover:text-accent transition-colors"
            >
              ⚙️ Gérer les questions
            </button>
          </div>
        )}
        <Leaderboard rows={leaderboard} userId={userId} />
      </aside>

      {/* Admin panel modal */}
      {adminPanel && isAdmin && (
        <AdminPanel
          questions={questions}
          onClose={() => setAdminPanel(false)}
          onEdit={(q) => setEditing(q)}
          onAdd={() => setEditing("new")}
          onDelete={async (id) => {
            if (!confirm("Supprimer cette question ?")) return;
            try {
              await deleteQuizQuestion(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erreur");
            }
          }}
        />
      )}

      {editing && (
        <QuestionForm
          state={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ───────── Screens ───────── */

function IntroScreen({
  isLoggedIn,
  totalQuestions,
  remaining,
  previousScore,
  previousTotal,
  onStart,
}: {
  isLoggedIn: boolean;
  totalQuestions: number;
  remaining: number;
  previousScore: number;
  previousTotal: number;
  onStart: () => void;
}) {
  if (totalQuestions === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-hand text-2xl text-accent mb-2">
          rien à grignoter
        </p>
        <p className="text-muted text-sm">
          Aucune question n&apos;a encore été ajoutée.
        </p>
      </div>
    );
  }
  if (!isLoggedIn) {
    return (
      <div className="card p-10 text-center">
        <p className="font-hand text-2xl text-accent mb-2">
          connecte-toi pour jouer
        </p>
        <p className="text-muted text-sm">
          {totalQuestions > 1
            ? `${totalQuestions} questions t'attendent.`
            : "1 question t'attend."}{" "}
          Une connexion suffit pour participer au classement.
        </p>
      </div>
    );
  }
  return (
    <div className="card p-10 text-center space-y-5">
      <p className="font-hand text-2xl text-accent">prêt ?</p>
      <h2 className="font-display text-4xl text-foreground">
        Quizz d&apos;Eitan
      </h2>
      <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
        Une seule chance par question. Réponds vite, réponds bien — tes scores
        comptent pour le classement permanent.
      </p>

      {previousTotal > 0 && (
        <div className="inline-flex items-center gap-3 text-xs text-muted border border-border px-4 py-2">
          <span>
            Déjà joué :{" "}
            <strong className="text-foreground">
              {previousScore}/{previousTotal}
            </strong>
          </span>
          <span className="opacity-50">·</span>
          <span>
            Restant :{" "}
            <strong className={remaining === 0 ? "text-muted" : "text-accent"}>
              {remaining}
            </strong>
          </span>
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onStart}
          disabled={remaining === 0}
          className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] border border-accent text-accent hover:bg-accent hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {remaining === 0
            ? "Tu as tout répondu 🏆"
            : previousTotal > 0
              ? "Continuer"
              : "Commencer"}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  indexInOrder,
  orderTotal,
  chosen,
  revealedCorrect,
  disabled,
  onChoose,
}: {
  question: QuizQuestion;
  indexInOrder: number;
  orderTotal: number;
  chosen: QuizOption | null;
  revealedCorrect: QuizOption | null;
  disabled: boolean;
  onChoose: (opt: QuizOption) => void;
}) {
  const locked = !!revealedCorrect;
  const progress = ((indexInOrder + (locked ? 1 : 0)) / orderTotal) * 100;
  return (
    <div className="quiz-card-in space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="meta-label">
          Question {indexInOrder + 1} <span className="opacity-50">/ {orderTotal}</span>
        </span>
        {question.category && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-accent border border-accent/40 px-2.5 py-1">
            {question.category}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="font-display font-light text-3xl md:text-4xl text-foreground leading-[1.2]">
        {question.question}
      </h2>

      {/* Options */}
      <div className="hairline-grid sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const text = question[`option_${opt}` as const];
          const isChosen = chosen === opt;
          const isCorrect = revealedCorrect === opt;
          const isWrongChosen = isChosen && revealedCorrect && !isCorrect;
          let tone = "text-foreground hover:bg-surface-2";
          if (locked) {
            if (isCorrect) tone = "text-success bg-success/10";
            else if (isWrongChosen) tone = "text-danger bg-danger/10";
            else tone = "text-muted opacity-55";
          } else if (isChosen) {
            tone = "text-accent bg-accent-soft";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(opt)}
              className={
                "group relative text-left px-6 py-5 transition-colors flex items-center gap-5 disabled:cursor-default " +
                tone
              }
            >
              <span
                className={
                  "font-display text-base shrink-0 w-4 transition-colors " +
                  (locked && isCorrect
                    ? "text-success"
                    : locked && isWrongChosen
                      ? "text-danger"
                      : isChosen
                        ? "text-accent"
                        : "text-muted group-hover:text-accent")
                }
              >
                {OPTION_LABEL[opt]}
              </span>
              <span className="flex-1 text-base leading-snug">{text}</span>
              {locked && isCorrect && (
                <span className="text-success shrink-0">✓</span>
              )}
              {locked && isWrongChosen && (
                <span className="text-danger shrink-0">✕</span>
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes quiz-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .quiz-card-in {
          animation: quiz-card-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

function FeedbackBar({
  wasCorrect,
  revealedCorrect,
  isLast,
  onNext,
}: {
  wasCorrect: boolean;
  revealedCorrect: QuizOption | null;
  isLast: boolean;
  onNext: () => void;
}) {
  // Autofocus the next button so Enter/Space works without aiming
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);
  return (
    <div
      className={
        "mt-4 card p-4 flex items-center justify-between gap-3 quiz-fb-in " +
        (wasCorrect
          ? "border-success/40 bg-success/5"
          : "border-danger/40 bg-danger/5")
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={
            "w-10 h-10 flex items-center justify-center text-background text-xl " +
            (wasCorrect ? "bg-success" : "bg-danger")
          }
        >
          {wasCorrect ? "✓" : "✕"}
        </span>
        <div>
          <div className="font-medium text-foreground">
            {wasCorrect ? "Bonne réponse !" : "Raté"}
          </div>
          {!wasCorrect && revealedCorrect && (
            <div className="text-xs text-muted">
              La bonne :{" "}
              <strong className="text-foreground">
                {OPTION_LABEL[revealedCorrect]}
              </strong>
            </div>
          )}
        </div>
      </div>
      <button
        ref={btnRef}
        type="button"
        onClick={onNext}
        className="px-6 py-3 text-[11px] uppercase tracking-[0.22em] border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
      >
        {isLast ? "Voir le score →" : "Suivante →"}
      </button>
      <style jsx>{`
        @keyframes quiz-fb-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .quiz-fb-in {
          animation: quiz-fb-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function DoneScreen({
  sessionScore,
  sessionTotal,
  totalScore,
  totalAnswered,
  totalQuestions,
  onRestart,
}: {
  sessionScore: number;
  sessionTotal: number;
  totalScore: number;
  totalAnswered: number;
  totalQuestions: number;
  onRestart: () => void;
}) {
  const ratio = sessionTotal === 0 ? 0 : sessionScore / sessionTotal;
  const verdict =
    ratio === 1
      ? "Sans-faute. Tu connais Eitan mieux qu'Eitan."
      : ratio >= 0.75
        ? "Bien joué."
        : ratio >= 0.5
          ? "Pas mal, mais y'a mieux."
          : ratio > 0
            ? "Aïe."
            : "Catastrophe.";
  const remaining = totalQuestions - totalAnswered;
  return (
    <div className="card p-10 text-center space-y-5">
      <p className="font-hand text-2xl text-accent">terminé</p>
      <div className="font-display text-6xl text-foreground tabular-nums">
        {sessionScore}
        <span className="text-muted text-3xl">/{sessionTotal}</span>
      </div>
      <p className="text-foreground/85">{verdict}</p>
      <div className="text-xs text-muted">
        Total cumulé :{" "}
        <strong className="text-foreground">
          {totalScore} / {totalAnswered}
        </strong>
        {remaining > 0 && (
          <>
            <span className="mx-2 opacity-50">·</span>
            {remaining} question{remaining > 1 ? "s" : ""} restante
            {remaining > 1 ? "s" : ""}
          </>
        )}
      </div>
      <div className="pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="px-6 py-3 text-[11px] uppercase tracking-[0.22em] border border-border text-muted hover:border-accent/60 hover:text-accent transition-colors"
        >
          Retour au menu
        </button>
      </div>
    </div>
  );
}

/* ───────── Sidebar ───────── */

const LEADERBOARD_TOP = 10;

function Leaderboard({
  rows,
  userId,
}: {
  rows: LeaderboardRow[];
  userId: string | null;
}) {
  const top = rows.slice(0, LEADERBOARD_TOP);
  const myIndex = userId ? rows.findIndex((r) => r.user_id === userId) : -1;
  const myRow =
    myIndex >= LEADERBOARD_TOP ? { row: rows[myIndex], rank: myIndex + 1 } : null;

  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-muted mb-3 font-medium">
        Classement
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted italic">
          Personne n&apos;a encore joué.
        </p>
      ) : (
        <ol className="space-y-1">
          {top.map((row, i) => (
            <LeaderboardRowItem
              key={row.user_id}
              row={row}
              rank={i + 1}
              isMe={row.user_id === userId}
            />
          ))}
          {myRow && (
            <>
              <li
                aria-hidden="true"
                className="text-center text-muted text-xs py-1 select-none"
              >
                · · ·
              </li>
              <LeaderboardRowItem
                row={myRow.row}
                rank={myRow.rank}
                isMe
              />
            </>
          )}
        </ol>
      )}
    </div>
  );
}

function LeaderboardRowItem({
  row,
  rank,
  isMe,
}: {
  row: LeaderboardRow;
  rank: number;
  isMe: boolean;
}) {
  return (
    <li
      className={
        "flex items-center gap-2 px-2 py-1.5 rounded-none " +
        (isMe ? "bg-accent-soft" : "")
      }
    >
      <span className="w-7 text-xs font-medium shrink-0 text-center">
        {rank === 1
          ? "🥇"
          : rank === 2
            ? "🥈"
            : rank === 3
              ? "🥉"
              : `#${rank}`}
      </span>
      {row.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.avatar_url}
          alt=""
          className="w-6 h-6 rounded-full object-cover border border-border"
          data-no-lightbox=""
        />
      ) : (
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-white text-[10px] flex items-center justify-center shrink-0">
          {row.display_name[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      <span className="text-sm text-foreground/90 truncate flex-1">
        {row.display_name}
      </span>
      <span className="text-xs text-muted tabular-nums shrink-0">
        {row.score}
        <span className="opacity-60">/{row.total}</span>
      </span>
    </li>
  );
}

/* ───────── Admin panel + form ───────── */

function AdminPanel({
  questions,
  onClose,
  onEdit,
  onAdd,
  onDelete,
}: {
  questions: QuizQuestion[];
  onClose: () => void;
  onEdit: (q: QuizQuestion) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-none shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-foreground">
            Gérer les questions
          </h2>
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
          >
            + Nouvelle
          </button>
        </div>
        {questions.length === 0 ? (
          <p className="text-muted text-sm italic">Aucune question.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {questions.map((q) => (
              <li
                key={q.id}
                className="border border-border rounded-none px-3 py-2 flex items-start gap-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted mb-0.5 flex items-center gap-2">
                    {q.category && (
                      <span className="px-2 py-0.5 border border-accent/40 text-accent text-[10px] uppercase tracking-[0.16em]">
                        {q.category}
                      </span>
                    )}
                    <span className="text-[10px]">
                      bonne : <strong>{OPTION_LABEL[q.correct_option]}</strong>
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-2">
                    {q.question}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(q)}
                    className="text-xs px-2 py-1 rounded-full text-muted hover:text-foreground hover:bg-surface-2"
                  >
                    modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(q.id)}
                    className="text-xs px-2 py-1 rounded-full text-muted hover:text-danger hover:bg-danger/10"
                  >
                    supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm text-muted hover:text-foreground"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionForm({
  state,
  onClose,
}: {
  state: QuizQuestion | "new";
  onClose: () => void;
}) {
  const isEdit = state !== "new";
  const q = isEdit ? state : null;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      if (q) await updateQuizQuestion(q.id, fd);
      else await createQuizQuestion(fd);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-none shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-2xl text-foreground">
          {isEdit ? "Modifier la question" : "Nouvelle question"}
        </h2>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Question *
          </span>
          <textarea
            name="question"
            required
            rows={2}
            defaultValue={q?.question ?? ""}
            placeholder="Quel est…"
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
            Catégorie (optionnel)
          </span>
          <input
            name="category"
            defaultValue={q?.category ?? ""}
            placeholder="lore, npcs, soucis…"
          />
        </div>

        <div className="space-y-3">
          <span className="text-xs uppercase tracking-wider text-muted block font-medium">
            Réponses (coche la bonne)
          </span>
          {OPTIONS.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="radio"
                  name="correct_option"
                  value={opt}
                  required
                  defaultChecked={q?.correct_option === opt}
                  className="!w-4 !h-4 !p-0 accent-accent"
                />
                <span className="w-6 h-6 rounded-full bg-surface-2 text-muted text-xs font-medium flex items-center justify-center">
                  {OPTION_LABEL[opt]}
                </span>
              </label>
              <input
                name={`option_${opt}`}
                required
                defaultValue={q?.[`option_${opt}` as const] ?? ""}
                placeholder={`Réponse ${OPTION_LABEL[opt]}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-none px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm text-muted hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}

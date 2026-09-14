"use client";

import { Sheet } from "@/components/paper";
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
    <div className="grid lg:grid-cols-[1fr_300px] gap-10 lg:gap-12 items-start">
      <div className="min-w-0">
        {error && (
          <p className="hand text-[20px] text-pen-red mb-3">{error}</p>
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
      <aside className="space-y-6">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAdminPanel(true)}
            className="hand text-[20px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            préparer les questions
          </button>
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
      <div className="py-10">
        <p className="hand text-[28px] text-ink-faint">page blanche.</p>
        <p className="hand text-[21px] text-ink-soft">
          aucune question n&apos;a encore été préparée.
        </p>
      </div>
    );
  }
  if (!isLoggedIn) {
    return (
      <Sheet className="!pt-9 max-w-[560px]" rotate="-0.6deg" label="Interro surprise">
        <p className="hand text-[28px] font-semibold leading-tight">
          connecte-toi pour jouer
        </p>
        <p className="print text-[15.5px] leading-[1.7] mt-2">
          {totalQuestions > 1
            ? `${totalQuestions} questions t'attendent.`
            : "1 question t'attend."}{" "}
          Une connexion suffit pour entrer au tableau des notes.
        </p>
      </Sheet>
    );
  }
  return (
    <Sheet className="!pt-9 max-w-[620px]" rotate="-0.6deg" label="Interro surprise" labelRight={`${totalQuestions} questions`}>
      <p className="hand text-[24px] text-pen-red" style={{ transform: "rotate(-2deg)" }}>
        prêt ?
      </p>
      <h2 className="print text-[32px] sm:text-[38px] font-semibold leading-[1.1] mt-1">
        Combien tu sais sur Eitan ?
      </h2>
      <p className="print text-[15.5px] leading-[1.7] mt-3 max-w-[48ch]">
        Une seule chance par question. Réponds vite, réponds bien : tes notes
        comptent pour le tableau permanent.
      </p>

      {previousTotal > 0 && (
        <p className="font-typed text-[12px] uppercase tracking-[0.1em] text-typed-strong mt-5">
          déjà rendu : {previousScore}/{previousTotal} · reste : {remaining}
        </p>
      )}

      <div className="mt-7">
        <button
          type="button"
          onClick={onStart}
          disabled={remaining === 0}
          className="stamp text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ mixBlendMode: "normal", opacity: 1 }}
        >
          {remaining === 0
            ? "Tout rendu"
            : previousTotal > 0
              ? "Continuer"
              : "Commencer"}
        </button>
      </div>
    </Sheet>
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
  return (
    <Sheet
      className="!pt-9 quiz-card-in"
      rotate="-0.4deg"
      label={`Question ${indexInOrder + 1} / ${orderTotal}`}
      labelRight={question.category ?? undefined}
    >
      <h2 className="print text-[26px] md:text-[31px] font-semibold leading-[1.2] max-w-[34ch]">
        {question.question}
      </h2>

      <ol className="mt-6 space-y-2">
        {OPTIONS.map((opt) => {
          const text = question[`option_${opt}` as const];
          const isChosen = chosen === opt;
          const isCorrect = revealedCorrect === opt;
          const isWrongChosen = isChosen && !!revealedCorrect && !isCorrect;
          return (
            <li key={opt}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChoose(opt)}
                className={
                  "group w-full text-left flex items-baseline gap-4 py-2 px-1 disabled:cursor-default " +
                  (locked && !isCorrect && !isWrongChosen ? "opacity-50" : "")
                }
              >
                <span
                  className={
                    "font-typed text-[13px] w-7 h-7 shrink-0 flex items-center justify-center " +
                    (!locked ? "group-hover:text-ink" : "")
                  }
                  style={{
                    border: isCorrect
                      ? "2.5px solid var(--pen-green)"
                      : isWrongChosen || isChosen
                        ? "2.5px solid var(--pen-red)"
                        : "1.5px solid var(--sheet-rule)",
                    borderRadius: "48% 52% 46% 54% / 52% 46% 54% 48%",
                    color: isCorrect ? "var(--pen-green)" : isChosen ? "var(--pen-red)" : "var(--typed)",
                  }}
                >
                  {OPTION_LABEL[opt]}
                </span>
                <span
                  className={
                    "print text-[17px] leading-snug flex-1 " +
                    (isWrongChosen ? "line-through decoration-2 decoration-[color:var(--pen-red)]" : "")
                  }
                >
                  {text}
                </span>
                {locked && isCorrect && (
                  <span className="hand text-[22px] text-pen-green shrink-0">juste</span>
                )}
                {locked && isWrongChosen && (
                  <span className="hand text-[22px] text-pen-red shrink-0">faux</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 h-[3px]" style={{ background: "var(--sheet-rule)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${((indexInOrder + (locked ? 1 : 0)) / orderTotal) * 100}%`,
            background: "var(--ink)",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes quiz-card-in {
          from { opacity: 0; transform: translateY(8px) rotate(-0.4deg); }
          to { opacity: 1; transform: translateY(0) rotate(-0.4deg); }
        }
        :global(.quiz-card-in) {
          animation: quiz-card-in 0.25s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.quiz-card-in) { animation: none; }
        }
      `}</style>
    </Sheet>
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
  // Le bouton suivant prend le focus : Entrée ou Espace suffisent
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);
  return (
    <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
      <p
        className={"hand text-[28px] leading-tight " + (wasCorrect ? "text-pen-green" : "text-pen-red")}
        style={{ transform: "rotate(-1.5deg)" }}
      >
        {wasCorrect ? "bien vu." : "raté."}
        {!wasCorrect && revealedCorrect && (
          <span className="text-[21px] text-ink-soft">
            {" "}c&apos;était la {OPTION_LABEL[revealedCorrect]}.
          </span>
        )}
      </p>
      <button
        ref={btnRef}
        type="button"
        onClick={onNext}
        className="stamp stamp--sm text-ink"
        style={{ mixBlendMode: "normal", opacity: 1 }}
      >
        {isLast ? "Voir la note" : "Question suivante"}
      </button>
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
      ? "sans-faute. tu connais Eitan mieux qu'Eitan."
      : ratio >= 0.75
        ? "bien joué."
        : ratio >= 0.5
          ? "pas mal, mais y'a mieux."
          : ratio > 0
            ? "aïe."
            : "catastrophe.";
  const remaining = totalQuestions - totalAnswered;
  return (
    <Sheet className="!pt-9 max-w-[560px]" rotate="0.5deg" label="Copie rendue">
      <div className="flex items-end gap-6 flex-wrap">
        <div
          className="hand text-pen-red leading-none px-4 py-2"
          style={{ border: "3px solid var(--pen-red)", borderRadius: "50% 46% 52% 48% / 48% 54% 46% 52%", transform: "rotate(-6deg)" }}
        >
          <span className="text-[64px] font-semibold">{sessionScore}</span>
          <span className="text-[34px]">/{sessionTotal}</span>
        </div>
        <p className="hand text-[26px] leading-tight text-pen-red max-w-[18ch]">{verdict}</p>
      </div>
      <p className="font-typed text-[12px] uppercase tracking-[0.1em] text-typed-strong mt-6">
        total : {totalScore} / {totalAnswered}
        {remaining > 0 && ` · ${remaining} question${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`}
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="hand text-[20px] text-ink-soft underline underline-offset-4 hover:text-ink mt-5"
      >
        revenir au début
      </button>
    </Sheet>
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
    <div>
      <div className="hand text-[26px] font-semibold hand-under inline-block">
        le tableau des notes
      </div>
      {rows.length === 0 ? (
        <p className="hand text-[20px] text-ink-faint mt-2">
          personne n&apos;a encore rendu sa copie.
        </p>
      ) : (
        <ol className="mt-3">
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
              <li aria-hidden="true" className="hand text-ink-faint text-[20px] pl-8 select-none">
                …
              </li>
              <LeaderboardRowItem row={myRow.row} rank={myRow.rank} isMe />
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
    <li className="flex items-baseline gap-3 hand text-[21px] leading-[32px]">
      <span
        className={"w-6 text-right shrink-0 " + (rank <= 3 ? "text-pen-red font-semibold" : "text-ink-faint")}
      >
        {rank}.
      </span>
      <span
        className={"truncate flex-1 " + (isMe ? "font-semibold" : "")}
        style={isMe ? { borderBottom: "2px solid var(--pen-red)" } : undefined}
      >
        {row.display_name}
        {isMe && <span className="text-pen-red text-[17px]"> (toi)</span>}
      </span>
      <span className="font-typed text-[12px] text-typed-strong tabular-nums shrink-0">
        {row.score}/{row.total}
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
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: "rgba(20, 16, 10, 0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet sheet--stapled w-full max-w-2xl px-6 pt-9 pb-6 space-y-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="hand text-[30px] font-semibold text-ink leading-none">
            les questions de l&apos;interro
          </h2>
          <button
            type="button"
            onClick={onAdd}
            className="stamp stamp--sm text-ink"
          >
            Nouvelle
          </button>
        </div>
        {questions.length === 0 ? (
          <p className="text-muted text-sm italic">Aucune question.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {questions.map((q) => (
              <li
                key={q.id}
                className="border-b border-[color:var(--sheet-rule)] px-1 py-2 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="typed mb-0.5 flex items-center gap-2">
                    {q.category && <span>{q.category} ·</span>}
                    <span className="text-[10px]">
                      bonne : <strong>{OPTION_LABEL[q.correct_option]}</strong>
                    </span>
                  </div>
                  <p className="print text-[15px] line-clamp-2">
                    {q.question}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(q)}
                    className="hand text-[18px] text-ink-soft underline underline-offset-4 hover:text-ink px-1"
                  >
                    corriger
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(q.id)}
                    className="hand text-[18px] text-pen-red/80 underline underline-offset-4 hover:text-pen-red px-1"
                  >
                    rayer
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
            className="hand text-[20px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            fermer
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
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: "rgba(20, 16, 10, 0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="sheet sheet--stapled w-full max-w-lg px-6 pt-9 pb-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="hand text-[30px] font-semibold text-ink leading-none">
          {isEdit ? "corriger la question" : "une nouvelle question"}
        </h2>

        <div>
          <span className="typed mb-1 block">
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
          <span className="typed mb-1 block">
            Catégorie (optionnel)
          </span>
          <input
            name="category"
            defaultValue={q?.category ?? ""}
            placeholder="lore, npcs, soucis…"
          />
        </div>

        <div className="space-y-3">
          <span className="typed block">
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
                <span className="font-typed w-6 h-6 text-typed text-[12px] flex items-center justify-center" style={{ border: "1.5px solid var(--sheet-rule)", borderRadius: "50%" }}>
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
          <p className="hand text-[19px] text-pen-red">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="hand text-[20px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            laisser tomber
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="stamp stamp--sm text-ink disabled:opacity-50"
          >
            {submitting ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}

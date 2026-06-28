"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Clock, Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

type Phase = "LOADING" | "SETUP" | "PLAYING" | "WIN" | "LOSS";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

const AI_ACCURACY: Record<Difficulty, number> = { EASY: 0.5, MEDIUM: 0.7, HARD: 0.88 };
const AI_XP: Record<Difficulty, number> = { EASY: 30, MEDIUM: 60, HARD: 80 };

function toCorrectIndex(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const upper = val.toUpperCase();
    if (upper === "A") return 0;
    if (upper === "B") return 1;
    if (upper === "C") return 2;
    if (upper === "D") return 3;
    const n = parseInt(val, 10);
    if (!isNaN(n)) return n;
  }
  return 0;
}

function VsAiInner() {
  const searchParams  = useSearchParams();
  const quizId        = searchParams.get("quizId") ?? "";
  const quizTitle     = searchParams.get("quizTitle") ?? "Quiz";

  const { user, loading: userLoading } = useCurrentUser();
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [fetchError,  setFetchError]  = useState<string | null>(null);

  const [phase,       setPhase]       = useState<Phase>("LOADING");
  const [difficulty,  setDifficulty]  = useState<Difficulty>("MEDIUM");
  const [qIndex,      setQIndex]      = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(15);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [myScore,     setMyScore]     = useState(0);
  const [aiScore,     setAiScore]     = useState(0);

  // Fetch questions on mount
  useEffect(() => {
    if (userLoading) return;
    const supabase = createClient();
    let query = supabase
      .from("question")
      .select("id, question, options, answer, explanation");

    if (quizId) query = query.eq("quiz_id", quizId);

    query.limit(10).then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        setFetchError(error?.message ?? "No questions available for this quiz.");
        return;
      }
      const mapped: Question[] = (data as Record<string, unknown>[]).map(row => {
        const opts = Array.isArray(row.options) ? (row.options as string[]) : [];
        const ans  = Array.isArray(row.answer)  ? (row.answer  as string[])[0] : (row.answer as string) ?? "";
        return {
          id:          row.id as string,
          text:        (row.question as string) ?? "",
          options:     opts,
          correct:     Math.max(0, opts.indexOf(ans)),
          explanation: (row.explanation as string) ?? "",
        };
      });
      setQuestions(mapped);
      setPhase("SETUP");
    });
  }, [userLoading, quizId]);

  const currentQ = questions[qIndex];

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (phase !== "PLAYING" || selected !== null || !currentQ) return;
    setSelected(optIdx);
    const correct    = optIdx === currentQ.correct;
    if (correct) setMyScore(s => s + 1);
    const aiCorrect  = Math.random() < AI_ACCURACY[difficulty];
    if (aiCorrect) setAiScore(s => s + 1);

    setTimeout(() => {
      setSelected(null);
      const next = qIndex + 1;
      if (next >= questions.length) {
        const finalMy = myScore + (correct ? 1 : 0);
        const finalAi = aiScore + (aiCorrect ? 1 : 0);
        setPhase(finalMy >= finalAi ? "WIN" : "LOSS");
      } else {
        setQIndex(next);
        setTimeLeft(15);
      }
    }, 900);
  }, [phase, selected, currentQ, qIndex, myScore, aiScore, difficulty, questions.length]);

  // ── LOADING / ERROR ────────────────────────────────────────────────────────
  if (phase === "LOADING") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          {fetchError ? (
            <>
              <div className="text-4xl mb-4">⚠️</div>
              <div className="text-base font-bold text-[#1A2035] mb-2">{fetchError}</div>
              <Link href="/student/play" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9] text-white rounded-xl text-sm font-bold">
                Back to Game Zone
              </Link>
            </>
          ) : (
            <>
              <Loader2 size={32} className="animate-spin text-[#0EA5E9] mx-auto mb-4" />
              <div className="text-sm text-[#7A869A]">Loading questions…</div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === "SETUP") {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]" /></Link>
          <div>
            <h1 className="text-xl font-bold text-[#1A2035]">🤖 VS AI</h1>
            <p className="text-sm text-[#7A869A]">{quizTitle}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#E8EDF5] text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-[#1A2035] mb-2">Challenge EduBot!</h2>
          <p className="text-sm text-[#7A869A] mb-6">
            {questions.length} questions · Beat AI to earn XP
          </p>
          <div className="mb-6">
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-3 block">Choose Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{ borderColor: difficulty === d ? "#0EA5E9" : "#E8EDF5", background: difficulty === d ? "#EFF6FF" : "white" }}>
                  <div className="text-2xl mb-1">{d === "EASY" ? "😊" : d === "MEDIUM" ? "😤" : "😈"}</div>
                  <div className="text-xs font-bold" style={{ color: difficulty === d ? "#0EA5E9" : "#1A2035" }}>{d}</div>
                  <div className="text-[10px] text-[#7A869A]">AI: {Math.round(AI_ACCURACY[d] * 100)}% accuracy</div>
                  <div className="text-[10px] font-bold text-[#FF6B35]">+{AI_XP[d]} XP</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setPhase("PLAYING"); setTimeLeft(15); }}
            className="w-full py-3 bg-[#0EA5E9] text-white rounded-xl font-bold text-base hover:bg-[#0284C7] transition-colors flex items-center justify-center gap-2">
            <Zap size={18} /> Start Battle
          </button>
        </div>
      </div>
    );
  }

  // ── WIN / LOSS ─────────────────────────────────────────────────────────────
  if (phase === "WIN" || phase === "LOSS") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn pt-8">
        <div className="text-6xl">{phase === "WIN" ? "🏆" : "🤖"}</div>
        <h1 className="text-3xl font-bold" style={{ color: phase === "WIN" ? "#10B981" : "#EF4444" }}>
          {phase === "WIN" ? "You Beat the AI!" : "AI Wins This Round!"}
        </h1>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <p className="text-xs text-[#7A869A] mb-4">{quizTitle}</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1A2035]">{myScore}</div>
              <div className="text-xs text-[#7A869A]">You</div>
            </div>
            <div className="text-2xl font-bold text-[#7A869A] flex items-center justify-center">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1A2035]">{aiScore}</div>
              <div className="text-xs text-[#7A869A]">EduBot ({difficulty})</div>
            </div>
          </div>
          {phase === "WIN" && <div className="mt-4 text-lg font-bold text-[#FF6B35]">+{AI_XP[difficulty]} XP earned!</div>}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setPhase("SETUP"); setQIndex(0); setMyScore(0); setAiScore(0); }}
            className="px-6 py-2.5 bg-[#0EA5E9] text-white rounded-xl font-bold hover:bg-[#0284C7] transition-colors">
            Play Again
          </button>
          <Link href="/student/play" className="px-6 py-2.5 border border-[#E8EDF5] rounded-xl font-medium text-[#7A869A]">
            Game Zone
          </Link>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  const timerPct = (timeLeft / 15) * 100;
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      {/* Scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#EFF6FF] rounded-2xl p-4 text-center border border-[#BFDBFE]">
          <div className="text-xs text-[#7A869A] mb-1">You</div>
          <div className="text-3xl font-bold text-[#0EA5E9]">{myScore}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center border border-[#E8EDF5]">
          <div className="text-xs text-[#7A869A] mb-1">Q{qIndex + 1}/{questions.length}</div>
          <div className="text-sm font-bold text-[#1A2035]">{difficulty}</div>
        </div>
        <div className="bg-[#F5F3FF] rounded-2xl p-4 text-center border border-[#DDD6FE]">
          <div className="text-xs text-[#7A869A] mb-1">EduBot</div>
          <div className="text-3xl font-bold text-[#8B5CF6]">{aiScore}</div>
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3">
        <Clock size={14} className="text-[#7A869A]" />
        <div className="flex-1 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-1000"
            style={{ width: `${timerPct}%`, background: timeLeft <= 4 ? "#EF4444" : "#0EA5E9" }} />
        </div>
        <span className="text-sm font-bold" style={{ color: timeLeft <= 4 ? "#EF4444" : "#1A2035" }}>{timeLeft}s</span>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-base font-bold text-[#1A2035] mb-5 text-center">{currentQ.text}</div>
        <div className="grid grid-cols-2 gap-3">
          {currentQ.options.map((opt, i) => {
            let bg = "white"; let border = "#E8EDF5"; let color = "#1A2035";
            if (selected !== null) {
              if (i === currentQ.correct)                        { bg = "#ECFDF5"; border = "#10B981"; color = "#166534"; }
              else if (i === selected && selected !== currentQ.correct) { bg = "#FEF2F2"; border = "#EF4444"; color = "#991B1B"; }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                className="p-4 rounded-xl border-2 text-sm font-medium text-left transition-all hover:border-[#0EA5E9] disabled:cursor-not-allowed"
                style={{ background: bg, borderColor: border, color }}>
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            );
          })}
        </div>
        {selected !== null && currentQ.explanation && (
          <div className="mt-4 p-3 bg-[#F0F4FA] rounded-xl text-xs text-[#7A869A]">💡 {currentQ.explanation}</div>
        )}
      </div>
    </div>
  );
}

export default function VsAiPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#0EA5E9]"/></div>}>
      <VsAiInner />
    </Suspense>
  );
}

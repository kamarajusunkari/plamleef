"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2, ChevronRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

function PracticeInner() {
  const searchParams = useSearchParams();
  const quizId       = searchParams.get("quizId")    ?? "";
  const quizTitle    = searchParams.get("quizTitle")  ?? "Practice Quiz";

  const [questions,  setQuestions]  = useState<Question[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [phase,      setPhase]      = useState<"intro"|"playing"|"results">("intro");
  const [qIndex,     setQIndex]     = useState(0);
  const [selected,   setSelected]   = useState<number | null>(null);
  const [showHint,   setShowHint]   = useState(false);
  const [answers,    setAnswers]     = useState<(number|null)[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let query = supabase.from("question").select("id, question, options, answer, explanation");
      if (quizId) query = query.eq("quiz_id", quizId);
      const { data, error } = await query.limit(20);
      if (error || !data?.length) {
        setFetchError(error?.message ?? "No questions available.");
        setLoading(false);
        return;
      }
      setQuestions(data.map((row: any) => {
        const opts = Array.isArray(row.options) ? row.options : [];
        const ans  = Array.isArray(row.answer)  ? row.answer[0]  : (row.answer ?? "");
        return {
          id:          row.id,
          text:        row.question ?? "",
          options:     opts,
          correct:     Math.max(0, opts.indexOf(ans)),
          explanation: row.explanation ?? "",
        };
      }));
      setLoading(false);
    }
    load();
  }, [quizId]);

  const q      = questions[qIndex];
  const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
  const score   = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  function handleAnswer(optIdx: number) {
    if (selected !== null) return;
    setSelected(optIdx);
    setShowHint(true);
    setAnswers(prev => { const n = [...prev]; n[qIndex] = optIdx; return n; });
  }

  function next() {
    if (qIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setQIndex(i => i + 1);
      setSelected(null);
      setShowHint(false);
    }
  }

  function restart() {
    setPhase("intro");
    setQIndex(0);
    setSelected(null);
    setShowHint(false);
    setAnswers([]);
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      {fetchError ? (
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-sm font-bold text-[#1A2035] mb-3">{fetchError}</p>
          <Link href="/student/play" className="px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-sm font-bold">Back to Game Zone</Link>
        </div>
      ) : (
        <Loader2 size={28} className="animate-spin text-[#F59E0B]"/>
      )}
    </div>
  );

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play" className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">🧘 Practice Mode</h1>
          <p className="text-sm text-[#7A869A]">{quizTitle}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-8 text-center space-y-5">
        <div className="text-6xl">🧘</div>
        <div>
          <h2 className="text-xl font-bold text-[#1A2035] mb-2">No Pressure Learning</h2>
          <p className="text-sm text-[#7A869A]">{questions.length} questions · no timer · full explanations after each answer</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "⏸️", label: "No Timer",     sub: "Go at your pace" },
            { icon: "💡", label: "Hints",         sub: "Shown after answer" },
            { icon: "📊", label: "Track Score",   sub: "See results at end" },
          ].map(f => (
            <div key={f.label} className="bg-[#FFFBEB] rounded-xl p-3 border border-[#FEF9C3]">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-[10px] font-bold text-[#854D0E]">{f.label}</div>
              <div className="text-[9px] text-[#92400E]">{f.sub}</div>
            </div>
          ))}
        </div>
        <button onClick={() => { setAnswers(Array(questions.length).fill(null)); setPhase("playing"); }}
          className="w-full py-3 rounded-xl bg-[#F59E0B] text-white text-sm font-bold hover:bg-[#D97706] transition-colors">
          Start Practice →
        </button>
      </div>
    </div>
  );

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (phase === "playing" && q) return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Link href="/student/play" className="p-1.5 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A] shrink-0"><ArrowLeft size={16}/></Link>
        <div className="flex-1 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}/>
        </div>
        <span className="text-xs font-bold text-[#7A869A] shrink-0">{qIndex + 1}/{questions.length}</span>
      </div>

      {/* Score bar */}
      <div className="flex gap-2">
        <div className="flex-1 bg-[#ECFDF5] rounded-xl p-2 text-center">
          <div className="text-lg font-black text-[#10B981]">{answers.filter((a, i) => a !== null && a === questions[i]?.correct).length}</div>
          <div className="text-[9px] text-[#10B981]">Correct</div>
        </div>
        <div className="flex-1 bg-[#FEF2F2] rounded-xl p-2 text-center">
          <div className="text-lg font-black text-[#EF4444]">{answers.filter((a, i) => a !== null && a !== questions[i]?.correct).length}</div>
          <div className="text-[9px] text-[#EF4444]">Wrong</div>
        </div>
        <div className="flex-1 bg-[#F8FAFC] rounded-xl p-2 text-center">
          <div className="text-lg font-black text-[#7A869A]">{answers.filter(a => a === null).length}</div>
          <div className="text-[9px] text-[#7A869A]">Left</div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-[#F59E0B] bg-[#FFFBEB] px-2 py-0.5 rounded-full">🧘 Practice</span>
          <span className="text-[10px] text-[#7A869A]">No timer · take your time</span>
        </div>
        <p className="text-base font-bold text-[#1A2035] leading-relaxed">{q.text}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt, i) => {
          const answered = selected !== null;
          const isCorrect = i === q.correct;
          const isChosen  = i === selected;
          let bg = "white"; let border = "#E8EDF5"; let color = "#1A2035";
          if (answered) {
            if (isCorrect)               { bg = "#ECFDF5"; border = "#10B981"; color = "#166534"; }
            else if (isChosen && !isCorrect) { bg = "#FEF2F2"; border = "#EF4444"; color = "#991B1B"; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
              className="w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all"
              style={{ background: bg, borderColor: border, color,
                       ...((!answered) ? { } : {}) }}
              onMouseEnter={e => { if (!answered) e.currentTarget.style.borderColor = "#F59E0B"; }}
              onMouseLeave={e => { if (!answered) e.currentTarget.style.borderColor = "#E8EDF5"; }}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{ background: answered && isCorrect ? "#ECFDF5" : answered && isChosen ? "#FEF2F2" : "#F0F4FA",
                           color:      answered && isCorrect ? "#10B981" : answered && isChosen ? "#EF4444"  : "#7A869A" }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && <CheckCircle size={16} className="text-[#10B981] shrink-0"/>}
                {answered && isChosen && !isCorrect && <XCircle size={16} className="text-[#EF4444] shrink-0"/>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation + Next */}
      {showHint && (
        <div className="space-y-3">
          {q.explanation && (
            <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FEF9C3]">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-[#F59E0B]"/>
                <span className="text-xs font-bold text-[#854D0E]">Explanation</span>
              </div>
              <p className="text-sm text-[#92400E] leading-relaxed">{q.explanation}</p>
            </div>
          )}
          <button onClick={next}
            className="w-full py-3 rounded-xl bg-[#F59E0B] text-white text-sm font-bold hover:bg-[#D97706] transition-colors flex items-center justify-center gap-2">
            {qIndex + 1 >= questions.length ? "See Results" : "Next Question"}
            <ChevronRight size={16}/>
          </button>
        </div>
      )}
    </div>
  );

  // ── RESULTS ────────────────────────────────────────────────────────────────
  const grade = score >= 90 ? "🌟 Excellent!" : score >= 70 ? "👏 Well done!" : score >= 50 ? "💪 Good effort!" : "📚 Keep practicing!";
  return (
    <div className="max-w-lg mx-auto space-y-6 text-center animate-fadeIn pt-6">
      <div className="text-6xl">{score >= 70 ? "🏆" : "📚"}</div>
      <h1 className="text-2xl font-black text-[#1A2035]">{grade}</h1>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <p className="text-xs text-[#7A869A]">{quizTitle}</p>
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#F0F4FA" strokeWidth="10"/>
            <circle cx="64" cy="64" r="54" fill="none"
              stroke={score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444"}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - score / 100)}`}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#1A2035]">{score}%</span>
            <span className="text-[10px] text-[#7A869A]">{correct}/{questions.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#ECFDF5] rounded-xl p-3">
            <div className="text-xl font-black text-[#10B981]">{correct}</div>
            <div className="text-[10px] text-[#10B981]">Correct</div>
          </div>
          <div className="bg-[#FEF2F2] rounded-xl p-3">
            <div className="text-xl font-black text-[#EF4444]">{questions.length - correct}</div>
            <div className="text-[10px] text-[#EF4444]">Wrong</div>
          </div>
          <div className="bg-[#FFFBEB] rounded-xl p-3">
            <div className="text-xl font-black text-[#F59E0B]">+{Math.round(score * 0.2)}</div>
            <div className="text-[10px] text-[#F59E0B]">XP</div>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={restart}
          className="flex-1 py-3 rounded-xl bg-[#F59E0B] text-white text-sm font-bold hover:bg-[#D97706] transition-colors">
          Practice Again
        </button>
        <Link href="/student/play"
          className="flex-1 py-3 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-bold hover:bg-[#E8EDF5] transition-colors text-center">
          Game Zone
        </Link>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#F59E0B]"/></div>}>
      <PracticeInner />
    </Suspense>
  );
}

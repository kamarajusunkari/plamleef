"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ChevronLeft, Plus, Trash2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Question {
  id: string; question: string; options: string[];
  answer: string[]; explanation: string | null;
}
interface Player { name: string; score: number; answers: number[] }

const PLAYER_COLORS = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6"];

function PassPlayInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const quizId       = searchParams.get("quizId") ?? "";
  const quizTitle    = searchParams.get("quizTitle") ?? "Quiz";

  const [phase,      setPhase]     = useState<"setup"|"playing"|"results">("setup");
  const [players,    setPlayers]   = useState<Player[]>([{ name: "Player 1", score: 0, answers: [] }, { name: "Player 2", score: 0, answers: [] }]);
  const [questions,  setQuestions] = useState<Question[]>([]);
  const [currentQ,   setCurrentQ]  = useState(0);
  const [currentP,   setCurrentP]  = useState(0);   // whose turn
  const [selected,   setSelected]  = useState<number | null>(null);
  const [showAns,    setShowAns]   = useState(false);
  const [loading,    setLoading]   = useState(false);

  async function startGame() {
    if (players.some(p => !p.name.trim())) { return; }
    setLoading(true);
    const { data } = await createClient()
      .from("question")
      .select("id, question, options, answer, explanation")
      .eq("quiz_id", quizId)
      .limit(20);
    setQuestions((data ?? []) as Question[]);
    setLoading(false);
    if (!data?.length) { return; }
    setPhase("playing");
  }

  function handleAnswer(optIdx: number) {
    if (selected !== null) return;
    setSelected(optIdx);
    setShowAns(true);

    const q        = questions[currentQ];
    const opts     = q.options as string[];
    const correct  = opts.indexOf(q.correct_answer);
    const isRight  = optIdx === correct;

    setPlayers(prev => prev.map((p, i) =>
      i === currentP
        ? { ...p, score: p.score + (isRight ? 10 : 0), answers: [...p.answers, optIdx] }
        : p
    ));
  }

  function nextTurn() {
    const nextQ = currentQ + 1;
    const nextP = (currentP + 1) % players.length;
    setSelected(null);
    setShowAns(false);
    if (nextQ >= questions.length * players.length / players.length) {
      setPhase("results");
    } else {
      setCurrentQ(Math.floor(nextQ / players.length));
      if (nextQ >= questions.length) { setPhase("results"); return; }
      setCurrentQ(nextQ % questions.length === 0 ? questions.length : nextQ);
      // simpler: track round
      setCurrentQ(prev => {
        const next = prev + (nextP === 0 ? 1 : 0);
        if (next >= questions.length) { setTimeout(() => setPhase("results"), 0); return prev; }
        return next;
      });
      setCurrentP(nextP);
    }
  }

  // cleaner turn tracking
  const [round, setRound] = useState(0); // global turn count (0-indexed)
  function handleAnswerV2(optIdx: number) {
    if (selected !== null) return;
    setSelected(optIdx);
    setShowAns(true);
    const q    = questions[round % questions.length];
    const opts = (q?.options ?? []) as string[];
    const ansArr = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
    const correct = opts.indexOf(ansArr[0] ?? "");
    const isRight = optIdx === correct;
    const pIdx = round % players.length;
    setPlayers(prev => prev.map((p, i) =>
      i === pIdx ? { ...p, score: p.score + (isRight ? 10 : 0), answers: [...p.answers, optIdx] } : p
    ));
  }
  function nextTurnV2() {
    const nextRound = round + 1;
    setSelected(null);
    setShowAns(false);
    if (nextRound >= questions.length * players.length) {
      setPhase("results");
    } else {
      setRound(nextRound);
    }
  }

  const activeRound = round % questions.length;
  const activePlayer = round % players.length;
  const q    = questions[activeRound];
  const opts = (q?.options ?? []) as string[];
  const qAns = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
  const correctIdx = opts.indexOf(qAns[0] ?? "");

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ChevronLeft size={18}/></button>
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">📱 Pass & Play</h1>
          <p className="text-sm text-[#7A869A]">{quizTitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <div className="text-sm font-bold text-[#1A2035]">Players (2–4)</div>
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PLAYER_COLORS[i] }}/>
            <input value={p.name} onChange={e => setPlayers(prev => prev.map((pl, j) => j === i ? { ...pl, name: e.target.value } : pl))}
              placeholder={`Player ${i + 1} name`}
              className="flex-1 h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
            {i >= 2 && (
              <button onClick={() => setPlayers(prev => prev.filter((_, j) => j !== i))} className="text-[#EF4444] hover:bg-[#FEF2F2] p-2 rounded-xl">
                <Trash2 size={14}/>
              </button>
            )}
          </div>
        ))}
        {players.length < 4 && (
          <button onClick={() => setPlayers(prev => [...prev, { name: `Player ${prev.length + 1}`, score: 0, answers: [] }])}
            className="w-full py-2 rounded-xl border-2 border-dashed border-[#E8EDF5] text-[#7A869A] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <Plus size={14}/> Add Player
          </button>
        )}
      </div>

      <button onClick={startGame} disabled={loading}
        className="w-full py-3 rounded-xl bg-[#3B82F6] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={14} className="animate-spin"/> : "🚀"}
        Start Game
      </button>
    </div>
  );

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === "playing" && q) {
    const player = players[activePlayer];
    const color  = PLAYER_COLORS[activePlayer];
    return (
      <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
        {/* Current player indicator */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl text-white" style={{ background: color }}>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">{activePlayer + 1}</div>
          <div className="flex-1">
            <div className="font-bold text-sm">{player.name}'s Turn</div>
            <div className="text-white/70 text-[10px]">Score: {player.score}</div>
          </div>
          <div className="text-xs font-semibold text-white/70">Q {activeRound + 1}/{questions.length}</div>
        </div>

        {/* Mini scores */}
        <div className="flex gap-2">
          {players.map((p, i) => (
            <div key={i} className={`flex-1 rounded-xl p-2 text-center border-2 transition-all ${i === activePlayer ? "border-[#FF6B35] bg-[#FFF7F4]" : "border-[#E8EDF5] bg-white"}`}>
              <div className="text-[10px] text-[#7A869A] truncate">{p.name}</div>
              <div className="text-sm font-black text-[#1A2035]">{p.score}</div>
            </div>
          ))}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6">
          <p className="text-base font-bold text-[#1A2035] leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {opts.map((opt, i) => {
            const answered = selected !== null;
            const isCorrect = i === correctIdx;
            const isChosen  = i === selected;
            let cls = "bg-white border-[#E8EDF5]";
            if (answered && isCorrect) cls = "bg-[#ECFDF5] border-[#10B981]";
            else if (answered && isChosen && !isCorrect) cls = "bg-[#FEF2F2] border-[#EF4444]";
            return (
              <button key={i} disabled={answered} onClick={() => handleAnswerV2(i)}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${cls} ${!answered ? "hover:border-[#FF6B35] hover:bg-[#FFF7F4]" : ""}`}>
                <span className="font-black text-[#7A869A] mr-3">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            );
          })}
        </div>

        {/* Explanation + Next */}
        {showAns && (
          <div className="space-y-3">
            {q.explanation && (
              <div className="bg-[#EFF6FF] rounded-xl p-3 text-xs text-[#3B82F6]">
                💡 {q.explanation}
              </div>
            )}
            <button onClick={nextTurnV2}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-colors"
              style={{ background: PLAYER_COLORS[(activePlayer + 1) % players.length] }}>
              Pass to {players[(activePlayer + 1) % players.length]?.name} →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (phase === "results") {
    const sorted = [...players].map((p, i) => ({ ...p, original: i })).sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];
    return (
      <div className="max-w-md mx-auto space-y-6 text-center animate-fadeIn">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-black text-[#1A2035]">{sorted[0].name} Wins!</h1>
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-3">
          {sorted.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-2xl">{medals[i]}</div>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PLAYER_COLORS[p.original] }}/>
              <div className="flex-1 text-left text-sm font-bold text-[#1A2035]">{p.name}</div>
              <div className="text-xl font-black text-[#FF6B35]">{p.score}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/student/play")}
            className="flex-1 py-3 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-bold">
            Back
          </button>
          <button onClick={() => { setPhase("setup"); setRound(0); setPlayers(players.map(p => ({...p, score:0, answers:[]}))); }}
            className="flex-1 py-3 rounded-xl bg-[#3B82F6] text-white text-sm font-bold">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>;
}

export default function PassAndPlayPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>}>
      <PassPlayInner/>
    </Suspense>
  );
}

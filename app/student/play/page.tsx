"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ChevronRight, ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { GAMES, MODES, getGameRoute, getModesForGame } from "@/lib/games";

interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  count: number;
  quiz_scope: string;
  allowed_game_modes: string[];
  subject_name: string;
}

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};

type HubStep = "games" | "quiz" | "mode";

export default function GameZonePage() {
  const router   = useRouter();
  const { user } = useCurrentUser();

  const [step,         setStep]         = useState<HubStep>("games");
  const [activeGame,   setActiveGame]   = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  const [quizzes,  setQuizzes]  = useState<Quiz[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    if (!activeGame) return;
    setLoading(true);
    setSearch("");
    setSelectedQuiz(null);

    createClient()
      .from("quiz")
      .select("id, title, topic, difficulty, count, quiz_scope, allowed_game_modes, subjects!quiz_subject_id_fkey(name)")
      .eq("is_gamezone_eligible", true)
      .contains("allowed_game_modes", [activeGame])
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setQuizzes(((data ?? []) as any[]).map(q => ({
          ...q,
          subject_name: (q.subjects as any)?.name ?? "General",
          allowed_game_modes: Array.isArray(q.allowed_game_modes) ? q.allowed_game_modes : [],
        })));
        setLoading(false);
      });
  }, [activeGame]);

  const game     = GAMES.find(g => g.key === activeGame);
  const modes    = activeGame ? getModesForGame(activeGame) : [];
  const filtered = quizzes.filter(q =>
    !search ||
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.topic.toLowerCase().includes(search.toLowerCase()) ||
    q.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  function selectGame(key: string) {
    setActiveGame(key);
    setStep("quiz");
  }

  function selectQuiz(quiz: Quiz) {
    setSelectedQuiz(quiz);
    const gameModes = getModesForGame(activeGame!);
    if (gameModes.length === 1) {
      router.push(getGameRoute(activeGame!, gameModes[0].key, quiz.id, quiz.title));
    } else {
      setStep("mode");
    }
  }

  function startGame(modeKey: string) {
    if (!selectedQuiz || !activeGame) return;
    router.push(getGameRoute(activeGame, modeKey, selectedQuiz.id, selectedQuiz.title));
  }

  function goBack() {
    if (step === "mode") { setStep("quiz"); setSelectedQuiz(null); }
    else if (step === "quiz") { setStep("games"); setActiveGame(null); }
  }

  // ── STEP 1: Game cards ─────────────────────────────────────────────────────
  if (step === "games") return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-[#1A2035]">🎮 Game Zone</h1>
        <p className="text-sm text-[#7A869A] mt-1">Pick a game · choose a quiz · select your mode</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAMES.map(g => (
          <button key={g.key} onClick={() => selectGame(g.key)}
            className="group text-left rounded-3xl border-2 border-[#E8EDF5] p-6 bg-white transition-all duration-200"
            onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; e.currentTarget.style.boxShadow = `0 8px 40px ${g.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EDF5"; e.currentTarget.style.boxShadow = "none"; }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform"
              style={{ background: g.bgLight }}>
              {g.emoji}
            </div>
            <h2 className="text-base font-black text-[#1A2035] mb-1">{g.label}</h2>
            <p className="text-xs text-[#7A869A] mb-4">{g.desc}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {g.modes.map(mKey => {
                const m = MODES.find(x => x.key === mKey);
                return m ? (
                  <span key={mKey} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: g.bgLight, color: g.color }}>
                    {m.emoji} {m.label}
                  </span>
                ) : null;
              })}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold" style={{ color: g.color }}>
              Play now <ChevronRight size={14}/>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/student/quiz-library"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-semibold hover:bg-[#E8EDF5] transition-colors">
          <BookOpen size={14}/> Quiz Library
        </Link>
        <Link href="/student/play/tournaments"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FEF2F2] text-[#EF4444] text-sm font-semibold hover:bg-[#FEE2E2] transition-colors">
          🏆 Tournaments
        </Link>
      </div>
    </div>
  );

  // ── STEP 2: Quiz picker ────────────────────────────────────────────────────
  if (step === "quiz" && game) return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ArrowLeft size={18}/></button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: game.bgLight }}>{game.emoji}</div>
          <div>
            <h1 className="text-lg font-black text-[#1A2035]">{game.label}</h1>
            <p className="text-xs text-[#7A869A]">Pick a quiz to play</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {modes.map(m => (
          <span key={m.key} className="text-xs font-semibold px-3 py-1 rounded-full border"
            style={{ borderColor: game.color + "44", background: game.bgLight, color: game.color }}>
            {m.emoji} {m.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quizzes…"
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none"
          onFocus={e => (e.currentTarget.style.borderColor = game.color)}
          onBlur={e => (e.currentTarget.style.borderColor = "#E8EDF5")}/>
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A]"><X size={14}/></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: game.color }}/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <div className="text-4xl mb-3">{game.emoji}</div>
          <p className="text-sm font-semibold text-[#1A2035]">No quizzes available for {game.label}</p>
          <p className="text-xs text-[#7A869A] mt-1">Check back soon or try another game</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(quiz => {
            const diff = DIFF_STYLE[quiz.difficulty] ?? DIFF_STYLE.MEDIUM;
            return (
              <button key={quiz.id} onClick={() => selectQuiz(quiz)}
                className="text-left bg-white rounded-2xl border-2 border-[#E8EDF5] p-5 hover:shadow-md transition-all"
                onMouseEnter={e => (e.currentTarget.style.borderColor = game.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#E8EDF5")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>{quiz.difficulty}</span>
                      {quiz.quiz_scope === "EDUBATTLE" && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">EduBattle</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[#1A2035] line-clamp-2">{quiz.title}</p>
                    <p className="text-[10px] text-[#7A869A] mt-0.5">{quiz.subject_name} · {quiz.topic}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#CBD5E1] shrink-0 mt-1"/>
                </div>
                <div className="text-[10px] text-[#7A869A]">
                  <BookOpen size={10} className="inline mr-1"/>{quiz.count} questions
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── STEP 3: Mode picker ────────────────────────────────────────────────────
  if (step === "mode" && game && selectedQuiz) return (
    <div className="max-w-sm mx-auto space-y-6 animate-fadeIn pt-4">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ArrowLeft size={18}/></button>
        <div>
          <h1 className="text-lg font-black text-[#1A2035]">{game.emoji} {game.label}</h1>
          <p className="text-xs text-[#7A869A] line-clamp-1">{selectedQuiz.title}</p>
        </div>
      </div>

      <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider">How do you want to play?</p>

      <div className="space-y-3">
        {modes.map(mode => (
          <button key={mode.key} onClick={() => startGame(mode.key)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E8EDF5] bg-white transition-all text-left"
            onMouseEnter={e => { e.currentTarget.style.borderColor = game.color; e.currentTarget.style.background = game.bgLight; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EDF5"; e.currentTarget.style.background = "white"; }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: game.bgLight }}>
              {mode.emoji}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#1A2035]">{mode.label}</div>
              <div className="text-xs text-[#7A869A]">{mode.desc}</div>
            </div>
            <ChevronRight size={16} className="text-[#CBD5E1] shrink-0"/>
          </button>
        ))}
      </div>
    </div>
  );

  return null;
}

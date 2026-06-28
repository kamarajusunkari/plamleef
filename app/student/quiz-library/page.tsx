"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Loader2, X, ChevronRight, ArrowLeft } from "lucide-react";
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
  is_gamezone_eligible: boolean;
  allowed_game_modes: string[];
  subject_name: string;
}

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};

export default function StudentQuizLibraryPage() {
  const { user }   = useCurrentUser();
  const router     = useRouter();
  const [tab,      setTab]      = useState<"EDUBATTLE" | "SCHOOL">("EDUBATTLE");
  const [list,     setList]     = useState<Quiz[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  // Modal state
  const [selected,      setSelected]      = useState<Quiz | null>(null);
  const [step,          setStep]          = useState<"mode-type" | "game" | "mode">("mode-type");
  const [selectedGame,  setSelectedGame]  = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("quiz")
        .select("id, title, topic, difficulty, count, quiz_scope, is_gamezone_eligible, allowed_game_modes, subjects!quiz_subject_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (tab === "EDUBATTLE") {
        query = query.eq("quiz_scope", "EDUBATTLE");
      } else {
        query = query.eq("quiz_scope", "SCHOOL");
        if (user?.schoolId) query = query.eq("school_id", user.schoolId);
      }

      const { data } = await query.limit(60);
      setList(((data ?? []) as any[]).map(q => ({
        ...q,
        subject_name: (q.subjects as any)?.name ?? "General",
        allowed_game_modes: Array.isArray(q.allowed_game_modes) ? q.allowed_game_modes : [],
      })));
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.schoolId]);

  const filtered = list.filter(q =>
    !search ||
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.topic.toLowerCase().includes(search.toLowerCase()) ||
    q.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  function openQuiz(quiz: Quiz) {
    setSelected(quiz);
    setStep("mode-type");
    setSelectedGame(null);
  }

  function closeModal() {
    setSelected(null);
    setStep("mode-type");
    setSelectedGame(null);
  }

  function startNormalQuiz() {
    if (!selected) return;
    router.push(`/student/quiz?quizId=${selected.id}&title=${encodeURIComponent(selected.title)}&subject=${encodeURIComponent(selected.subject_name)}&xp=50&questions=${selected.count}&time=30`);
    closeModal();
  }

  function handleGameSelect(gameKey: string) {
    const game = GAMES.find(g => g.key === gameKey);
    if (!game) return;
    setSelectedGame(gameKey);
    // If game only has one mode, skip mode picker and go directly
    if (game.modes.length === 1) {
      handleStartGame(gameKey, game.modes[0]);
    } else {
      setStep("mode");
    }
  }

  function handleStartGame(gameKey: string, modeKey: string) {
    if (!selected) return;
    const route = getGameRoute(gameKey, modeKey, selected.id, selected.title);
    router.push(route);
    closeModal();
  }

  // Games available for this quiz (filtered by allowed_game_modes)
  const availableGames = selected
    ? GAMES.filter(g =>
        !selected.is_gamezone_eligible
          ? false
          : selected.allowed_game_modes.length === 0 || selected.allowed_game_modes.includes(g.key)
      )
    : [];

  const availableModes = selectedGame ? getModesForGame(selectedGame) : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">📚 Quiz Library</h1>
        <p className="text-sm text-[#7A869A]">Browse quizzes — study normally or launch a game</p>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl w-fit">
        {([
          { key: "EDUBATTLE", label: "🌐 EduBattle" },
          { key: "SCHOOL",    label: "🏫 School" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === t.key ? "white" : "transparent", color: tab === t.key ? "#1A2035" : "#7A869A", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab === "EDUBATTLE" ? "EduBattle" : "school"} quizzes…`}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A]"><X size={14}/></button>}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <BookOpen size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No quizzes found</p>
          <p className="text-xs text-[#7A869A] mt-1">{tab === "SCHOOL" ? "Your teacher hasn't added quizzes yet" : "Check back soon!"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(quiz => {
            const diff = DIFF_STYLE[quiz.difficulty] ?? DIFF_STYLE.MEDIUM;
            return (
              <button key={quiz.id} onClick={() => openQuiz(quiz)}
                className="text-left bg-white rounded-2xl border border-[#E8EDF5] p-5 hover:shadow-md hover:border-[#FFD4C2] transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {tab === "EDUBATTLE" && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">EduBattle</span>
                      )}
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>{quiz.difficulty}</span>
                      {quiz.is_gamezone_eligible && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">🎮 Game Ready</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[#1A2035] line-clamp-2">{quiz.title}</p>
                    <p className="text-[10px] text-[#7A869A] mt-0.5">{quiz.subject_name} · {quiz.topic}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#CBD5E1] shrink-0 mt-1 group-hover:text-[#FF6B35] transition-colors"/>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#7A869A]">
                  <span><BookOpen size={10} className="inline"/> {quiz.count} questions</span>
                  {quiz.is_gamezone_eligible && quiz.allowed_game_modes.length > 0 && (
                    <span>{quiz.allowed_game_modes.length} game{quiz.allowed_game_modes.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Quiz info header */}
            <div className="p-5 border-b border-[#E8EDF5]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {step !== "mode-type" && (
                    <button onClick={() => step === "mode" ? setStep("game") : setStep("mode-type")}
                      className="text-[#7A869A] hover:text-[#1A2035] p-1 rounded-lg hover:bg-[#F0F4FA] shrink-0">
                      <ArrowLeft size={16}/>
                    </button>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-0.5">{selected.subject_name}</p>
                    <p className="text-sm font-bold text-[#1A2035]">{selected.title}</p>
                    <p className="text-xs text-[#7A869A]">{selected.count} questions · {selected.difficulty}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-[#7A869A] hover:text-[#1A2035] p-1 rounded-lg hover:bg-[#F0F4FA] shrink-0">
                  <X size={18}/>
                </button>
              </div>

              {/* Step breadcrumb */}
              <div className="flex items-center gap-1.5 mt-3">
                {[
                  { key: "mode-type", label: "Play Type" },
                  ...(step === "game" || step === "mode" ? [{ key: "game", label: "Game" }] : []),
                  ...(step === "mode" ? [{ key: "mode", label: "Mode" }] : []),
                ].map((s, i, arr) => (
                  <React.Fragment key={s.key}>
                    <span className={`text-[10px] font-bold ${s.key === step ? "text-[#FF6B35]" : "text-[#CBD5E1]"}`}>{s.label}</span>
                    {i < arr.length - 1 && <span className="text-[#CBD5E1] text-[10px]">›</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── Step 1: Normal vs Gamified ── */}
            {step === "mode-type" && (
              <div className="p-5 space-y-3">
                <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider">How do you want to play?</p>

                <button onClick={startNormalQuiz}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E8EDF5] hover:border-[#FF6B35] hover:bg-[#FFF7F4] transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF7F4] flex items-center justify-center text-2xl shrink-0">📋</div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-[#1A2035]">Normal Quiz</div>
                    <div className="text-xs text-[#7A869A]">Study mode — answer, review, save score</div>
                  </div>
                  <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#FF6B35]"/>
                </button>

                {selected.is_gamezone_eligible ? (
                  <button onClick={() => setStep("game")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E8EDF5] hover:border-[#10B981] hover:bg-[#F0FDF4] transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-2xl shrink-0">🎮</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-[#1A2035]">Gamified Quiz</div>
                      <div className="text-xs text-[#7A869A]">Pick a game — compete, earn XP, win</div>
                    </div>
                    <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#10B981]"/>
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-[#E8EDF5] opacity-50 cursor-not-allowed">
                    <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-2xl shrink-0">🎮</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-[#1A2035]">Gamified Quiz</div>
                      <div className="text-xs text-[#7A869A]">Not enabled for this quiz</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Pick a Game ── */}
            {step === "game" && (
              <div className="p-5">
                <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider mb-3">Pick a Game</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {availableGames.map(game => (
                    <button key={game.key} onClick={() => handleGameSelect(game.key)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-[#E8EDF5] hover:shadow-md transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.borderColor = game.color)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#E8EDF5")}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: game.bgLight }}>
                        {game.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1A2035]">{game.label}</div>
                        <div className="text-[10px] text-[#7A869A]">{game.desc}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {game.modes.map(m => {
                          const md = MODES.find(x => x.key === m);
                          return md ? (
                            <span key={m} className="text-base" title={md.label}>{md.emoji}</span>
                          ) : null;
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Pick a Mode ── */}
            {step === "mode" && selectedGame && (
              <div className="p-5">
                {(() => {
                  const game = GAMES.find(g => g.key === selectedGame)!;
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{game.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider">How to play {game.label}?</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {availableModes.map(mode => (
                          <button key={mode.key} onClick={() => handleStartGame(selectedGame, mode.key)}
                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-[#E8EDF5] hover:shadow-md transition-all text-left"
                            onMouseEnter={e => (e.currentTarget.style.borderColor = game.color)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = "#E8EDF5")}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ background: game.bgLight }}>
                              {mode.emoji}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-bold text-[#1A2035]">{mode.label}</div>
                              <div className="text-[10px] text-[#7A869A]">{mode.desc}</div>
                            </div>
                            <ChevronRight size={16} className="text-[#CBD5E1] shrink-0"/>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

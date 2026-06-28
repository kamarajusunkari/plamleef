"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Zap, Loader2, Copy, Check, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/* ─── Shared types ─────────────────────────────────────────────────── */
interface Question { id: string; text: string; options: string[]; correct: number; explanation: string }
interface LivePlayer { id: string; name: string; initials: string; color: string; liveScore: number; isMe: boolean }

const PLAYER_COLORS = ["#EC4899","#3B82F6","#FF6B35","#8B5CF6","#0EA5E9","#F59E0B","#10B981","#6366F1"];
const AI_ACCURACY:  Record<string, number> = { EASY: 0.50, MEDIUM: 0.70, HARD: 0.88 };
const AI_XP:        Record<string, number> = { EASY: 30,   MEDIUM: 60,   HARD: 80  };

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/* ─── Question fetcher ──────────────────────────────────────────────── */
async function fetchQuestions(quizId: string): Promise<Question[]> {
  const supabase = createClient();
  let q = supabase.from("question").select("id, question, options, answer, explanation");
  if (quizId) q = q.eq("quiz_id", quizId);
  const { data } = await q.limit(15);
  return (data ?? []).map((row: any) => {
    const opts = Array.isArray(row.options) ? row.options as string[] : [];
    const ans  = Array.isArray(row.answer)  ? row.answer[0] as string : (row.answer as string) ?? "";
    return { id: row.id, text: row.question ?? "", options: opts, correct: Math.max(0, opts.indexOf(ans)), explanation: row.explanation ?? "" };
  });
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: SOLO — class race with simulated classmates
   ══════════════════════════════════════════════════════════════════════ */
function SoloMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const { user, loading: userLoading } = useCurrentUser();
  type Phase = "LOADING"|"LOBBY"|"PLAYING"|"RESULTS";
  const [phase,      setPhase]      = useState<Phase>("LOADING");
  const [questions,  setQuestions]  = useState<Question[]>([]);
  const [players,    setPlayers]    = useState<LivePlayer[]>([]);
  const [lobbyTimer, setLobbyTimer] = useState(15);
  const [qIndex,     setQIndex]     = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(90);
  const [myScore,    setMyScore]    = useState(0);
  const [selected,   setSelected]   = useState<number|null>(null);
  const [fetchError, setFetchError] = useState<string|null>(null);

  useEffect(() => {
    if (userLoading) return;
    (async () => {
      const qs = await fetchQuestions(quizId);
      if (!qs.length) { setFetchError("No questions available."); return; }
      setQuestions(qs);
      let lp: LivePlayer[] = [];
      if (user?.classId) {
        const { data: records } = await createClient().from("student_records")
          .select("id, student_id, students(id, users(name))").eq("class_id", user.classId).limit(6);
        if (records?.length) {
          lp = (records as any[]).map((rec, idx) => {
            const nm = (rec.students?.users?.name as string) ?? "Student";
            const isMe = rec.student_id === user.studentId;
            return { id: rec.id, name: isMe ? (user.name ?? nm) : nm, initials: isMe ? (user.initials ?? getInitials(nm)) : getInitials(nm), color: PLAYER_COLORS[idx % PLAYER_COLORS.length], liveScore: 0, isMe };
          });
        }
      }
      if (!lp.length) lp = [{ id: "me", name: user?.name ?? "You", initials: user?.initials ?? "ME", color: PLAYER_COLORS[0], liveScore: 0, isMe: true }];
      else if (!lp.some(p => p.isMe)) lp.unshift({ id: "me", name: user?.name ?? "You", initials: user?.initials ?? "ME", color: PLAYER_COLORS[0], liveScore: 0, isMe: true });
      setPlayers(lp);
      setPhase("LOBBY");
    })();
  }, [userLoading, quizId, user?.classId, user?.studentId, user?.name, user?.initials, user?.studentRecordId]);

  useEffect(() => {
    if (phase !== "LOBBY") return;
    const t = setInterval(() => setLobbyTimer(l => { if (l <= 1) { clearInterval(t); setPhase("PLAYING"); setTimeLeft(90); return 0; } return l-1; }), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0 || qIndex >= questions.length) { setPhase("RESULTS"); return; }
    const t = setTimeout(() => setTimeLeft(t => t-1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, qIndex, questions.length]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    const t = setInterval(() => setPlayers(prev => prev.map(p => p.isMe ? p : { ...p, liveScore: Math.min(p.liveScore + (Math.random() > 0.4 ? 1 : 0), questions.length) })), 1500);
    return () => clearInterval(t);
  }, [phase, questions.length]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (selected !== null || phase !== "PLAYING" || !questions.length) return;
    setSelected(optIdx);
    if (optIdx === questions[qIndex].correct) {
      setMyScore(s => { const n = s+1; setPlayers(prev => prev.map(p => p.isMe ? { ...p, liveScore: n } : p)); return n; });
      toast.success("+1", { duration: 400 });
    }
    setTimeout(() => { setSelected(null); setQIndex(q => q+1); }, 500);
  }, [selected, phase, qIndex, questions]);

  const sorted = [...players].sort((a,b) => b.liveScore - a.liveScore);

  if (phase === "LOADING") return (
    <div className="flex items-center justify-center h-[60vh]">
      {fetchError ? (
        <div className="text-center"><div className="text-4xl mb-4">⚠️</div><p className="font-bold text-[#1A2035] mb-4">{fetchError}</p>
          <Link href="/student/play" className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold">Back</Link></div>
      ) : <Loader2 size={32} className="animate-spin text-[#8B5CF6]"/>}
    </div>
  );

  if (phase === "LOBBY") return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">⚡ Speed Blitz · Solo</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl p-8 border border-[#E8EDF5] text-center">
        <div className="text-5xl mb-4">⚡</div>
        <h2 className="text-xl font-bold text-[#1A2035] mb-2">Class Battle Lobby</h2>
        <p className="text-sm text-[#7A869A] mb-2">{questions.length} questions · 90 seconds · Answer fast!</p>
        <div className="text-5xl font-bold text-[#8B5CF6] mb-2">{lobbyTimer}s</div>
        <div className="text-sm text-[#7A869A] mb-6">Game starts automatically</div>
        <div className="space-y-2">
          {players.slice(0,5).map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] rounded-xl">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: p.color }}>{p.initials}</div>
              <div className="text-sm font-medium text-[#1A2035]">{p.name}{p.isMe && " (You)"}</div>
              <div className="ml-auto w-2 h-2 rounded-full bg-[#10B981]"/>
            </div>
          ))}
        </div>
        <button onClick={() => { setPhase("PLAYING"); setTimeLeft(90); }} className="mt-6 w-full py-3 bg-[#8B5CF6] text-white rounded-xl font-bold hover:bg-[#7C3AED] transition-colors">Start Now</button>
      </div>
    </div>
  );

  if (phase === "RESULTS") {
    const myRank = sorted.findIndex(p => p.isMe) + 1;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn pt-8">
        <div className="text-6xl">{myRank <= 3 ? "🏆" : "⚡"}</div>
        <h1 className="text-3xl font-bold text-[#1A2035]">{myRank === 1 ? "You Won!" : `Rank #${myRank}`}</h1>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <p className="text-xs text-[#7A869A] mb-3">{quizTitle}</p>
          <div className="text-4xl font-bold text-[#8B5CF6] mb-1">{myScore}</div>
          <div className="text-sm text-[#7A869A]">correct answers</div>
          <div className="text-lg font-bold text-[#FF6B35] mt-3">+{myRank <= 3 ? 60 : 30} XP earned!</div>
          <div className="mt-4 space-y-2">
            {sorted.map((p,i) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[#F0F4FA] last:border-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: i===0?"#FFB347":i===1?"#94A3B8":i===2?"#CD7F32":"#F0F4FA", color: i<3?"white":"#7A869A" }}>{i+1}</div>
                <div className="text-xs font-medium text-[#1A2035]">{p.name}{p.isMe && " (You)"}</div>
                <div className="ml-auto text-xs font-bold text-[#8B5CF6]">{p.liveScore} correct</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setPhase("LOBBY"); setLobbyTimer(15); setMyScore(0); setQIndex(0); setPlayers(p => p.map(pl => ({...pl,liveScore:0}))); }}
            className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl font-bold">Play Again</button>
          <Link href="/student/play" className="px-6 py-2.5 border border-[#E8EDF5] rounded-xl font-medium text-[#7A869A]">Game Zone</Link>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIndex] ?? questions[questions.length-1];
  return (
    <div className="flex gap-6 animate-fadeIn">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#1A2035]">Q{qIndex+1}/{questions.length}</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
              <div className="h-full bg-[#8B5CF6] rounded-full transition-[width] duration-1000" style={{ width:`${(timeLeft/90)*100}%` }}/>
            </div>
            <span className="text-sm font-bold text-[#8B5CF6]">{timeLeft}s</span>
          </div>
          <div className="text-sm font-bold text-[#FF6B35]">Score: {myScore}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="text-base font-bold text-[#1A2035] mb-5 text-center">{currentQ.text}</div>
          <div className="grid grid-cols-2 gap-3">
            {currentQ.options.map((opt,i) => {
              let bg="#fff",border="#E8EDF5",color="#1A2035";
              if (selected !== null) {
                if (i === currentQ.correct) { bg="#ECFDF5"; border="#10B981"; color="#166634"; }
                else if (i === selected)    { bg="#FEF2F2"; border="#EF4444"; color="#991B1B"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                  className="p-4 rounded-xl border-2 text-sm font-medium text-left transition-all hover:border-[#8B5CF6] disabled:cursor-not-allowed"
                  style={{ background:bg, borderColor:border, color }}>
                  <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span>{opt}
                </button>
              );
            })}
          </div>
          {selected !== null && currentQ.explanation && (
            <div className="mt-4 p-3 bg-[#F5F3FF] rounded-xl text-xs text-[#7C3AED]">💡 {currentQ.explanation}</div>
          )}
        </div>
      </div>
      <div className="w-52 shrink-0 bg-white rounded-2xl border border-[#E8EDF5] p-4 h-fit sticky top-0">
        <div className="flex items-center gap-1.5 mb-3"><Zap size={14} className="text-[#8B5CF6]"/><span className="text-xs font-semibold text-[#1A2035]">Live Rankings</span></div>
        {sorted.map((p,i) => (
          <div key={p.id} className="flex items-center gap-2 py-2 border-b border-[#F0F4FA] last:border-0" style={{ background: p.isMe?"#FFF7F4":"transparent" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background:i===0?"#FFB347":"#F0F4FA", color:i===0?"white":"#7A869A" }}>{i+1}</div>
            <div className="text-[11px] font-medium text-[#1A2035] truncate flex-1">{p.name.split(" ")[0]}{p.isMe&&" ⭐"}</div>
            <div className="text-[11px] font-bold text-[#8B5CF6]">{p.liveScore}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: VS AI — difficulty picker then 1v1 vs EduBot
   ══════════════════════════════════════════════════════════════════════ */
function VsAIMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  type Phase = "LOADING"|"SETUP"|"PLAYING"|"RESULTS";
  const [phase,     setPhase]     = useState<Phase>("LOADING");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [diff,      setDiff]      = useState<"EASY"|"MEDIUM"|"HARD">("MEDIUM");
  const [qIndex,    setQIndex]    = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(15);
  const [myScore,   setMyScore]   = useState(0);
  const [aiScore,   setAiScore]   = useState(0);
  const [selected,  setSelected]  = useState<number|null>(null);
  const [showAns,   setShowAns]   = useState(false);

  useEffect(() => {
    fetchQuestions(quizId).then(qs => { setQuestions(qs); setPhase(qs.length ? "SETUP" : "LOADING"); });
  }, [quizId]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    setTimeLeft(15); setSelected(null); setShowAns(false);
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(t); handleTimeout(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase]);

  function handleTimeout() { advanceAfterAnswer(false); }

  function handleAnswer(optIdx: number) {
    if (selected !== null || showAns) return;
    setSelected(optIdx);
    setShowAns(true);
    const correct = optIdx === questions[qIndex].correct;
    if (correct) setMyScore(s => s+1);
    const aiCorrect = Math.random() < AI_ACCURACY[diff];
    if (aiCorrect) setAiScore(s => s+1);
    setTimeout(() => advanceAfterAnswer(correct), 1000);
  }

  function advanceAfterAnswer(_wasCorrect: boolean) {
    if (qIndex + 1 >= questions.length) { setPhase("RESULTS"); return; }
    setQIndex(i => i+1);
    setShowAns(false);
    setSelected(null);
  }

  function restart() { setPhase("SETUP"); setQIndex(0); setMyScore(0); setAiScore(0); setSelected(null); setShowAns(false); }

  if (phase === "LOADING") return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#8B5CF6]"/></div>;

  if (phase === "SETUP") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">⚡ Speed Blitz · 🤖 VS AI</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl p-8 border border-[#E8EDF5] space-y-5">
        <div className="text-center"><div className="text-5xl mb-3">🤖</div><h2 className="text-lg font-bold text-[#1A2035]">Choose Difficulty</h2></div>
        <div className="grid grid-cols-3 gap-3">
          {(["EASY","MEDIUM","HARD"] as const).map(d => (
            <button key={d} onClick={() => setDiff(d)}
              className="py-4 rounded-xl border-2 text-center transition-all"
              style={{ borderColor: diff===d?"#8B5CF6":"#E8EDF5", background: diff===d?"#F5F3FF":"white" }}>
              <div className="text-xl mb-1">{d==="EASY"?"😊":d==="MEDIUM"?"🤔":"😤"}</div>
              <div className="text-xs font-bold text-[#1A2035]">{d}</div>
              <div className="text-[10px] text-[#7A869A]">AI {Math.round(AI_ACCURACY[d]*100)}%</div>
              <div className="text-[10px] text-[#F59E0B] font-bold mt-1">+{AI_XP[d]} XP</div>
            </button>
          ))}
        </div>
        <button onClick={() => setPhase("PLAYING")} className="w-full py-3 bg-[#8B5CF6] text-white rounded-xl font-bold hover:bg-[#7C3AED] transition-colors">
          Battle EduBot →
        </button>
      </div>
    </div>
  );

  if (phase === "RESULTS") {
    const won = myScore >= aiScore;
    return (
      <div className="max-w-md mx-auto text-center space-y-6 animate-fadeIn pt-8">
        <div className="text-6xl">{won ? "🏆" : "🤖"}</div>
        <h1 className="text-3xl font-bold text-[#1A2035]">{won ? "You Beat EduBot!" : "EduBot Wins!"}</h1>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <p className="text-xs text-[#7A869A] mb-4">{quizTitle} · {diff}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F5F3FF] rounded-xl p-4">
              <div className="text-2xl font-black text-[#8B5CF6]">{myScore}</div>
              <div className="text-xs text-[#7A869A]">You</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-xl p-4">
              <div className="text-2xl font-black text-[#7A869A]">{aiScore}</div>
              <div className="text-xs text-[#7A869A]">EduBot 🤖</div>
            </div>
          </div>
          {won && <div className="mt-4 text-lg font-bold text-[#F59E0B]">+{AI_XP[diff]} XP earned!</div>}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={restart} className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl font-bold">Play Again</button>
          <Link href="/student/play" className="px-6 py-2.5 border border-[#E8EDF5] rounded-xl font-medium text-[#7A869A]">Game Zone</Link>
        </div>
      </div>
    );
  }

  const q = questions[qIndex];
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="grid grid-cols-3 items-center gap-4 bg-white rounded-2xl p-4 border border-[#E8EDF5]">
        <div className="text-center"><div className="text-2xl font-black text-[#8B5CF6]">{myScore}</div><div className="text-xs text-[#7A869A]">You</div></div>
        <div className="text-center">
          <div className={`text-xl font-bold ${timeLeft<=4?"text-[#EF4444]":"text-[#1A2035]"}`}>{timeLeft}s</div>
          <div className="text-[10px] text-[#7A869A]">Q{qIndex+1}/{questions.length} · {diff}</div>
        </div>
        <div className="text-center"><div className="text-2xl font-black text-[#7A869A]">{aiScore}</div><div className="text-xs text-[#7A869A]">EduBot 🤖</div></div>
      </div>
      <div className="h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
        <div className="h-full bg-[#8B5CF6] rounded-full transition-all duration-1000" style={{ width:`${(timeLeft/15)*100}%` }}/>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <p className="text-base font-bold text-[#1A2035] text-center mb-5">{q.text}</p>
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt,i) => {
            let bg="#fff",border="#E8EDF5",color="#1A2035";
            if (showAns) {
              if (i===q.correct) { bg="#ECFDF5"; border="#10B981"; color="#166634"; }
              else if (i===selected) { bg="#FEF2F2"; border="#EF4444"; color="#991B1B"; }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={showAns}
                className="p-4 rounded-xl border-2 text-sm font-medium text-left transition-all hover:border-[#8B5CF6] disabled:cursor-not-allowed"
                style={{ background:bg, borderColor:border, color }}>
                <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            );
          })}
        </div>
        {showAns && q.explanation && <div className="mt-4 p-3 bg-[#F5F3FF] rounded-xl text-xs text-[#7C3AED]">💡 {q.explanation}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: 1v1 ONLINE — room code, Supabase realtime race
   ══════════════════════════════════════════════════════════════════════ */
function OnlineMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const { user } = useCurrentUser();
  type Phase = "ROOM"|"WAITING"|"PLAYING"|"RESULTS";
  const [phase,       setPhase]       = useState<Phase>("ROOM");
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [roomCode,    setRoomCode]    = useState("");
  const [joinCode,    setJoinCode]    = useState("");
  const [roomId,      setRoomId]      = useState("");
  const [isHost,      setIsHost]      = useState(false);
  const [opponentName,setOpponentName]= useState("");
  const [opponentScore,setOpponentScore]=useState(0);
  const [qIndex,      setQIndex]      = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(15);
  const [myScore,     setMyScore]     = useState(0);
  const [selected,    setSelected]    = useState<number|null>(null);
  const [showAns,     setShowAns]     = useState(false);
  const [copied,      setCopied]      = useState(false);
  const channelRef = useRef<any>(null);
  const myScoreRef = useRef(0);

  async function createRoom() {
    const code = genCode();
    const qs   = await fetchQuestions(quizId);
    if (!qs.length) { toast.error("No questions found"); return; }
    setQuestions(qs);
    const { data, error } = await createClient().from("game_rooms").insert({
      code, quiz_id: quizId, host_id: user?.studentId ?? "",
      mode: "SPEED_BLITZ_1V1", status: "WAITING",
      players: [{ id: user?.studentId, name: user?.name ?? "Player 1", score: 0 }],
      expires_at: new Date(Date.now() + 30*60*1000).toISOString(),
    }).select("id").single();
    if (error || !data) { toast.error("Failed to create room"); return; }
    setRoomCode(code); setRoomId(data.id); setIsHost(true); setPhase("WAITING");
    subscribeRoom(data.id, true, qs);
  }

  async function joinRoom() {
    if (joinCode.trim().length !== 6) { toast.error("Enter a 6-character code"); return; }
    const { data: room } = await createClient().from("game_rooms").select("*").eq("code", joinCode.toUpperCase()).eq("status", "WAITING").single();
    if (!room) { toast.error("Room not found or already started"); return; }
    const qs = await fetchQuestions(room.quiz_id);
    setQuestions(qs);
    const updatedPlayers = [...(room.players ?? []), { id: user?.studentId, name: user?.name ?? "Player 2", score: 0 }];
    await createClient().from("game_rooms").update({ status: "PLAYING", players: updatedPlayers, started_at: new Date().toISOString() }).eq("id", room.id);
    setRoomId(room.id); setIsHost(false); setPhase("PLAYING"); setQIndex(0);
    const hostPlayer = room.players?.[0];
    setOpponentName(hostPlayer?.name ?? "Player 1");
    subscribeRoom(room.id, false, qs);
  }

  function subscribeRoom(rid: string, hosting: boolean, qs: Question[]) {
    const supabase = createClient();
    const ch = supabase.channel(`sb-${rid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${rid}` }, payload => {
        const room = payload.new as any;
        if (hosting && room.status === "PLAYING") {
          setPhase("PLAYING"); setQIndex(0);
          const guest = room.players?.find((p: any) => p.id !== user?.studentId);
          if (guest) setOpponentName(guest.name);
        }
        const opponent = room.players?.find((p: any) => p.id !== user?.studentId);
        if (opponent) setOpponentScore(opponent.score ?? 0);
        if (room.status === "DONE") setPhase("RESULTS");
      })
      .on("broadcast", { event: "score" }, ({ payload }) => {
        if (payload.playerId !== user?.studentId) setOpponentScore(payload.score ?? 0);
      })
      .subscribe();
    channelRef.current = ch;
  }

  useEffect(() => {
    if (phase !== "PLAYING") return;
    setTimeLeft(15); setSelected(null); setShowAns(false);
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(t); advanceQuestion(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase]);

  useEffect(() => () => { channelRef.current?.unsubscribe(); }, []);

  async function handleAnswer(optIdx: number) {
    if (selected !== null || showAns) return;
    setSelected(optIdx);
    setShowAns(true);
    const correct = optIdx === questions[qIndex]?.correct;
    if (correct) {
      const next = myScoreRef.current + 1;
      myScoreRef.current = next;
      setMyScore(next);
      channelRef.current?.send({ type: "broadcast", event: "score", payload: { playerId: user?.studentId, score: next } });
      await createClient().from("game_rooms").update({ players: [{ id: user?.studentId, name: user?.name ?? "Me", score: next }] }).eq("id", roomId);
    }
    setTimeout(advanceQuestion, 900);
  }

  async function advanceQuestion() {
    const next = qIndex + 1;
    if (next >= questions.length) {
      await createClient().from("game_rooms").update({ status: "DONE" }).eq("id", roomId);
      setPhase("RESULTS"); return;
    }
    setQIndex(next); setSelected(null); setShowAns(false);
  }

  async function copyCode() { await navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (phase === "ROOM") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">⚡ Speed Blitz · 👥 1v1 Online</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <button onClick={createRoom} className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E8EDF5] hover:border-[#8B5CF6] hover:bg-[#F5F3FF] transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-2xl">🎮</div>
          <div><div className="text-sm font-bold text-[#1A2035]">Create Room</div><div className="text-xs text-[#7A869A]">Get a code to share with your friend</div></div>
        </button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8EDF5]"/></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-[#7A869A]">or join</span></div>
        </div>
        <div className="flex gap-2">
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
            placeholder="ENTER CODE"
            className="flex-1 h-11 px-4 rounded-xl border border-[#E8EDF5] text-sm font-bold tracking-widest text-[#1A2035] outline-none focus:border-[#8B5CF6] uppercase"/>
          <button onClick={joinRoom} className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl font-bold text-sm hover:bg-[#7C3AED]">Join</button>
        </div>
      </div>
    </div>
  );

  if (phase === "WAITING") return (
    <div className="max-w-md mx-auto text-center space-y-6 animate-fadeIn pt-8">
      <div className="text-6xl">⚡</div>
      <h1 className="text-xl font-bold text-[#1A2035]">Waiting for opponent…</h1>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-8">
        <p className="text-xs text-[#7A869A] mb-2">Share this code with your friend</p>
        <div className="text-4xl font-black text-[#8B5CF6] tracking-widest mb-4">{roomCode}</div>
        <button onClick={copyCode} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm text-[#7A869A] hover:text-[#8B5CF6] hover:border-[#8B5CF6]">
          {copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-[#7A869A]">
        <Loader2 size={14} className="animate-spin"/>Waiting for player to join…
      </div>
    </div>
  );

  if (phase === "RESULTS") {
    const won = myScore > opponentScore || (myScore === opponentScore);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 animate-fadeIn pt-8">
        <div className="text-6xl">{won ? "🏆" : "⚡"}</div>
        <h1 className="text-3xl font-bold text-[#1A2035]">{myScore > opponentScore ? "You Won!" : myScore === opponentScore ? "It's a Tie!" : `${opponentName} Wins!`}</h1>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <p className="text-xs text-[#7A869A] mb-4">{quizTitle}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F5F3FF] rounded-xl p-4"><div className="text-2xl font-black text-[#8B5CF6]">{myScore}</div><div className="text-xs text-[#7A869A]">You</div></div>
            <div className="bg-[#F8FAFC] rounded-xl p-4"><div className="text-2xl font-black text-[#7A869A]">{opponentScore}</div><div className="text-xs text-[#7A869A]">{opponentName}</div></div>
          </div>
          {myScore > opponentScore && <div className="mt-4 text-lg font-bold text-[#F59E0B]">+50 XP earned!</div>}
        </div>
        <Link href="/student/play" className="inline-block px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl font-bold">Game Zone</Link>
      </div>
    );
  }

  const q = questions[qIndex];
  if (!q) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="grid grid-cols-3 items-center gap-4 bg-white rounded-2xl p-4 border border-[#E8EDF5]">
        <div className="text-center"><div className="text-2xl font-black text-[#8B5CF6]">{myScore}</div><div className="text-xs text-[#7A869A]">You</div></div>
        <div className="text-center">
          <div className={`text-xl font-bold ${timeLeft<=4?"text-[#EF4444]":"text-[#1A2035]"}`}>{timeLeft}s</div>
          <div className="text-[10px] text-[#7A869A]">Q{qIndex+1}/{questions.length}</div>
        </div>
        <div className="text-center"><div className="text-2xl font-black text-[#7A869A]">{opponentScore}</div><div className="text-xs text-[#7A869A]">{opponentName || "Opponent"}</div></div>
      </div>
      <div className="h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden"><div className="h-full bg-[#8B5CF6] transition-all duration-1000" style={{ width:`${(timeLeft/15)*100}%` }}/></div>
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <p className="text-base font-bold text-[#1A2035] text-center mb-5">{q.text}</p>
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt,i) => {
            let bg="#fff",border="#E8EDF5",color="#1A2035";
            if (showAns) {
              if (i===q.correct) { bg="#ECFDF5"; border="#10B981"; color="#166634"; }
              else if (i===selected) { bg="#FEF2F2"; border="#EF4444"; color="#991B1B"; }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={showAns}
                className="p-4 rounded-xl border-2 text-sm font-medium text-left transition-all hover:border-[#8B5CF6] disabled:cursor-not-allowed"
                style={{ background:bg, borderColor:border, color }}>
                <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: PASS & PLAY — offline, sequential turns
   ══════════════════════════════════════════════════════════════════════ */
const PP_COLORS = ["#8B5CF6","#FF6B35","#10B981","#3B82F6"];

function PassPlayMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  type Phase = "SETUP"|"PLAYING"|"RESULTS";
  interface PPPlayer { name: string; score: number; timeSecs: number }
  const [phase,     setPhase]     = useState<Phase>("SETUP");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players,   setPlayers]   = useState<PPPlayer[]>([{ name:"Player 1", score:0, timeSecs:0 },{ name:"Player 2", score:0, timeSecs:0 }]);
  const [current,   setCurrent]   = useState(0); // whose turn
  const [qIndex,    setQIndex]    = useState(0);
  const [selected,  setSelected]  = useState<number|null>(null);
  const [showAns,   setShowAns]   = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [loading,   setLoading]   = useState(false);

  async function startGame() {
    if (players.some(p => !p.name.trim())) { toast.error("All players need a name"); return; }
    setLoading(true);
    const qs = await fetchQuestions(quizId);
    setLoading(false);
    if (!qs.length) { toast.error("No questions found"); return; }
    setQuestions(qs);
    setPhase("PLAYING");
    setStartedAt(Date.now());
  }

  function handleAnswer(optIdx: number) {
    if (selected !== null) return;
    setSelected(optIdx);
    setShowAns(true);
    const correct = optIdx === questions[qIndex].correct;
    if (correct) setPlayers(prev => prev.map((p,i) => i===current ? {...p, score:p.score+1} : p));
  }

  function next() {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const nextQ = qIndex + 1;
    const nextP = (current + 1) % players.length;
    setSelected(null); setShowAns(false);

    if (nextQ >= questions.length * players.length) {
      // All players done all questions
      setPlayers(prev => prev.map((p, i) => i === current ? { ...p, timeSecs: elapsed } : p));
      setPhase("RESULTS");
      return;
    }

    // When cycling back to player 0, questions increment
    const newQIndex = Math.floor(nextQ / players.length);
    if (newQIndex >= questions.length) { setPhase("RESULTS"); return; }

    setPlayers(prev => prev.map((p, i) => {
      if (i === current && nextP === 0) return { ...p, timeSecs: elapsed };
      return p;
    }));
    setCurrent(nextP);
    setQIndex(newQIndex);
    setStartedAt(Date.now());
  }

  if (phase === "SETUP") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">⚡ Speed Blitz · 📱 Pass & Play</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <div className="text-sm font-bold text-[#1A2035]">Players (2–4)</div>
        {players.map((p,i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PP_COLORS[i] }}/>
            <input value={p.name} onChange={e => setPlayers(prev => prev.map((pl,j) => j===i ? {...pl, name:e.target.value} : pl))}
              placeholder={`Player ${i+1} name`}
              className="flex-1 h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#8B5CF6]"/>
            {i >= 2 && (
              <button onClick={() => setPlayers(prev => prev.filter((_,j) => j!==i))} className="text-[#EF4444] hover:bg-[#FEF2F2] p-2 rounded-xl"><Trash2 size={14}/></button>
            )}
          </div>
        ))}
        {players.length < 4 && (
          <button onClick={() => setPlayers(prev => [...prev, { name:`Player ${prev.length+1}`, score:0, timeSecs:0 }])}
            className="w-full py-2 rounded-xl border-2 border-dashed border-[#E8EDF5] text-[#7A869A] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#8B5CF6] hover:text-[#8B5CF6]">
            <Plus size={14}/> Add Player
          </button>
        )}
      </div>
      <button onClick={startGame} disabled={loading}
        className="w-full py-3 bg-[#8B5CF6] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#7C3AED] disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin"/> : "⚡"} Start Game
      </button>
    </div>
  );

  if (phase === "RESULTS") {
    const sorted = [...players].map((p,i) => ({...p, idx:i})).sort((a,b) => b.score - a.score || a.timeSecs - b.timeSecs);
    const medals = ["🥇","🥈","🥉","4️⃣"];
    return (
      <div className="max-w-md mx-auto space-y-6 text-center animate-fadeIn">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-black text-[#1A2035]">{sorted[0].name} Wins!</h1>
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-3">
          {sorted.map((p,i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-2xl">{medals[i]}</div>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PP_COLORS[p.idx] }}/>
              <div className="flex-1 text-left text-sm font-bold text-[#1A2035]">{p.name}</div>
              <div className="text-xl font-black text-[#8B5CF6]">{p.score}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPhase("SETUP"); setCurrent(0); setQIndex(0); setPlayers(p => p.map(pl=>({...pl,score:0,timeSecs:0}))); }}
            className="flex-1 py-3 rounded-xl bg-[#8B5CF6] text-white text-sm font-bold">Play Again</button>
          <Link href="/student/play" className="flex-1 py-3 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-bold text-center">Game Zone</Link>
        </div>
      </div>
    );
  }

  const q       = questions[qIndex];
  const player  = players[current];
  const color   = PP_COLORS[current];
  const nextP   = (current+1) % players.length;
  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl text-white" style={{ background: color }}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">{current+1}</div>
        <div className="flex-1"><div className="font-bold text-sm">{player.name}'s Turn</div><div className="text-white/70 text-[10px]">Score: {player.score}</div></div>
        <div className="text-xs font-semibold text-white/70">Q{qIndex+1}/{questions.length}</div>
      </div>
      <div className="flex gap-2">
        {players.map((p,i) => (
          <div key={i} className={`flex-1 rounded-xl p-2 text-center border-2 transition-all ${i===current?"border-[#8B5CF6] bg-[#F5F3FF]":"border-[#E8EDF5] bg-white"}`}>
            <div className="text-[10px] text-[#7A869A] truncate">{p.name}</div>
            <div className="text-sm font-black text-[#1A2035]">{p.score}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6">
        <p className="text-base font-bold text-[#1A2035] leading-relaxed">{q?.text}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {q?.options.map((opt,i) => {
          const answered = selected !== null;
          const isCorrect = i===q.correct; const isChosen = i===selected;
          let cls = "bg-white border-[#E8EDF5]";
          if (answered && isCorrect) cls="bg-[#ECFDF5] border-[#10B981]";
          else if (answered && isChosen && !isCorrect) cls="bg-[#FEF2F2] border-[#EF4444]";
          return (
            <button key={i} disabled={answered} onClick={() => handleAnswer(i)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${cls} ${!answered?"hover:border-[#8B5CF6] hover:bg-[#F5F3FF]":""}`}>
              <span className="font-black text-[#7A869A] mr-3">{String.fromCharCode(65+i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {showAns && (
        <div className="space-y-3">
          {q?.explanation && <div className="bg-[#F5F3FF] rounded-xl p-3 text-xs text-[#7C3AED]">💡 {q.explanation}</div>}
          <button onClick={next}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-colors"
            style={{ background: PP_COLORS[nextP] }}>
            Pass to {players[nextP]?.name} →
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ROOT — reads ?mode= and dispatches to the right sub-mode
   ══════════════════════════════════════════════════════════════════════ */
function SpeedBlitzInner() {
  const searchParams = useSearchParams();
  const quizId   = searchParams.get("quizId")    ?? "";
  const quizTitle= searchParams.get("quizTitle") ?? "Speed Blitz";
  const mode     = searchParams.get("mode")      ?? "solo";

  if (mode === "vs-ai")     return <VsAIMode    quizId={quizId} quizTitle={quizTitle}/>;
  if (mode === "1v1")       return <OnlineMode   quizId={quizId} quizTitle={quizTitle}/>;
  if (mode === "pass-play") return <PassPlayMode quizId={quizId} quizTitle={quizTitle}/>;
  return <SoloMode quizId={quizId} quizTitle={quizTitle}/>;
}

export default function SpeedBlitzPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#8B5CF6]"/></div>}>
      <SpeedBlitzInner/>
    </Suspense>
  );
}

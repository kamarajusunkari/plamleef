"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Loader2, Copy, Check, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/* ─── Shared types ─────────────────────────────────────────────────── */
interface Question { id: string; text: string; options: string[]; correct: number; explanation: string }

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

async function fetchQuestions(quizId: string): Promise<Question[]> {
  const supabase = createClient();
  let q = supabase.from("question").select("id, question, options, answer, explanation");
  if (quizId) q = q.eq("quiz_id", quizId);
  const { data } = await q.limit(10);
  return (data ?? []).map((row: any) => {
    const opts = Array.isArray(row.options) ? row.options as string[] : [];
    const ans  = Array.isArray(row.answer)  ? row.answer[0] as string : (row.answer as string) ?? "";
    return { id: row.id, text: row.question ?? "", options: opts, correct: Math.max(0, opts.indexOf(ans)), explanation: row.explanation ?? "" };
  });
}

/* ─── Shared rope UI ───────────────────────────────────────────────── */
function RopeBar({ position, leftLabel, rightLabel, leftScore, rightScore, qIndex, total }:
  { position: number; leftLabel: string; rightLabel: string; leftScore: number; rightScore: number; qIndex: number; total: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-center w-20">
          <div className="text-sm font-bold text-[#FF6B35]">{leftLabel}</div>
          <div className="text-2xl font-bold text-[#1A2035]">{leftScore}</div>
        </div>
        <div className="flex-1 mx-4">
          <div className="relative h-6 bg-[#F0F4FA] rounded-full overflow-hidden border-2 border-[#E8EDF5]">
            <div className="absolute inset-y-0 left-0 bg-[#FF6B35] transition-[width] duration-500" style={{ width:`${position}%` }}/>
            <div className="absolute inset-y-0 right-0 bg-[#3B82F6] transition-[width] duration-500" style={{ width:`${100-position}%` }}/>
            <div className="absolute inset-0 flex items-center">
              <div className="w-4 h-4 bg-white rounded-full border-2 border-[#1A2035] shadow transition-all duration-500" style={{ marginLeft:`calc(${position}% - 8px)` }}/>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-[#7A869A] mt-1">
            <span>← You</span><span>Opp →</span>
          </div>
        </div>
        <div className="text-center w-20">
          <div className="text-sm font-bold text-[#3B82F6]">{rightLabel}</div>
          <div className="text-2xl font-bold text-[#1A2035]">{rightScore}</div>
        </div>
      </div>
      <div className="text-center text-xs text-[#7A869A]">Q{qIndex+1}/{total}</div>
    </div>
  );
}

/* ─── Shared question UI ────────────────────────────────────────────── */
function QuestionCard({ q, selected, timeLeft, onAnswer }: { q: Question; selected: number|null; timeLeft: number; onAnswer: (i: number) => void }) {
  const timerPct = (timeLeft / 10) * 100;
  return (
    <>
      <div className="flex items-center gap-3">
        <Clock size={14} className="text-[#7A869A]"/>
        <div className="flex-1 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-1000" style={{ width:`${timerPct}%`, background: timeLeft<=3?"#EF4444":"#10B981" }}/>
        </div>
        <span className="text-sm font-bold" style={{ color: timeLeft<=3?"#EF4444":"#1A2035" }}>{timeLeft}s</span>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <p className="text-base font-bold text-[#1A2035] mb-5 text-center">{q.text}</p>
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt,i) => {
            let bg="#fff",border="#E8EDF5",color="#1A2035";
            if (selected !== null) {
              if (i===q.correct) { bg="#ECFDF5"; border="#10B981"; color="#166534"; }
              else if (i===selected) { bg="#FEF2F2"; border="#EF4444"; color="#991B1B"; }
            }
            return (
              <button key={i} onClick={() => onAnswer(i)} disabled={selected !== null}
                className="p-4 rounded-xl border-2 text-sm font-medium text-left transition-all hover:border-[#FF6B35] disabled:cursor-not-allowed"
                style={{ background:bg, borderColor:border, color }}>
                <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            );
          })}
        </div>
        {selected !== null && q.explanation && (
          <div className="mt-4 p-3 bg-[#FFF7F4] rounded-xl text-xs text-[#FF6B35]">💡 {q.explanation}</div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: VS AI — simulated AI opponent
   ══════════════════════════════════════════════════════════════════════ */
const OPPONENT = { name: "EduBot", initials: "AI", color: "#3B82F6" };

function VsAIMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  type Phase = "LOADING"|"SETUP"|"FINDING"|"COUNTDOWN"|"PLAYING"|"WIN"|"LOSS";
  const [phase,      setPhase]      = useState<Phase>("LOADING");
  const [questions,  setQuestions]  = useState<Question[]>([]);
  const [rope,       setRope]       = useState(50);
  const [qIndex,     setQIndex]     = useState(0);
  const [countdown,  setCountdown]  = useState(3);
  const [timeLeft,   setTimeLeft]   = useState(10);
  const [selected,   setSelected]   = useState<number|null>(null);
  const [myScore,    setMyScore]    = useState(0);
  const [oppScore,   setOppScore]   = useState(0);

  useEffect(() => { fetchQuestions(quizId).then(qs => { setQuestions(qs); setPhase(qs.length?"SETUP":"LOADING"); }); }, [quizId]);

  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) { setPhase("PLAYING"); setTimeLeft(10); return; }
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const t = setTimeout(() => setTimeLeft(t => t-1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (phase !== "PLAYING" || selected !== null) return;
    setSelected(optIdx);
    const q = questions[qIndex];
    const correct = optIdx === q?.correct;
    let newRope = rope;
    if (correct) { setMyScore(s => s+1); newRope = Math.min(rope+8, 95); toast.success("Pull! +8", { duration: 600 }); }
    const aiCorrect = Math.random() > 0.4;
    if (aiCorrect) { setOppScore(s => s+1); newRope = Math.max(newRope-8, 5); }
    setRope(newRope);
    setTimeout(() => {
      setSelected(null);
      const next = qIndex + 1;
      if (next >= questions.length) { setPhase(newRope >= 50 ? "WIN" : "LOSS"); return; }
      setQIndex(next); setTimeLeft(10);
    }, 800);
  }, [phase, selected, qIndex, rope, questions]);

  function restart() { setPhase("SETUP"); setRope(50); setQIndex(0); setMyScore(0); setOppScore(0); setSelected(null); }

  if (phase === "LOADING") return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#FF6B35]"/></div>;

  if (phase === "SETUP") return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">🪢 Tug of War · 🤖 VS AI</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl p-8 border border-[#E8EDF5] text-center">
        <div className="text-5xl mb-4">🤖</div>
        <h2 className="text-xl font-bold text-[#1A2035] mb-2">Battle EduBot</h2>
        <p className="text-sm text-[#7A869A] mb-6">Answer correctly to pull the rope your way. EduBot answers at 60% accuracy.</p>
        <button onClick={() => { setPhase("FINDING"); setTimeout(() => { setPhase("COUNTDOWN"); setCountdown(3); }, 1500); }}
          className="w-full py-3 bg-[#FF6B35] text-white rounded-xl font-bold hover:bg-[#E55A28] transition-colors">
          Start Battle →
        </button>
      </div>
    </div>
  );

  if (phase === "FINDING") return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center"><div className="text-4xl mb-4 animate-pulse">🤖</div>
        <div className="text-lg font-bold text-[#1A2035] mb-2">Summoning EduBot…</div></div>
    </div>
  );

  if (phase === "COUNTDOWN") return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="text-sm text-[#7A869A] mb-4">Battle starts in…</div>
        <div className="text-8xl font-bold text-[#FF6B35]">{countdown || "GO!"}</div>
        <div className="mt-4 text-sm text-[#7A869A]">vs {OPPONENT.name}</div>
      </div>
    </div>
  );

  if (phase === "WIN" || phase === "LOSS") return (
    <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn pt-8">
      <div className="text-6xl">{phase==="WIN"?"🏆":"😔"}</div>
      <h1 className="text-3xl font-bold" style={{ color: phase==="WIN"?"#10B981":"#EF4444" }}>{phase==="WIN"?"You Won!":"EduBot Wins!"}</h1>
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="grid grid-cols-3 gap-4 mb-4 items-center">
          <div className="text-center"><div className="text-2xl font-bold text-[#1A2035]">{myScore}</div><div className="text-xs text-[#7A869A]">You</div></div>
          <div className="text-xl font-bold text-[#7A869A]">vs</div>
          <div className="text-center"><div className="text-2xl font-bold text-[#1A2035]">{oppScore}</div><div className="text-xs text-[#7A869A]">EduBot</div></div>
        </div>
        {phase==="WIN" && <div className="text-lg font-bold text-[#FF6B35]">+40 XP earned!</div>}
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={restart} className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold">Play Again</button>
        <Link href="/student/play" className="px-6 py-2.5 border border-[#E8EDF5] rounded-xl font-medium text-[#7A869A]">Game Zone</Link>
      </div>
    </div>
  );

  const q = questions[qIndex];
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <RopeBar position={rope} leftLabel="You" rightLabel={OPPONENT.name} leftScore={myScore} rightScore={oppScore} qIndex={qIndex} total={questions.length}/>
      <QuestionCard q={q} selected={selected} timeLeft={timeLeft} onAnswer={handleAnswer}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: 1v1 ONLINE — room code + Supabase realtime rope sync
   ══════════════════════════════════════════════════════════════════════ */
function OnlineMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const { user } = useCurrentUser();
  type Phase = "ROOM"|"WAITING"|"COUNTDOWN"|"PLAYING"|"WIN"|"LOSS";
  const [phase,        setPhase]        = useState<Phase>("ROOM");
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [roomCode,     setRoomCode]     = useState("");
  const [joinCode,     setJoinCode]     = useState("");
  const [roomId,       setRoomId]       = useState("");
  const [isHost,       setIsHost]       = useState(false);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [rope,         setRope]         = useState(50);
  const [qIndex,       setQIndex]       = useState(0);
  const [countdown,    setCountdown]    = useState(3);
  const [timeLeft,     setTimeLeft]     = useState(10);
  const [selected,     setSelected]     = useState<number|null>(null);
  const [myScore,      setMyScore]      = useState(0);
  const [oppScore,     setOppScore]     = useState(0);
  const [copied,       setCopied]       = useState(false);
  const channelRef = useRef<any>(null);
  const ropeRef    = useRef(50);

  async function createRoom() {
    const code = genCode();
    const qs   = await fetchQuestions(quizId);
    if (!qs.length) { toast.error("No questions found"); return; }
    setQuestions(qs);
    const { data, error } = await createClient().from("game_rooms").insert({
      code, quiz_id: quizId, host_id: user?.studentId ?? "",
      mode: "TUG_OF_WAR_1V1", status: "WAITING",
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
    setRoomId(room.id); setIsHost(false);
    setOpponentName(room.players?.[0]?.name ?? "Player 1");
    subscribeRoom(room.id, false, qs);
    setPhase("COUNTDOWN"); setCountdown(3);
  }

  function subscribeRoom(rid: string, hosting: boolean, qs: Question[]) {
    const supabase = createClient();
    const ch = supabase.channel(`tow-${rid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${rid}` }, payload => {
        const room = payload.new as any;
        if (hosting && room.status === "PLAYING") {
          const guest = room.players?.find((p: any) => p.id !== user?.studentId);
          if (guest) setOpponentName(guest.name);
          setPhase("COUNTDOWN"); setCountdown(3);
        }
        if (room.status === "DONE") {
          const finalRope = room.rope_position ?? ropeRef.current;
          setRope(finalRope);
          setPhase(finalRope >= 50 ? "WIN" : "LOSS");
        }
      })
      .on("broadcast", { event: "rope" }, ({ payload }) => {
        if (payload.playerId !== user?.studentId) {
          const newPos = payload.position ?? 50;
          ropeRef.current = newPos;
          setRope(newPos);
          setOppScore(payload.oppScore ?? 0);
        }
      })
      .subscribe();
    channelRef.current = ch;
  }

  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) { setPhase("PLAYING"); setTimeLeft(10); return; }
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const t = setTimeout(() => setTimeLeft(t => t-1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  useEffect(() => () => { channelRef.current?.unsubscribe(); }, []);

  const handleAnswer = useCallback(async (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const q = questions[qIndex];
    const correct = optIdx === q?.correct;
    let newRope = ropeRef.current;
    if (correct) { setMyScore(s => s+1); newRope = Math.min(newRope+8, 95); toast.success("Pull! +8", { duration: 600 }); }
    ropeRef.current = newRope;
    setRope(newRope);

    // Broadcast rope position
    channelRef.current?.send({ type: "broadcast", event: "rope", payload: { playerId: user?.studentId, position: newRope, oppScore: correct ? myScore+1 : myScore } });

    setTimeout(async () => {
      const next = qIndex + 1;
      if (next >= questions.length) {
        await createClient().from("game_rooms").update({ status: "DONE", rope_position: newRope }).eq("id", roomId);
        setPhase(newRope >= 50 ? "WIN" : "LOSS"); return;
      }
      setQIndex(next); setSelected(null); setTimeLeft(10);
    }, 800);
  }, [selected, qIndex, questions, roomId, myScore, user?.studentId]);

  async function copyCode() { await navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (phase === "ROOM") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">🪢 Tug of War · 👥 1v1 Online</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <button onClick={createRoom} className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E8EDF5] hover:border-[#FF6B35] hover:bg-[#FFF7F4] transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-[#FFF7F4] flex items-center justify-center text-2xl">🎮</div>
          <div><div className="text-sm font-bold text-[#1A2035]">Create Room</div><div className="text-xs text-[#7A869A]">Get a code to share with your friend</div></div>
        </button>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8EDF5]"/></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-[#7A869A]">or join</span></div></div>
        <div className="flex gap-2">
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ENTER CODE"
            className="flex-1 h-11 px-4 rounded-xl border border-[#E8EDF5] text-sm font-bold tracking-widest text-[#1A2035] outline-none focus:border-[#FF6B35] uppercase"/>
          <button onClick={joinRoom} className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl font-bold text-sm hover:bg-[#E55A28]">Join</button>
        </div>
      </div>
    </div>
  );

  if (phase === "WAITING") return (
    <div className="max-w-md mx-auto text-center space-y-6 animate-fadeIn pt-8">
      <div className="text-6xl">🪢</div>
      <h1 className="text-xl font-bold text-[#1A2035]">Waiting for opponent…</h1>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-8">
        <p className="text-xs text-[#7A869A] mb-2">Share this code with your friend</p>
        <div className="text-4xl font-black text-[#FF6B35] tracking-widest mb-4">{roomCode}</div>
        <button onClick={copyCode} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm text-[#7A869A] hover:text-[#FF6B35] hover:border-[#FF6B35]">
          {copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-[#7A869A]"><Loader2 size={14} className="animate-spin"/>Waiting for player to join…</div>
    </div>
  );

  if (phase === "COUNTDOWN") return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center"><div className="text-sm text-[#7A869A] mb-4">Battle starts in…</div>
        <div className="text-8xl font-bold text-[#FF6B35]">{countdown || "GO!"}</div>
        <div className="mt-4 text-sm text-[#7A869A]">vs {opponentName}</div></div>
    </div>
  );

  if (phase === "WIN" || phase === "LOSS") return (
    <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn pt-8">
      <div className="text-6xl">{phase==="WIN"?"🏆":"😔"}</div>
      <h1 className="text-3xl font-bold" style={{ color: phase==="WIN"?"#10B981":"#EF4444" }}>{phase==="WIN"?"You Won!":opponentName+" Wins!"}</h1>
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="grid grid-cols-3 gap-4 mb-4 items-center">
          <div className="text-center"><div className="text-2xl font-bold text-[#FF6B35]">{myScore}</div><div className="text-xs text-[#7A869A]">You</div></div>
          <div className="text-xl font-bold text-[#7A869A]">vs</div>
          <div className="text-center"><div className="text-2xl font-bold text-[#3B82F6]">{oppScore}</div><div className="text-xs text-[#7A869A]">{opponentName}</div></div>
        </div>
        {phase==="WIN" && <div className="text-lg font-bold text-[#FF6B35]">+50 XP earned!</div>}
      </div>
      <Link href="/student/play" className="inline-block px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold">Game Zone</Link>
    </div>
  );

  const q = questions[qIndex];
  if (!q) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <RopeBar position={rope} leftLabel="You" rightLabel={opponentName} leftScore={myScore} rightScore={oppScore} qIndex={qIndex} total={questions.length}/>
      <QuestionCard q={q} selected={selected} timeLeft={timeLeft} onAnswer={handleAnswer}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODE: PASS & PLAY — offline, 2 players alternating, tug of war
   ══════════════════════════════════════════════════════════════════════ */
const PP_COLORS = ["#FF6B35","#3B82F6"];

function PassPlayMode({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  type Phase = "SETUP"|"PLAYING"|"WIN"|"LOSS";
  interface PPPlayer { name: string; score: number }
  const [phase,     setPhase]     = useState<Phase>("SETUP");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players,   setPlayers]   = useState<PPPlayer[]>([{ name:"Player 1", score:0 },{ name:"Player 2", score:0 }]);
  const [current,   setCurrent]   = useState(0);
  const [qIndex,    setQIndex]    = useState(0);
  const [rope,      setRope]      = useState(50);
  const [selected,  setSelected]  = useState<number|null>(null);
  const [timeLeft,  setTimeLeft]  = useState(10);
  const [loading,   setLoading]   = useState(false);

  async function startGame() {
    if (players.some(p => !p.name.trim())) { toast.error("Both players need a name"); return; }
    setLoading(true);
    const qs = await fetchQuestions(quizId);
    setLoading(false);
    if (!qs.length) { toast.error("No questions found"); return; }
    setQuestions(qs);
    setPhase("PLAYING");
    setTimeLeft(10);
  }

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const t = setTimeout(() => setTimeLeft(t => t-1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const q = questions[qIndex];
    const correct = optIdx === q?.correct;
    let newRope = rope;
    if (correct && current === 0) { newRope = Math.min(rope+10, 95); setPlayers(p => p.map((pl,i) => i===0?{...pl,score:pl.score+1}:pl)); toast.success(`${players[0].name} pulls! +10`, { duration: 700 }); }
    if (correct && current === 1) { newRope = Math.max(rope-10, 5); setPlayers(p => p.map((pl,i) => i===1?{...pl,score:pl.score+1}:pl)); toast.success(`${players[1].name} pulls! +10`, { duration: 700 }); }
    setRope(newRope);

    setTimeout(() => {
      const nextP = (current+1) % 2;
      const nextQ = nextP === 0 ? qIndex + 1 : qIndex; // question advances every 2 turns
      setSelected(null);
      if (nextQ >= questions.length) {
        setPhase(newRope >= 50 ? "WIN" : "LOSS"); return;
      }
      setCurrent(nextP); setQIndex(nextQ); setTimeLeft(10);
    }, 800);
  }, [selected, qIndex, rope, current, questions, players]);

  function restart() { setPhase("SETUP"); setRope(50); setQIndex(0); setCurrent(0); setSelected(null); setPlayers(p => p.map(pl => ({...pl,score:0}))); }

  if (phase === "SETUP") return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/student/play"><ArrowLeft size={20} className="text-[#7A869A]"/></Link>
        <div><h1 className="text-xl font-bold text-[#1A2035]">🪢 Tug of War · 📱 Pass & Play</h1><p className="text-sm text-[#7A869A]">{quizTitle}</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <div className="text-sm font-bold text-[#1A2035]">2 Players</div>
        {players.map((p,i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PP_COLORS[i] }}/>
            <input value={p.name} onChange={e => setPlayers(prev => prev.map((pl,j) => j===i?{...pl,name:e.target.value}:pl))}
              placeholder={`Player ${i+1} name`}
              className="flex-1 h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
          </div>
        ))}
      </div>
      <button onClick={startGame} disabled={loading}
        className="w-full py-3 bg-[#FF6B35] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A28] disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin"/> : "🪢"} Start Tug of War
      </button>
    </div>
  );

  if (phase === "WIN" || phase === "LOSS") {
    const winner = rope >= 50 ? players[0] : players[1];
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn pt-8">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-black text-[#1A2035]">{winner.name} Wins!</h1>
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center"><div className="text-2xl font-bold text-[#FF6B35]">{players[0].score}</div><div className="text-xs text-[#7A869A]">{players[0].name}</div></div>
            <div className="text-xl font-bold text-[#7A869A]">vs</div>
            <div className="text-center"><div className="text-2xl font-bold text-[#3B82F6]">{players[1].score}</div><div className="text-xs text-[#7A869A]">{players[1].name}</div></div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={restart} className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold">Play Again</button>
          <Link href="/student/play" className="px-6 py-2.5 border border-[#E8EDF5] rounded-xl font-medium text-[#7A869A]">Game Zone</Link>
        </div>
      </div>
    );
  }

  const q = questions[qIndex];
  const color = PP_COLORS[current];
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white" style={{ background: color }}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">{current+1}</div>
        <div className="font-bold text-sm">{players[current].name}'s Turn — Pull the rope!</div>
        <div className="ml-auto text-xs text-white/70">Q{qIndex+1}/{questions.length}</div>
      </div>
      <RopeBar position={rope} leftLabel={players[0].name} rightLabel={players[1].name} leftScore={players[0].score} rightScore={players[1].score} qIndex={qIndex} total={questions.length}/>
      {q && <QuestionCard q={q} selected={selected} timeLeft={timeLeft} onAnswer={handleAnswer}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ROOT — reads ?mode= and dispatches
   ══════════════════════════════════════════════════════════════════════ */
function TugOfWarInner() {
  const searchParams = useSearchParams();
  const quizId    = searchParams.get("quizId")    ?? "";
  const quizTitle = searchParams.get("quizTitle") ?? "Tug of War";
  const mode      = searchParams.get("mode")      ?? "vs-ai";

  if (mode === "1v1")       return <OnlineMode   quizId={quizId} quizTitle={quizTitle}/>;
  if (mode === "pass-play") return <PassPlayMode  quizId={quizId} quizTitle={quizTitle}/>;
  return <VsAIMode quizId={quizId} quizTitle={quizTitle}/>;
}

export default function TugOfWarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>}>
      <TugOfWarInner/>
    </Suspense>
  );
}

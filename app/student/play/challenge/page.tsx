"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Copy, CheckCircle, Loader2, ChevronLeft, Users, Zap, Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface Question {
  id: string; question: string; options: string[];
  answer: string[]; explanation: string | null;
}
interface RoomPlayer { id: string; name: string; score: number; done: boolean; answers: number[] }

// ─── Main ─────────────────────────────────────────────────────────────────────
function ChallengeInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const quizId       = searchParams.get("quizId") ?? "";
  const quizTitle    = searchParams.get("quizTitle") ?? "Quiz";
  const { user }     = useCurrentUser();

  const [phase,      setPhase]      = useState<"setup"|"waiting"|"playing"|"results">("setup");
  const [joinCode,   setJoinCode]   = useState("");
  const [roomCode,   setRoomCode]   = useState("");
  const [roomId,     setRoomId]     = useState("");
  const [questions,  setQuestions]  = useState<Question[]>([]);
  const [players,    setPlayers]    = useState<RoomPlayer[]>([]);
  const [currentQ,   setCurrentQ]   = useState(0);
  const [selected,   setSelected]   = useState<number | null>(null);
  const [timeLeft,   setTimeLeft]   = useState(15);
  const [myAnswers,  setMyAnswers]   = useState<number[]>([]);
  const [myScore,    setMyScore]     = useState(0);
  const [copied,     setCopied]      = useState(false);
  const [loading,    setLoading]     = useState(false);
  const myId = user?.studentId ?? "";

  // ── Load questions ────────────────────────────────────────────────────────
  const loadQuestions = useCallback(async (qid: string) => {
    const { data } = await createClient()
      .from("question")
      .select("id, question, options, answer, explanation")
      .eq("quiz_id", qid)
      .limit(10);
    return (data ?? []) as Question[];
  }, []);

  // ── Create room ───────────────────────────────────────────────────────────
  async function createRoom() {
    if (!myId || !quizId) return;
    setLoading(true);
    const qs = await loadQuestions(quizId);
    if (!qs.length) { toast.error("No questions found for this quiz"); setLoading(false); return; }
    setQuestions(qs);
    const code = genCode();
    const { data, error } = await createClient().from("game_rooms").insert({
      code, quiz_id: quizId, host_id: myId, mode: "CHALLENGE", status: "WAITING",
      players: [{ id: myId, name: user?.name ?? "Me", score: 0, done: false, answers: [] }],
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }).select().single();
    setLoading(false);
    if (error || !data) { toast.error("Failed to create room"); return; }
    setRoomCode(code);
    setRoomId(data.id);
    setPlayers([{ id: myId, name: user?.name ?? "Me", score: 0, done: false, answers: [] }]);
    setPhase("waiting");
  }

  // ── Join room ─────────────────────────────────────────────────────────────
  async function joinRoom() {
    if (!joinCode.trim() || !myId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: room, error } = await supabase
      .from("game_rooms").select("*").eq("code", joinCode.toUpperCase()).eq("status", "WAITING").single();
    if (error || !room) { toast.error("Room not found or already started"); setLoading(false); return; }

    const qs = await loadQuestions(room.quiz_id);
    setQuestions(qs);
    const updatedPlayers = [...(room.players as RoomPlayer[]), { id: myId, name: user?.name ?? "Me", score: 0, done: false, answers: [] }];
    await supabase.from("game_rooms").update({ players: updatedPlayers, status: "PLAYING", started_at: new Date().toISOString() }).eq("id", room.id);
    setRoomId(room.id);
    setRoomCode(joinCode.toUpperCase());
    setPlayers(updatedPlayers);
    setPhase("playing");
    setLoading(false);
  }

  // ── Realtime — host watches for players, both watch for start ────────────
  useEffect(() => {
    if (!roomId || phase === "setup") return;
    const supabase = createClient();
    const channel  = supabase.channel(`room-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, payload => {
        const room = payload.new as any;
        setPlayers(room.players ?? []);
        if (room.status === "PLAYING" && phase === "waiting") {
          setPhase("playing");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(15);
    setSelected(null);
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleAnswer(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, phase]);

  // ── Answer ────────────────────────────────────────────────────────────────
  async function handleAnswer(optIdx: number | null) {
    if (selected !== null) return;
    if (optIdx !== null) setSelected(optIdx);

    const q     = questions[currentQ];
    const opts  = (q?.options ?? []) as string[];
    const ansArr = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
    const correct = opts.indexOf(ansArr[0] ?? "");
    const isRight = optIdx !== null && optIdx === correct;
    const newScore = myScore + (isRight ? 10 : 0);
    const newAnswers = [...myAnswers, optIdx ?? -1];
    setMyScore(newScore);
    setMyAnswers(newAnswers);

    // Update room
    const supabase = createClient();
    const { data: room } = await supabase.from("game_rooms").select("players").eq("id", roomId).single();
    const updPlayers = ((room?.players ?? []) as RoomPlayer[]).map(p =>
      p.id === myId ? { ...p, score: newScore, answers: newAnswers, done: currentQ + 1 >= questions.length } : p
    );
    await supabase.from("game_rooms").update({ players: updPlayers }).eq("id", roomId);

    await new Promise(r => setTimeout(r, 1000));

    if (currentQ + 1 >= questions.length) {
      await supabase.from("game_rooms").update({ status: "FINISHED" }).eq("id", roomId);
      setPhase("results");
    } else {
      setCurrentQ(prev => prev + 1);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    toast.success("Code copied!");
  }

  // ── Start game (host only) ────────────────────────────────────────────────
  async function startGame() {
    await createClient().from("game_rooms").update({ status: "PLAYING", started_at: new Date().toISOString() }).eq("id", roomId);
    setPhase("playing");
  }

  // ─────────────────────────────────────────────────────────────────────────
  const q    = questions[currentQ];
  const opts = (q?.options ?? []) as string[];
  const ansArr2 = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
  const correctIdx = opts.indexOf(ansArr2[0] ?? "");
  const opponent = players.find(p => p.id !== myId);
  const me       = players.find(p => p.id === myId);
  const isHost   = players[0]?.id === myId;

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ChevronLeft size={18}/></button>
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">👥 Challenge a Friend</h1>
          <p className="text-sm text-[#7A869A]">Quiz: {quizTitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <div className="text-sm font-bold text-[#1A2035] mb-2">Create a room</div>
        <button onClick={createRoom} disabled={loading}
          className="w-full py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Users size={14}/>}
          Create Room & Get Code
        </button>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E8EDF5]"/>
        <span className="text-xs text-[#7A869A] font-semibold">OR</span>
        <div className="flex-1 h-px bg-[#E8EDF5]"/>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
        <div className="text-sm font-bold text-[#1A2035]">Join a room</div>
        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
          placeholder="Enter 6-digit code"
          className="w-full h-12 px-4 rounded-xl border-2 border-[#E8EDF5] text-center text-2xl font-black tracking-[0.5em] text-[#1A2035] outline-none focus:border-[#10B981]"/>
        <button onClick={joinRoom} disabled={loading || joinCode.length < 6}
          className="w-full py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#E55A28] disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>}
          Join Room
        </button>
      </div>
    </div>
  );

  // ── WAITING ───────────────────────────────────────────────────────────────
  if (phase === "waiting") return (
    <div className="max-w-lg mx-auto space-y-6 text-center animate-fadeIn">
      <h1 className="text-xl font-bold text-[#1A2035]">Waiting for opponent…</h1>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-8 space-y-4">
        <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Share this code</div>
        <div className="text-5xl font-black text-[#1A2035] tracking-[0.3em]">{roomCode}</div>
        <button onClick={copyCode}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-semibold hover:bg-[#E8EDF5] transition-colors">
          {copied ? <CheckCircle size={14} className="text-[#10B981]"/> : <Copy size={14}/>}
          {copied ? "Copied!" : "Copy code"}
        </button>
        <div className="text-xs text-[#7A869A]">Quiz: {quizTitle}</div>
      </div>
      <div className="flex items-center justify-center gap-3">
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-[#ECFDF5] rounded-xl">
            <div className="w-2 h-2 rounded-full bg-[#10B981]"/>
            <span className="text-xs font-semibold text-[#10B981]">{p.name}</span>
          </div>
        ))}
      </div>
      {players.length >= 2 && isHost && (
        <button onClick={startGame}
          className="w-full py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#E55A28] transition-colors">
          🚀 Start Game!
        </button>
      )}
      <div className="animate-pulse text-xs text-[#7A869A]">Waiting for friend to join…</div>
    </div>
  );

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === "playing" && q) return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        {[me, opponent].map((p, i) => p ? (
          <div key={i} className={`bg-white rounded-2xl border-2 p-3 text-center ${i === 0 ? "border-[#FF6B35]" : "border-[#E8EDF5]"}`}>
            <div className="text-[10px] font-bold text-[#7A869A] uppercase">{i === 0 ? "You" : p.name}</div>
            <div className="text-2xl font-black text-[#1A2035]">{p.score}</div>
          </div>
        ) : (
          <div key={i} className="bg-[#F8FAFC] rounded-2xl border border-[#E8EDF5] p-3 text-center">
            <div className="text-xs text-[#CBD5E1]">Waiting…</div>
          </div>
        ))}
      </div>

      {/* Progress + timer */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full bg-[#FF6B35] rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}/>
        </div>
        <div className={`text-sm font-black w-8 text-right ${timeLeft <= 5 ? "text-[#EF4444]" : "text-[#1A2035]"}`}>{timeLeft}</div>
      </div>

      <div className="text-[10px] text-[#7A869A]">Question {currentQ + 1} of {questions.length}</div>

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
          let bg = "bg-white border-[#E8EDF5]";
          if (answered && isCorrect) bg = "bg-[#ECFDF5] border-[#10B981]";
          else if (answered && isChosen && !isCorrect) bg = "bg-[#FEF2F2] border-[#EF4444]";
          return (
            <button key={i} disabled={answered} onClick={() => handleAnswer(i)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${bg} ${!answered ? "hover:border-[#FF6B35] hover:bg-[#FFF7F4]" : ""}`}>
              <span className="font-black text-[#7A869A] mr-3">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (phase === "results") {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const iWon   = winner?.id === myId;
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center animate-fadeIn">
        <div className="text-6xl">{iWon ? "🏆" : "😤"}</div>
        <h1 className="text-2xl font-black text-[#1A2035]">{iWon ? "You Win!" : "Good Try!"}</h1>
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 space-y-4">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-[#1A2035]">{p.id === myId ? "You" : p.name}</div>
              </div>
              <div className="text-xl font-black text-[#FF6B35]">{p.score}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/student/play")}
            className="flex-1 py-3 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-bold hover:bg-[#E8EDF5] transition-colors">
            Back to Game Zone
          </button>
          <button onClick={() => { setPhase("setup"); setCurrentQ(0); setMyScore(0); setMyAnswers([]); setSelected(null); }}
            className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#E55A28] transition-colors">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>;
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>}>
      <ChallengeInner/>
    </Suspense>
  );
}

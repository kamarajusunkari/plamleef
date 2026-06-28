"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy, Users, Clock, Star, ChevronLeft, Loader2,
  Play, CheckCircle, Target, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface Question { id: string; question: string; options: string[]; answer: string[]; explanation: string | null }
interface Participant { student_id: string; score: number; correct_answers: number; time_taken_secs: number | null; rank: number | null; student_name: string }
interface Tournament {
  id: string; title: string; description: string | null; status: string;
  scope: string; format: string; banner_emoji: string;
  prize_xp_1st: number; prize_xp_2nd: number; prize_xp_3rd: number;
  starts_at: string; ends_at: string; entry_xp: number; max_participants: number;
  quiz_id: string; quiz_title: string;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();
  const { user } = useCurrentUser();

  const [tournament, setTournament]   = useState<Tournament | null>(null);
  const [participants,setParticipants]= useState<Participant[]>([]);
  const [questions,  setQuestions]    = useState<Question[]>([]);
  const [myEntry,    setMyEntry]      = useState<Participant | null>(null);
  const [loading,    setLoading]      = useState(true);
  const [joining,    setJoining]      = useState(false);

  // Game state
  const [phase,      setPhase]        = useState<"info"|"playing"|"done">("info");
  const [currentQ,   setCurrentQ]     = useState(0);
  const [selected,   setSelected]     = useState<number | null>(null);
  const [showAns,    setShowAns]      = useState(false);
  const [score,      setScore]        = useState(0);
  const [correct,    setCorrect]      = useState(0);
  const [timeLeft,   setTimeLeft]     = useState(20);
  const [startTime,  setStartTime]    = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: t } = await supabase
        .from("tournaments")
        .select("*, quiz!tournaments_quiz_id_fkey(title, id)")
        .eq("id", id)
        .single();

      if (!t) { setLoading(false); return; }
      setTournament({ ...t, quiz_title: (t.quiz as any)?.title ?? "Quiz", quiz_id: (t.quiz as any)?.id ?? "" });

      // Participants with names
      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("student_id, score, correct_answers, time_taken_secs, rank")
        .eq("tournament_id", id)
        .order("score", { ascending: false });

      const pIds = (pData ?? []).map((p: any) => p.student_id);
      let nameMap: Record<string, string> = {};
      if (pIds.length) {
        const { data: sData } = await supabase
          .from("students")
          .select("id, users!students_user_id_fkey(name)")
          .in("id", pIds);
        (sData ?? []).forEach((s: any) => { nameMap[s.id] = (s.users as any)?.name ?? "Student"; });
      }

      const enriched = ((pData ?? []) as any[]).map(p => ({ ...p, student_name: nameMap[p.student_id] ?? "Student" }));
      setParticipants(enriched);
      setMyEntry(enriched.find(p => p.student_id === user?.studentId) ?? null);
      setLoading(false);
    }
    load();
  }, [id, user?.studentId]);

  async function joinTournament() {
    if (!user?.studentId || !tournament) return;
    setJoining(true);
    const { error } = await createClient().from("tournament_participants").insert({
      tournament_id: id, student_id: user.studentId,
    });
    setJoining(false);
    if (error) { toast.error("Failed to join"); return; }
    toast.success("Joined! Good luck 🏆");
    const entry = { student_id: user.studentId, score: 0, correct_answers: 0, time_taken_secs: null, rank: null, student_name: user.name ?? "Me" };
    setMyEntry(entry);
    setParticipants(prev => [entry, ...prev]);
  }

  async function startPlay() {
    if (!tournament?.quiz_id) return;
    const { data } = await createClient()
      .from("question")
      .select("id, question, options, answer, explanation")
      .eq("quiz_id", tournament.quiz_id)
      .limit(15);
    if (!data?.length) { toast.error("No questions found"); return; }
    setQuestions(data as Question[]);
    setPhase("playing");
    setStartTime(Date.now());
    setCurrentQ(0);
    setScore(0);
    setCorrect(0);
  }

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(20);
    setSelected(null);
    setShowAns(false);
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleAnswerFinal(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, phase]);

  function handleAnswerFinal(optIdx: number | null) {
    if (selected !== null) return;
    if (optIdx !== null) setSelected(optIdx);
    setShowAns(true);

    const q = questions[currentQ];
    const opts = (q?.options ?? []) as string[];
    const ansArr = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
    const correctIdx = opts.indexOf(ansArr[0] ?? "");
    const isRight = optIdx !== null && optIdx === correctIdx;
    if (isRight) { setScore(s => s + 10); setCorrect(c => c + 1); }

    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        finishGame(isRight ? score + 10 : score, isRight ? correct + 1 : correct);
      } else {
        setCurrentQ(prev => prev + 1);
      }
    }, 1200);
  }

  async function finishGame(finalScore: number, finalCorrect: number) {
    const timeSecs = Math.round((Date.now() - startTime) / 1000);
    await createClient().from("tournament_participants").update({
      score: finalScore, correct_answers: finalCorrect, time_taken_secs: timeSecs, completed_at: new Date().toISOString(),
    }).eq("tournament_id", id).eq("student_id", user?.studentId ?? "");
    setMyEntry(prev => prev ? { ...prev, score: finalScore, correct_answers: finalCorrect, time_taken_secs: timeSecs } : prev);
    setPhase("done");
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#F59E0B]"/></div>;
  if (!tournament) return <div className="text-center py-16 text-[#7A869A]">Tournament not found</div>;

  const q = questions[currentQ];
  const opts = (q?.options ?? []) as string[];
  const qAns = Array.isArray(q?.answer) ? q.answer : [q?.answer ?? ""];
  const correctIdx = opts.indexOf(qAns[0] ?? "");
  const ss = { UPCOMING: { bg:"#EFF6FF", color:"#3B82F6" }, ACTIVE: { bg:"#ECFDF5", color:"#10B981" }, COMPLETED: { bg:"#F0F4FA", color:"#7A869A" } }[tournament.status] ?? { bg:"#F0F4FA", color:"#7A869A" };
  const isActive  = tournament.status === "ACTIVE";
  const canJoin   = isActive && !myEntry;
  const canPlay   = isActive && myEntry && !myEntry.score;
  const hasPlayed = myEntry && myEntry.score > 0;

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === "playing" && q) return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-[#1A2035]">Q {currentQ + 1}/{questions.length}</div>
        <div className={`text-lg font-black ${timeLeft <= 5 ? "text-[#EF4444]" : "text-[#1A2035]"}`}>{timeLeft}s</div>
        <div className="text-sm font-bold text-[#F59E0B]">{score} pts</div>
      </div>
      <div className="h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
        <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}/>
      </div>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6">
        <p className="text-base font-bold text-[#1A2035] leading-relaxed">{q.question}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {opts.map((opt, i) => {
          const isCorrect = i === correctIdx;
          const isChosen  = i === selected;
          let cls = "bg-white border-[#E8EDF5]";
          if (showAns && isCorrect) cls = "bg-[#ECFDF5] border-[#10B981]";
          else if (showAns && isChosen && !isCorrect) cls = "bg-[#FEF2F2] border-[#EF4444]";
          return (
            <button key={i} disabled={showAns} onClick={() => handleAnswerFinal(i)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${cls} ${!showAns ? "hover:border-[#F59E0B]" : ""}`}>
              <span className="font-black text-[#7A869A] mr-3">{String.fromCharCode(65+i)}.</span>{opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (phase === "done") return (
    <div className="max-w-md mx-auto space-y-6 text-center animate-fadeIn">
      <div className="text-6xl">{score >= questions.length * 8 ? "🏆" : score >= questions.length * 5 ? "🥈" : "🎯"}</div>
      <h1 className="text-2xl font-black text-[#1A2035]">Submitted!</h1>
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 grid grid-cols-3 gap-4">
        {[
          { label:"Score", value: score, emoji:"⭐" },
          { label:"Correct", value: `${correct}/${questions.length}`, emoji:"✅" },
          { label:"Time", value: myEntry?.time_taken_secs ? `${myEntry.time_taken_secs}s` : "—", emoji:"⏱" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-2xl">{s.emoji}</div>
            <div className="text-xl font-black text-[#1A2035]">{s.value}</div>
            <div className="text-[10px] text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#7A869A]">Results will be announced when the tournament ends</p>
      <button onClick={() => router.push("/student/play/tournaments")}
        className="w-full py-3 rounded-xl bg-[#F59E0B] text-white font-bold hover:bg-[#D97706] transition-colors">
        View All Tournaments
      </button>
    </div>
  );

  // ── INFO ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A]"><ChevronLeft size={18}/></button>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1628] to-[#1E3A5F] rounded-3xl p-7 text-white">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{tournament.banner_emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                {tournament.status === "ACTIVE" ? "● LIVE" : tournament.status}
              </span>
              <span className="text-[9px] text-white/50 uppercase tracking-wider">{tournament.scope === "CLASS" ? "Class" : tournament.scope === "SCHOOL" ? "School" : "Open"}</span>
            </div>
            <h1 className="text-xl font-black leading-tight">{tournament.title}</h1>
            {tournament.description && <p className="text-white/60 text-xs mt-1">{tournament.description}</p>}
            <p className="text-white/50 text-[10px] mt-2">📋 {tournament.quiz_title}</p>
          </div>
        </div>

        {/* Prizes */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { medal:"🥇", label:"1st Place", xp: tournament.prize_xp_1st },
            { medal:"🥈", label:"2nd Place", xp: tournament.prize_xp_2nd },
            { medal:"🥉", label:"3rd Place", xp: tournament.prize_xp_3rd },
          ].map(p => (
            <div key={p.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{p.medal}</div>
              <div className="text-xs font-bold">{p.xp} XP</div>
              <div className="text-[9px] text-white/50">{p.label}</div>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="mt-4 flex gap-4 text-[10px] text-white/50 flex-wrap">
          <span><Users size={10} className="inline mr-1"/>{participants.length}{tournament.max_participants ? `/${tournament.max_participants}` : ""} players</span>
          <span><Clock size={10} className="inline mr-1"/>{isActive ? `Ends ${new Date(tournament.ends_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}` : `Starts ${new Date(tournament.starts_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`}</span>
          {tournament.entry_xp > 0 && <span className="text-[#F59E0B]">⚡ {tournament.entry_xp} XP entry fee</span>}
        </div>
      </div>

      {/* CTA */}
      {canJoin && (
        <button onClick={joinTournament} disabled={joining}
          className="w-full py-4 rounded-2xl bg-[#F59E0B] text-white text-base font-black flex items-center justify-center gap-2 hover:bg-[#D97706] disabled:opacity-50 transition-colors">
          {joining ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>}
          Join Tournament
        </button>
      )}
      {canPlay && (
        <button onClick={startPlay}
          className="w-full py-4 rounded-2xl bg-[#10B981] text-white text-base font-black flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors">
          <Play size={16}/> Start Playing Now!
        </button>
      )}
      {hasPlayed && (
        <div className="bg-[#ECFDF5] rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-[#10B981]"/>
          <div>
            <div className="text-sm font-bold text-[#10B981]">You've submitted your entry!</div>
            <div className="text-[10px] text-[#7A869A]">Score: {myEntry?.score} · {myEntry?.correct_answers} correct</div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {participants.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8EDF5] text-sm font-bold text-[#1A2035]">
            Leaderboard — {participants.length} players
          </div>
          <div className="divide-y divide-[#F0F4FA]">
            {participants.map((p, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
              const isMe = p.student_id === user?.studentId;
              return (
                <div key={p.student_id} className={`px-5 py-3 flex items-center gap-3 ${isMe ? "bg-[#FFF7F4]" : ""}`}>
                  <div className="text-lg w-8 text-center">{medal}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035] truncate">{isMe ? "You" : p.student_name}</p>
                  </div>
                  <div className="text-sm font-black text-[#F59E0B]">{p.score}</div>
                  {p.correct_answers > 0 && <div className="text-[10px] text-[#7A869A]">{p.correct_answers} correct</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

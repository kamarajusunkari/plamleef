"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ChevronDown, Loader2, BookOpen, Clock, Target, ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Quiz {
  id: string;
  title: string;
  subject_name: string;
  difficulty: string;
  count: number;           // question count
  time_limit: number | null;
}

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#ECFDF5", color: "#10B981" },
  MEDIUM: { bg: "#FFFBEB", color: "#F59E0B" },
  HARD:   { bg: "#FEF2F2", color: "#EF4444" },
};

const MODE_META: Record<string, { emoji: string; title: string; desc: string; color: string }> = {
  "vs-ai":     { emoji: "🤖", title: "VS AI",       desc: "Choose difficulty then battle EduBot", color: "#8B5CF6" },
  "solo":      { emoji: "⚡", title: "Speed Blitz",  desc: "90 seconds. Max score wins.",           color: "#FF6B35" },
  "challenge": { emoji: "👥", title: "Challenge",    desc: "Share a code with a friend.",            color: "#10B981" },
  "pass-play": { emoji: "📱", title: "Pass & Play",  desc: "Take turns on one device.",              color: "#3B82F6" },
};

function QuizSelectInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const mode         = searchParams.get("mode") ?? "solo";
  const meta         = MODE_META[mode] ?? MODE_META["solo"];

  const [quizzes,    setQuizzes]    = useState<Quiz[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [subjectF,   setSubjectF]   = useState("ALL");
  const [diffF,      setDiffF]      = useState("ALL");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quiz")
        .select(`id, title, difficulty, count, time_limit, subjects!quiz_subject_id_fkey(name)`)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      setQuizzes(((data ?? []) as any[]).map(q => ({
        id: q.id,
        title: q.title,
        subject_name: (q.subjects as any)?.name ?? "General",
        difficulty: q.difficulty ?? "MEDIUM",
        count: q.count ?? 0,
        time_limit: q.time_limit ?? null,
      })));
      setLoading(false);
    }
    load();
  }, []);

  const allSubjects = Array.from(new Set(quizzes.map(q => q.subject_name))).sort();

  const filtered = quizzes.filter(q => {
    const matchSearch  = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.subject_name.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectF === "ALL" || q.subject_name === subjectF;
    const matchDiff    = diffF    === "ALL" || q.difficulty  === diffF;
    return matchSearch && matchSubject && matchDiff;
  });

  function selectQuiz(quiz: Quiz) {
    const base = `/student/play/${mode === "vs-ai" ? "vs-ai" : mode === "solo" ? "speed-blitz" : mode === "challenge" ? "challenge" : "pass-and-play"}`;
    router.push(`${base}?quizId=${quiz.id}&quizTitle=${encodeURIComponent(quiz.title)}`);
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-2 rounded-xl hover:bg-[#F0F4FA] text-[#7A869A] transition-colors">
          <ChevronLeft size={18}/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{meta.emoji}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: meta.color }}>
              {meta.title}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#1A2035]">Pick a Quiz</h1>
          <p className="text-sm text-[#7A869A]">{meta.desc}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
        </div>
        <div className="relative">
          <select value={subjectF} onChange={e => setSubjectF(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none appearance-none">
            <option value="ALL">All Subjects</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
        </div>
        <div className="relative">
          <select value={diffF} onChange={e => setDiffF(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none appearance-none">
            <option value="ALL">All Levels</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
        </div>
      </div>

      {/* Quiz list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <BookOpen size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No quizzes found</p>
          <p className="text-xs text-[#7A869A] mt-1">Try different filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(quiz => {
            const ds = DIFFICULTY_STYLE[quiz.difficulty] ?? DIFFICULTY_STYLE.MEDIUM;
            return (
              <button key={quiz.id} onClick={() => selectQuiz(quiz)}
                className="text-left bg-white rounded-2xl border-2 border-[#E8EDF5] p-5 hover:border-[#FF6B35] hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFF7F4] text-[#FF6B35] shrink-0">
                    <BookOpen size={18}/>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: ds.bg, color: ds.color }}>
                    {quiz.difficulty}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#1A2035] mb-1 leading-snug">{quiz.title}</p>
                <p className="text-[10px] text-[#7A869A] mb-3">{quiz.subject_name}</p>
                <div className="flex items-center gap-3 text-[10px] text-[#7A869A]">
                  <span className="flex items-center gap-1"><Target size={10}/> {quiz.count} questions</span>
                  {quiz.time_limit && <span className="flex items-center gap-1"><Clock size={10}/> {quiz.time_limit} min</span>}
                </div>
                <div className="mt-4 w-full py-2 rounded-xl text-center text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: meta.color }}>
                  Play this quiz →
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuizSelectPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>}>
      <QuizSelectInner/>
    </Suspense>
  );
}

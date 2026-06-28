"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Loader2, BookOpen, Search, ChevronDown, X, User2,
  BarChart2, HelpCircle, School, Clock, CheckCircle,
  TrendingUp, Play, ChevronRight, Filter, ExternalLink,
  Zap, Target, Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface QuizEntry {
  id: string;
  title: string;
  subjectId: string | null;
  subjectName: string;
  class_no: string | null;
  topic: string | null;
  subtopic: string | null;
  difficulty: string | null;
  count: number;
  source: string | null;
  creation_type: string | null;
  teacher_id: string | null;
  creatorName: string | null;
  created_at: string;
  assignmentCount: number;
  attemptCount: number;
  avgScore: number | null;
  avgPerformance: number | null;
}

interface QuizQuestion {
  id: string; question: string; options: string[]; answer: string[]; explanation?: string;
}

interface AttemptStat {
  assignment_id: string; score: number; performance: number; correct_count: number; time_taken: number;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6", Science: "#10B981", English: "#8B5CF6",
  Hindi: "#F59E0B", "Social Studies": "#EC4899", Physics: "#6366F1",
  Chemistry: "#14B8A6", Biology: "#84CC16",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── Quiz Preview Panel ─────────────────────────────────────────────────── */
function QuizPreviewPanel({ quiz, onClose }: { quiz: QuizEntry; onClose: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [attempts, setAttempts] = useState<AttemptStat[]>([]);

  useEffect(() => {
    setLoadingQ(true);
    setQuestions([]);
    setAttempts([]);
    // Single RPC replaces: question fetch + assignment fetch + attempts fetch (was 2 sequential round-trips)
    createClient()
      .rpc("get_quiz_panel_data", { p_quiz_id: quiz.id })
      .then(({ data }) => {
        if (data) {
          setQuestions((data.questions ?? []) as QuizQuestion[]);
          setAttempts((data.attempts ?? []) as AttemptStat[]);
        }
        setLoadingQ(false);
      });
  }, [quiz.id]);

  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length) : null;
  const avgPerf  = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.performance ?? 0), 0) / attempts.length) : null;
  const passRate = attempts.length > 0 ? Math.round((attempts.filter(a => (a.performance ?? 0) >= 50).length / attempts.length) * 100) : null;
  const avgTime  = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.time_taken ?? 0), 0) / attempts.length) : null;

  const color = SUBJECT_COLORS[quiz.subjectName] ?? "#7A869A";
  const ds = DIFF_STYLE[quiz.difficulty ?? "MEDIUM"] ?? DIFF_STYLE.MEDIUM;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8EDF5] bg-white shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FFF7F4] text-[#FF6B35]">
            <HelpCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1A2035] truncate">{quiz.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{quiz.subjectName}</span>
              {quiz.class_no && <span className="text-[10px] text-[#7A869A] bg-[#F0F4FA] px-2 py-0.5 rounded-full">Class {quiz.class_no}</span>}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={ds}>{quiz.difficulty ?? "—"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035] shrink-0"><X size={16} /></button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Questions", value: quiz.count },
            { label: "Assignments", value: quiz.assignmentCount },
            { label: "Total Attempts", value: attempts.length > 0 ? attempts.length : quiz.attemptCount },
            { label: "Created", value: new Date(quiz.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) },
          ].map(m => (
            <div key={m.label} className="bg-[#F8FAFC] rounded-xl p-3">
              <div className="text-base font-bold text-[#1A2035]">{m.value ?? "—"}</div>
              <div className="text-[10px] text-[#7A869A]">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: quiz.source === "CMS" ? "#FF6B35" : "#8B5CF6" }}>
            {quiz.source === "CMS" ? "CMS" : initials(quiz.creatorName)}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#1A2035]">
              {quiz.source === "CMS" ? "CMS Content Team" : (quiz.creatorName ?? "Unknown Teacher")}
            </div>
            <div className="text-[10px] text-[#7A869A]">
              {quiz.source === "CMS" ? "Centrally created" : "School teacher"} · {quiz.creation_type ?? "Manual"}
            </div>
          </div>
          <div className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: quiz.source === "CMS" ? "#FFF7F4" : "#F5F3FF", color: quiz.source === "CMS" ? "#FF6B35" : "#8B5CF6" }}>
            {quiz.source ?? "SCHOOL"}
          </div>
        </div>

        {/* Topic */}
        {(quiz.topic || quiz.subtopic) && (
          <div className="text-[10px] text-[#7A869A] flex flex-wrap gap-2">
            {quiz.topic && <span className="bg-[#F0F4FA] px-2.5 py-1 rounded-full font-semibold text-[#475569]">📌 {quiz.topic}</span>}
            {quiz.subtopic && <span className="bg-[#F0F4FA] px-2.5 py-1 rounded-full">› {quiz.subtopic}</span>}
          </div>
        )}

        {/* Analytics */}
        {attempts.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Results & Analytics</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", icon: <Target size={13}/>, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Pass Rate", value: passRate !== null ? `${passRate}%` : "—", icon: <CheckCircle size={13}/>, color: "#10B981", bg: "#ECFDF5" },
                { label: "Avg Performance", value: avgPerf !== null ? `${avgPerf}%` : "—", icon: <TrendingUp size={13}/>, color: "#8B5CF6", bg: "#F5F3FF" },
                { label: "Avg Time", value: avgTime !== null ? `${Math.round(avgTime/60)}m ${avgTime%60}s` : "—", icon: <Clock size={13}/>, color: "#F59E0B", bg: "#FFFBEB" },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3 flex items-center gap-2" style={{ background: m.bg }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <div>
                    <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[9px] text-[#7A869A]">{m.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Score distribution bar */}
            <div className="mt-3 bg-[#F8FAFC] rounded-xl p-3">
              <div className="text-[10px] font-bold text-[#7A869A] mb-2">Score Distribution</div>
              {[
                { label: "90–100%", count: attempts.filter(a => a.score >= 90).length, color: "#10B981" },
                { label: "70–89%",  count: attempts.filter(a => a.score >= 70 && a.score < 90).length, color: "#3B82F6" },
                { label: "50–69%",  count: attempts.filter(a => a.score >= 50 && a.score < 70).length, color: "#F59E0B" },
                { label: "< 50%",   count: attempts.filter(a => a.score < 50).length, color: "#EF4444" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] text-[#7A869A] w-14 shrink-0">{b.label}</span>
                  <div className="flex-1 h-2 bg-[#E8EDF5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${attempts.length > 0 ? (b.count / attempts.length) * 100 : 0}%`, background: b.color }} />
                  </div>
                  <span className="text-[9px] font-bold text-[#1A2035] w-6 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-[#F8FAFC] rounded-xl">
            <BarChart2 size={22} className="text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-xs text-[#7A869A]">No attempt data yet</p>
            <p className="text-[10px] text-[#CBD5E1] mt-0.5">Results appear after students attempt assignments</p>
          </div>
        )}

        {/* Questions */}
        <div>
          <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">
            Questions ({questions.length})
          </div>
          {loadingQ ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[#FF6B35]" /></div>
          ) : questions.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#7A869A]">No questions found</div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, qi) => (
                <div key={q.id} className="bg-white rounded-xl border border-[#E8EDF5] overflow-hidden">
                  <div className="px-3 py-2 bg-[#FFF7F4] border-b border-[#F0F4FA] flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#FF6B35]">Q{qi + 1}</span>
                    <p className="text-[11px] font-semibold text-[#1A2035] flex-1">{q.question}</p>
                  </div>
                  <div className="px-3 py-2 grid grid-cols-2 gap-1">
                    {(q.options ?? []).map((opt, oi) => {
                      const correct = (q.answer ?? []).includes(opt);
                      return (
                        <div key={oi} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px]"
                          style={{ background: correct ? "#F0FDF4" : "#F8FAFC", color: correct ? "#166534" : "#7A869A",
                            border: `1px solid ${correct ? "#A7F3D0" : "#F0F4FA"}` }}>
                          <span className="font-bold shrink-0">{String.fromCharCode(65+oi)}.</span>
                          <span className={correct ? "font-semibold" : ""}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="px-3 pb-2 text-[9px] text-[#7A869A] italic">{q.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function CmsCoveragePage() {
  const [quizzes,       setQuizzes]       = useState<QuizEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterClass,   setFilterClass]   = useState("ALL");
  const [filterSource,  setFilterSource]  = useState("ALL");
  const [filterDiff,    setFilterDiff]    = useState("ALL");
  const [selected,      setSelected]      = useState<QuizEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Single RPC replaces: 3 separate queries + client-side joining
    const { data, error } = await createClient().rpc("get_quiz_coverage");
    if (error) { toast.error("Failed to load coverage data"); setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched: QuizEntry[] = ((data ?? []) as any[]).map(q => ({
      id: q.id, title: q.title,
      subjectId: q.subject_id, subjectName: q.subject_name ?? "General",
      class_no: q.class_no, topic: q.topic, subtopic: q.subtopic,
      difficulty: q.difficulty, count: q.count ?? 0,
      source: q.source, creation_type: q.creation_type,
      teacher_id: q.teacher_id, creatorName: q.creator_name ?? null,
      created_at: q.created_at,
      assignmentCount: Number(q.assignment_count ?? 0),
      attemptCount: Number(q.attempt_count ?? 0),
      avgScore: q.avg_score !== null ? Math.round(Number(q.avg_score)) : null,
      avgPerformance: q.avg_performance !== null ? Math.round(Number(q.avg_performance)) : null,
    }));

    setQuizzes(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived
  const subjects = Array.from(new Set(quizzes.map(q => q.subjectName))).sort();
  const classes   = Array.from(new Set(quizzes.map(q => q.class_no).filter(Boolean))).sort((a, b) => (+a!) - (+b!));

  const filtered = quizzes.filter(q => {
    if (filterSubject !== "ALL" && q.subjectName !== filterSubject) return false;
    if (filterClass !== "ALL" && q.class_no !== filterClass) return false;
    if (filterSource !== "ALL" && (q.source ?? "SCHOOL") !== filterSource) return false;
    if (filterDiff !== "ALL" && q.difficulty !== filterDiff) return false;
    if (search) {
      const s = search.toLowerCase();
      return q.title.toLowerCase().includes(s) ||
        q.subjectName.toLowerCase().includes(s) ||
        (q.topic ?? "").toLowerCase().includes(s) ||
        (q.creatorName ?? "").toLowerCase().includes(s);
    }
    return true;
  });

  const totalAttempts = quizzes.reduce((s, q) => s + q.attemptCount, 0);
  const totalAssign   = quizzes.reduce((s, q) => s + q.assignmentCount, 0);
  const totalQ        = quizzes.reduce((s, q) => s + q.count, 0);

  return (
    <div className="flex gap-5 animate-fadeIn" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* ─── Main ─── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Quiz Coverage & Analytics</h1>
          <p className="text-sm text-[#7A869A]">All quizzes — creator, assignments, and student results</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] animate-pulse">
                <div className="w-8 h-8 bg-[#F0F4FA] rounded-xl mb-3"/>
                <div className="h-5 bg-[#F0F4FA] rounded w-1/2 mb-1.5"/>
                <div className="h-3 bg-[#F8FAFC] rounded w-2/3"/>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Quizzes",     value: quizzes.length,   icon: <HelpCircle size={16}/>, color: "#FF6B35", bg: "#FFF7F4" },
              { label: "Total Questions",   value: totalQ,           icon: <BookOpen size={16}/>,   color: "#3B82F6", bg: "#EFF6FF" },
              { label: "Assigned (times)",  value: totalAssign,      icon: <School size={16}/>,     color: "#10B981", bg: "#ECFDF5" },
              { label: "Student Attempts",  value: totalAttempts,    icon: <Award size={16}/>,      color: "#8B5CF6", bg: "#F5F3FF" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                <div className="text-xl font-bold text-[#1A2035]">{s.value.toLocaleString()}</div>
                <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search quiz title, topic, creator…"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:border-[#FF6B35]" />
            </div>
            <Sel value={filterSubject} onChange={setFilterSubject}>
              <option value="ALL">All Subjects</option>
              {subjects.map(s => <option key={s}>{s}</option>)}
            </Sel>
            <Sel value={filterClass} onChange={setFilterClass}>
              <option value="ALL">All Classes</option>
              {classes.map(c => <option key={c!} value={c!}>Class {c}</option>)}
            </Sel>
            <Sel value={filterSource} onChange={setFilterSource}>
              <option value="ALL">All Sources</option>
              <option value="CMS">CMS</option>
              <option value="SCHOOL">School</option>
            </Sel>
            <Sel value={filterDiff} onChange={setFilterDiff}>
              <option value="ALL">All Levels</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </Sel>
            {(search || filterSubject !== "ALL" || filterClass !== "ALL" || filterSource !== "ALL" || filterDiff !== "ALL") && (
              <button onClick={() => { setSearch(""); setFilterSubject("ALL"); setFilterClass("ALL"); setFilterSource("ALL"); setFilterDiff("ALL"); }}
                className="flex items-center gap-1 h-9 px-3 rounded-xl border border-dashed border-[#E8EDF5] text-xs text-[#7A869A] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors">
                <X size={11}/> Reset
              </button>
            )}
            <span className="ml-auto text-xs text-[#7A869A] flex items-center gap-1"><Filter size={11}/>{filtered.length} quizzes</span>
          </div>
        </div>

        {/* Quiz table */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          {loading ? (
            <>
              <div className="grid px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
                style={{ gridTemplateColumns: "1fr 90px 70px 70px 100px 80px 70px 50px" }}>
                {["Quiz","Subject","Class","Difficulty","Creator","Assigned","Attempts","Avg"].map(h => <span key={h}>{h}</span>)}
              </div>
              <div className="divide-y divide-[#F0F4FA]">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="grid px-5 py-3.5 items-center gap-3 animate-pulse"
                    style={{ gridTemplateColumns: "1fr 90px 70px 70px 100px 80px 70px 50px" }}>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-[#F0F4FA] rounded w-3/4"/>
                      <div className="h-2.5 bg-[#F8FAFC] rounded w-1/2"/>
                    </div>
                    {[70,50,60,80,45,40,35].map((w,j) => (
                      <div key={j} className="h-3 bg-[#F0F4FA] rounded" style={{ width: `${w}%` }}/>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
              <div className="text-sm font-semibold text-[#1A2035]">No quizzes found</div>
              <div className="text-xs text-[#7A869A] mt-1">Adjust filters or add quiz content</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
                style={{ gridTemplateColumns: "1fr 90px 70px 70px 100px 80px 70px 50px" }}>
                <span>Quiz</span>
                <span>Subject</span>
                <span>Class</span>
                <span>Difficulty</span>
                <span>Creator</span>
                <span className="text-right">Assigned</span>
                <span className="text-right">Attempts</span>
                <span className="text-right">Avg</span>
              </div>
              <div className="divide-y divide-[#F0F4FA]">
                {filtered.map(q => {
                  const color = SUBJECT_COLORS[q.subjectName] ?? "#7A869A";
                  const ds = DIFF_STYLE[q.difficulty ?? "MEDIUM"] ?? DIFF_STYLE.MEDIUM;
                  const isSelected = selected?.id === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelected(isSelected ? null : q)}
                      className="grid px-5 py-3 items-center cursor-pointer hover:bg-[#F8FAFC] group transition-colors"
                      style={{
                        gridTemplateColumns: "1fr 90px 70px 70px 100px 80px 70px 50px",
                        background: isSelected ? "#FFF7F4" : undefined,
                      }}
                    >
                      {/* Title */}
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-[#1A2035] truncate group-hover:text-[#FF6B35] transition-colors">{q.title}</p>
                        <p className="text-[10px] text-[#7A869A] truncate">
                          {q.count} Qs{q.topic ? ` · ${q.topic}` : ""}
                        </p>
                      </div>
                      {/* Subject */}
                      <div>
                        <span className="text-[10px] font-semibold truncate block" style={{ color }}>{q.subjectName}</span>
                      </div>
                      {/* Class */}
                      <div>
                        <span className="text-[10px] text-[#7A869A]">{q.class_no ? `Class ${q.class_no}` : "—"}</span>
                      </div>
                      {/* Difficulty */}
                      <div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={ds}>{q.difficulty ?? "—"}</span>
                      </div>
                      {/* Creator */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{ background: q.source === "CMS" ? "#FF6B35" : "#8B5CF6" }}>
                          {q.source === "CMS" ? <Zap size={10}/> : <User2 size={10}/>}
                        </div>
                        <span className="text-[10px] text-[#475569] truncate">
                          {q.source === "CMS" ? "CMS" : (q.creatorName ?? "Teacher")}
                        </span>
                      </div>
                      {/* Assigned */}
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1A2035]">{q.assignmentCount}</span>
                      </div>
                      {/* Attempts */}
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1A2035]">{q.attemptCount}</span>
                      </div>
                      {/* Avg score */}
                      <div className="text-right">
                        {q.avgScore !== null ? (
                          <span className="text-xs font-bold"
                            style={{ color: q.avgScore >= 70 ? "#10B981" : q.avgScore >= 50 ? "#F59E0B" : "#EF4444" }}>
                            {q.avgScore}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#CBD5E1]">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Preview panel ─── */}
      {selected && (
        <div className="w-96 shrink-0 bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden flex flex-col sticky top-5"
          style={{ maxHeight: "calc(100vh - 100px)" }}>
          <QuizPreviewPanel quiz={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

/* ─── Select helper ──────────────────────────────────────────────────────── */
function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 pl-3 pr-7 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
    </div>
  );
}

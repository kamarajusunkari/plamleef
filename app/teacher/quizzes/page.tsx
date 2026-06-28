"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Search, Zap, Plus, BookOpen, Clock, ChevronRight, CheckCircle,
  Loader2, Trash2, X, AlertCircle, GripVertical, Sparkles, Edit3,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyAUYOGSSmb0dodnN5cg0SWCxNf55JQG2Lo";
const GEMINI_MODEL   = "gemini-2.5-flash-lite";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Tab        = "LIBRARY" | "EDUBATTLE" | "CREATE_MANUAL" | "CREATE_AI";

// 5 Games (not modes — modes like VS AI / Pass & Play are chosen in-game by the student)
const ALL_GAME_MODES = [
  { key:"speed-blitz",  label:"⚡ Speed Blitz" },
  { key:"tug-of-war",   label:"🪢 Tug of War" },
  { key:"challenge",    label:"⚔️ Challenge" },
  { key:"practice",     label:"🧘 Practice" },
  { key:"tournament",   label:"🏆 Tournament" },
];

const DIFF_STYLES: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};

interface QuizRow {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  count: number;
  time: number;
  created_at: string;
  source: string | null;
  subject: { name: string } | null;
}
interface ClassOption   { id: string; name: string; section: string }
interface SubjectOption { id: string; name: string }
interface MCQQuestion {
  id: string;
  question: string;
  options: string[];   // exactly 4
  answer: string;      // correct option text
  explanation: string;
}

// ─────────────────────────────────────────────
// Gemini AI helper
// ─────────────────────────────────────────────
async function callGemini(params: {
  subject: string; topic: string; grade: string;
  count: number;   difficulty: string;
}): Promise<MCQQuestion[]> {
  const prompt = `You are an expert Indian NCERT curriculum MCQ generator.

Generate EXACTLY ${params.count} multiple-choice questions for:
Subject: ${params.subject}
Topic/Chapter: ${params.topic}
Grade: ${params.grade}
Difficulty: ${params.difficulty}

Rules:
- Each question must have EXACTLY 4 options (A-D)
- Only one correct answer per question
- Questions must be NCERT-curriculum aligned
- Include a concise explanation for the correct answer
- Return ONLY a valid JSON array — no markdown, no extra text

JSON format:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B",
    "explanation": "Because …"
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`);
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI returned an invalid response (no JSON array found).");

  const parsed = JSON.parse(jsonMatch[0]) as {
    question: string; options: string[]; answer: string; explanation?: string;
  }[];
  if (!Array.isArray(parsed)) throw new Error("AI response is not an array.");

  return parsed.map(q => ({
    id:          crypto.randomUUID(),
    question:    q.question,
    options:     q.options,
    answer:      q.answer,
    explanation: q.explanation ?? "",
  }));
}

// ─────────────────────────────────────────────
// Question Editor Modal
// ─────────────────────────────────────────────
function QuestionEditorModal({
  question, onSave, onClose,
}: {
  question?: MCQQuestion;
  onSave: (q: MCQQuestion) => void;
  onClose: () => void;
}) {
  const [text,        setText]        = useState(question?.question    ?? "");
  const [options,     setOptions]     = useState<string[]>(question?.options ?? ["", "", "", ""]);
  const [answer,      setAnswer]      = useState(question?.answer      ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");

  const updateOption = useCallback((idx: number, val: string) => {
    setOptions(prev => {
      const next = [...prev];
      next[idx] = val;
      // If the old correct answer was this option, update it to the new text
      return next;
    });
    // If user edits the currently-selected correct option, sync answer
    setAnswer(prev => {
      if (options[idx] === prev) return val;
      return prev;
    });
  }, [options]);

  const handleSave = () => {
    if (!text.trim())                    { toast.error("Question text is required");   return; }
    if (options.some(o => !o.trim()))    { toast.error("All 4 options are required");  return; }
    if (!answer || !options.includes(answer)) { toast.error("Select the correct answer"); return; }
    onSave({
      id:          question?.id ?? crypto.randomUUID(),
      question:    text.trim(),
      options:     options.map(o => o.trim()),
      answer,
      explanation: explanation.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035]">
            {question ? "Edit Question" : "Add Question"}
          </div>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035] transition-colors p-1 rounded-lg hover:bg-[#F0F4FA]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Question text */}
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
              Question *
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter the question text…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 resize-none transition-shadow"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-2 block">
              Options * — click the circle to mark correct answer
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => opt.trim() && setAnswer(opt.trim())}
                    title="Mark as correct"
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: answer === opt && opt ? "#10B981" : "#D1D5DB",
                      background:  answer === opt && opt ? "#10B981" : "white",
                    }}
                  >
                    {answer === opt && opt && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs font-bold text-[#7A869A] w-5 shrink-0">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 transition-shadow"
                  />
                </div>
              ))}
            </div>
            {answer && (
              <p className="text-[10px] text-[#10B981] mt-1.5 flex items-center gap-1">
                <CheckCircle size={10} /> Correct answer: <strong>{answer}</strong>
              </p>
            )}
          </div>

          {/* Explanation */}
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
              Explanation <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Explain why this answer is correct…"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 resize-none transition-shadow"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#E8EDF5]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#E8EDF5] text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold hover:bg-[#7C3AED] transition-colors"
          >
            {question ? "Save Changes" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared: Question Card
// ─────────────────────────────────────────────
function QuestionCard({
  q, idx, onEdit, onDelete,
}: {
  q: MCQQuestion; idx: number;
  onEdit: (q: MCQQuestion) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5] hover:border-[#D4D4F8] transition-colors group">
      <GripVertical size={14} className="text-[#CBD5E0] mt-0.5 shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[#1A2035] mb-2 leading-relaxed">
          Q{idx + 1}. {q.question}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {q.options.map((opt, oi) => (
            <span
              key={oi}
              className="text-[10px] px-2 py-0.5 rounded-lg font-medium"
              style={{
                background: opt === q.answer ? "#DCFCE7" : "#F0F4FA",
                color:      opt === q.answer ? "#166534" : "#6B7280",
              }}
            >
              {String.fromCharCode(65 + oi)}. {opt}
              {opt === q.answer && " ✓"}
            </span>
          ))}
        </div>
        {q.explanation && (
          <p className="text-[10px] text-[#7A869A] mt-1.5 italic">💡 {q.explanation}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(q)}
          className="p-1.5 text-[#7A869A] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 size={12} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(q.id)}
          className="p-1.5 text-[#7A869A] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EduBattle Library Tab
// ─────────────────────────────────────────────
function EduBattleLibrary({ teacherId, classes }: { teacherId: string; classes: ClassOption[] }) {
  const supabase = createClient();
  const [list,    setList]    = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("quiz")
      .select("id, title, topic, difficulty, count, time, created_at, source, subject:subject_id(name)")
      .eq("quiz_scope", "EDUBATTLE")
      .eq("is_gamezone_eligible", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setList((data ?? []) as unknown as QuizRow[]); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assignToClass(quizId: string, classId: string) {
    setAssigning(quizId);
    const { error } = await supabase.from("assignments").insert({
      quiz_id: quizId, class_id: classId, teacher_id: teacherId,
      title: list.find(q => q.id === quizId)?.title ?? "Assignment",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: "ACTIVE", xp_reward: 50,
    });
    setAssigning(null);
    if (error) { toast.error("Failed to assign"); return; }
    toast.success("✓ Assigned to class!");
  }

  const filtered = list.filter(q =>
    !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (dt: string) => new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#FFF7F4] to-[#FFF3E0] rounded-2xl border border-[#FFD4C2]">
        <div className="text-2xl">🌐</div>
        <div>
          <div className="text-sm font-bold text-[#1A2035]">EduBattle Universal Library</div>
          <div className="text-xs text-[#7A869A]">Expert-curated, NCERT-aligned quizzes. Assign directly to your class.</div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-[#E8EDF5]">
        <Search size={14} className="text-[#7A869A] shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search EduBattle quizzes…"
          className="bg-transparent text-sm outline-none flex-1 text-[#1A2035] placeholder-[#94A3B8]" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <div className="text-3xl mb-3">📚</div>
          <p className="text-sm font-semibold text-[#1A2035]">No EduBattle quizzes yet</p>
          <p className="text-xs text-[#7A869A] mt-1">The EduBattle team is adding quizzes. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(quiz => {
            const diff = DIFF_STYLES[quiz.difficulty] ?? DIFF_STYLES.MEDIUM;
            return (
              <div key={quiz.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] hover:shadow-md hover:border-[#FFD4C2] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">EduBattle</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>{quiz.difficulty}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#1A2035] line-clamp-2">{quiz.title}</div>
                    <div className="text-xs text-[#7A869A] mt-0.5">{quiz.subject?.name ?? "—"} · {quiz.topic}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#7A869A] mb-3">
                  <span><BookOpen size={10} className="inline"/> {quiz.count} questions</span>
                  <span><Clock size={10} className="inline"/> {fmt(quiz.created_at)}</span>
                  <span className="text-[#10B981] font-semibold">🎮 Game Ready</span>
                </div>
                {classes.length > 0 ? (
                  <select
                    disabled={assigning === quiz.id}
                    onChange={e => { if (e.target.value) assignToClass(quiz.id, e.target.value); e.target.value = ""; }}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-xs text-[#1A2035] outline-none"
                  >
                    <option value="">{assigning === quiz.id ? "Assigning…" : "Assign to class →"}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
                  </select>
                ) : (
                  <p className="text-[10px] text-[#7A869A] text-center">No classes assigned to you yet</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Quiz Library Tab
// ─────────────────────────────────────────────
function QuizLibrary({ quizzes, loading }: { quizzes: QuizRow[]; loading: boolean }) {
  const [search,        setSearch]        = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  const subjects = [
    "ALL",
    ...Array.from(new Set(quizzes.map(q => q.subject?.name).filter(Boolean) as string[])),
  ];

  const filtered = quizzes.filter(q => {
    const ms = q.title.toLowerCase().includes(search.toLowerCase())
            || q.topic.toLowerCase().includes(search.toLowerCase());
    const mf = subjectFilter === "ALL" || q.subject?.name === subjectFilter;
    return ms && mf;
  });

  const fmt = (dt: string) =>
    new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-[#E8EDF5] flex-1 max-w-sm">
          <Search size={14} className="text-[#7A869A] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            className="bg-transparent text-sm outline-none flex-1 text-[#1A2035] placeholder-[#94A3B8]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#94A3B8] hover:text-[#1A2035]">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: subjectFilter === s ? "#8B5CF6" : "#F0F4FA",
                color:      subjectFilter === s ? "white"    : "#7A869A",
              }}
            >
              {s === "ALL" ? "All Subjects" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#E8EDF5]">
          <BookOpen size={40} className="text-[#E8EDF5] mb-3" />
          <p className="text-sm font-semibold text-[#1A2035]">No quizzes found</p>
          <p className="text-xs text-[#7A869A] mt-1">Create your first quiz using the tabs above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(quiz => {
            const diff = DIFF_STYLES[quiz.difficulty] ?? DIFF_STYLES.MEDIUM;
            return (
              <div key={quiz.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] hover:shadow-md hover:border-[#D4D4F8] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {quiz.source && (
                      <div className="flex items-center gap-1 mb-1">
                        {quiz.source === "AI" && <Sparkles size={10} className="text-[#8B5CF6]" />}
                        <span className="text-[10px] font-medium text-[#7A869A]">{quiz.source}</span>
                      </div>
                    )}
                    <div className="text-sm font-semibold text-[#1A2035] line-clamp-2">{quiz.title}</div>
                    <div className="text-xs text-[#7A869A] mt-1">
                      {quiz.subject?.name ?? "—"} · {quiz.topic}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg ml-2 shrink-0"
                    style={{ background: diff.bg, color: diff.color }}
                  >
                    {quiz.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#7A869A] mb-4">
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {quiz.count} questions</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {fmt(quiz.created_at)}</span>
                </div>
                <div className="flex items-center justify-end">
                  <Link
                    href="/teacher/assignments/new"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#8B5CF6] text-white rounded-lg text-xs font-semibold hover:bg-[#7C3AED] transition-colors"
                  >
                    Assign <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Manual Quiz Builder Tab
// ─────────────────────────────────────────────
function ManualQuizBuilder({
  teacherId, classes, subjects, onCreated,
}: {
  teacherId: string;
  classes: ClassOption[]; subjects: SubjectOption[];
  onCreated: () => void;
}) {
  const supabase = createClient();

  // ── Form state (all local → no parent re-renders while typing) ──
  const [title,           setTitle]           = useState("");
  const [topic,           setTopic]           = useState("");
  const [selectedClass,   setSelectedClass]   = useState(classes[0]?.id ?? "");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? "");
  const [difficulty,      setDifficulty]      = useState<Difficulty>("MEDIUM");
  const [timePerQ,        setTimePerQ]        = useState(15);
  const [questions,       setQuestions]       = useState<MCQQuestion[]>([]);
  const [editingQ,        setEditingQ]        = useState<MCQQuestion | undefined>();
  const [showEditor,      setShowEditor]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [isGamezone,      setIsGamezone]      = useState(false);
  const [gameModes,       setGameModes]       = useState<string[]>(["speed-blitz","tug-of-war","challenge","practice","tournament"]);
  function toggleMode(key: string) { setGameModes(p => p.includes(key) ? p.filter(m => m !== key) : [...p, key]); }

  const openAddQ  = () => { setEditingQ(undefined); setShowEditor(true); };
  const openEditQ = (q: MCQQuestion) => { setEditingQ(q); setShowEditor(true); };
  const closeEditor = () => { setShowEditor(false); setEditingQ(undefined); };

  const handleSaveQ = (q: MCQQuestion) => {
    setQuestions(prev => {
      const idx = prev.findIndex(x => x.id === q.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = q; return n; }
      return [...prev, q];
    });
    closeEditor();
    toast.success(editingQ ? "Question updated" : "Question added");
  };

  const handleDeleteQ = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast("Question removed", { icon: "🗑️" });
  };

  const handleSave = async (asDraft = false) => {
    if (!title.trim())                      { toast.error("Quiz title is required"); return; }
    if (!topic.trim())                      { toast.error("Topic is required");       return; }
    if (!selectedClass)                     { toast.error("Select a class");           return; }
    if (!selectedSubject)                   { toast.error("Select a subject");         return; }
    if (questions.length === 0 && !asDraft) { toast.error("Add at least one question"); return; }

    setSaving(true);
    try {
      const { data: quiz, error: qErr } = await supabase
        .from("quiz")
        .insert({
          teacher_id:           teacherId,
          class_id:             selectedClass,
          subject_id:           selectedSubject,
          title:                title.trim(),
          topic:                topic.trim(),
          difficulty,
          time:                 timePerQ,
          count:                questions.length,
          source:               "TEACHER",
          creation_type:        "MANUAL",
          quiz_scope:           "SCHOOL",
          is_gamezone_eligible: isGamezone,
          game_level:           "BEGINNER",
          allowed_game_modes:   isGamezone ? gameModes : [],
        })
        .select("id")
        .single();

      if (qErr) throw qErr;

      if (questions.length > 0) {
        const rows = questions.map(q => ({
          quiz_id:     quiz.id,
          question:    q.question,
          options:     q.options,
          answer:      [q.answer],
          type:        "MCQ",
          explanation: q.explanation || null,
        }));
        const { error: qqErr } = await supabase.from("question").insert(rows);
        if (qqErr) throw qqErr;
      }

      toast.success(asDraft ? "Saved as draft!" : "Quiz created successfully!");
      onCreated();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) ?? "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showEditor && (
        <QuestionEditorModal question={editingQ} onSave={handleSaveQ} onClose={closeEditor} />
      )}

      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8EDF5] bg-gradient-to-r from-[#F8FAFC] to-white">
          <h2 className="text-base font-bold text-[#1A2035]">Build Quiz Manually</h2>
          <p className="text-xs text-[#7A869A] mt-0.5">Create a quiz and add your own MCQ questions</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Title + Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Quiz Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Fractions Practice Set"
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Topic / Chapter *
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Fractions, Algebra"
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/40 transition-all"
              />
            </div>
          </div>

          {/* Class + Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Class *
              </label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
              >
                {classes.length === 0
                  ? <option value="">No classes assigned</option>
                  : classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Subject *
              </label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
              >
                {subjects.length === 0
                  ? <option value="">No subjects</option>
                  : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                }
              </select>
            </div>
          </div>

          {/* Difficulty + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={{
                      background:   difficulty === d ? DIFF_STYLES[d].bg    : "white",
                      color:        difficulty === d ? DIFF_STYLES[d].color : "#7A869A",
                      borderColor:  difficulty === d ? DIFF_STYLES[d].color + "50" : "#E8EDF5",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                Time limit — <span className="text-[#8B5CF6]">{timePerQ} min</span>
              </label>
              <input
                type="range" min={5} max={90} step={5} value={timePerQ}
                onChange={e => setTimePerQ(+e.target.value)}
                className="w-full accent-[#8B5CF6] mt-1.5"
              />
              <div className="flex justify-between text-[10px] text-[#7A869A] mt-0.5">
                <span>5 min</span><span>90 min</span>
              </div>
            </div>
          </div>

          {/* Game Zone Toggle */}
          <div className="rounded-2xl border border-[#E8EDF5] p-4 bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#1A2035]">🎮 Enable for Game Zone</div>
                <div className="text-[10px] text-[#7A869A]">Students can use this quiz in all game modes</div>
              </div>
              <button type="button" onClick={() => setIsGamezone(v => !v)}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                style={{ background: isGamezone ? "#10B981" : "#E2E8F0" }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: isGamezone ? "translateX(20px)" : "translateX(0)" }}/>
              </button>
            </div>
            {isGamezone && (
              <div className="mt-3">
                <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Available Games</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GAME_MODES.map(m => (
                    <button key={m.key} type="button" onClick={() => toggleMode(m.key)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                      style={{
                        borderColor: gameModes.includes(m.key) ? "#8B5CF6" : "#E8EDF5",
                        background:  gameModes.includes(m.key) ? "#F5F3FF"  : "white",
                        color:       gameModes.includes(m.key) ? "#8B5CF6"  : "#7A869A",
                      }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="border-t border-[#E8EDF5] pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A2035]">Questions</span>
                {questions.length > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 bg-[#F5F3FF] text-[#8B5CF6] rounded-full">
                    {questions.length} added
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={openAddQ}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F3FF] text-[#8B5CF6] rounded-xl text-xs font-semibold hover:bg-[#EDE9FE] transition-colors"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div
                onClick={openAddQ}
                className="bg-[#F8FAFC] rounded-xl p-10 text-center border-2 border-dashed border-[#E2E8F0] cursor-pointer hover:border-[#8B5CF6]/40 hover:bg-[#F5F3FF]/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-[#8B5CF6]" />
                </div>
                <p className="text-sm font-medium text-[#7A869A]">Click to add your first question</p>
                <p className="text-xs text-[#94A3B8] mt-1">MCQ with 4 options and explanation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    idx={idx}
                    onEdit={openEditQ}
                    onDelete={handleDeleteQ}
                  />
                ))}
                <button
                  type="button"
                  onClick={openAddQ}
                  className="w-full py-3 border-2 border-dashed border-[#E2E8F0] rounded-xl text-xs font-medium text-[#7A869A] hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] hover:bg-[#F5F3FF]/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Another Question
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-[#E8EDF5]">
            <p className="text-xs text-[#7A869A]">
              {questions.length === 0
                ? "Add questions to publish"
                : `${questions.length} question${questions.length > 1 ? "s" : ""} ready`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm font-medium text-[#7A869A] hover:bg-[#F0F4FA] transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving || questions.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Creating…" : `Create Quiz (${questions.length}Q)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// AI Quiz Generator Tab
// ─────────────────────────────────────────────
function AIQuizGenerator({
  teacherId, classes, subjects, onCreated,
}: {
  teacherId: string;
  classes: ClassOption[]; subjects: SubjectOption[];
  onCreated: () => void;
}) {
  const supabase = createClient();

  type AiStep = 1 | 2 | 3 | 4;
  const [aiStep,      setAiStep]      = useState<AiStep>(1);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [genQs,       setGenQs]       = useState<MCQQuestion[]>([]);
  const [editingQ,    setEditingQ]    = useState<MCQQuestion | undefined>();
  const [showEditor,  setShowEditor]  = useState(false);
  const [aiError,     setAiError]     = useState("");
  const [progress,    setProgress]    = useState(0);

  // Form state
  const [subjectId,    setSubjectId]    = useState(subjects[0]?.id ?? "");
  const [classId,      setClassId]      = useState(classes[0]?.id  ?? "");
  const [topic,        setTopic]        = useState("");
  const [grade,        setGrade]        = useState("8");
  const [count,        setCount]        = useState(10);
  const [difficulty,   setDifficulty]   = useState("MEDIUM");
  const [quizTitle,    setQuizTitle]    = useState("");
  const [isGamezone,   setIsGamezone]   = useState(false);
  const [aiGameModes,  setAiGameModes]  = useState<string[]>(["speed-blitz","tug-of-war","challenge","practice","tournament"]);
  function toggleAiMode(key: string) { setAiGameModes(p => p.includes(key) ? p.filter(m => m !== key) : [...p, key]); }

  const subjectName = subjects.find(s => s.id === subjectId)?.name ?? "Unknown";

  // Animate progress bar while generating
  useEffect(() => {
    if (aiStep !== 2) return;
    setProgress(10);
    const t1 = setTimeout(() => setProgress(35), 2000);
    const t2 = setTimeout(() => setProgress(65), 6000);
    const t3 = setTimeout(() => setProgress(85), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [aiStep]);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic first"); return; }
    setAiError("");
    setGenerating(true);
    setProgress(5);
    setAiStep(2);

    try {
      const questions = await callGemini({ subject: subjectName, topic: topic.trim(), grade, count, difficulty });
      setGenQs(questions);
      setQuizTitle(`${subjectName} — ${topic.trim()} (Grade ${grade})`);
      setProgress(100);
      setAiStep(3);
      toast.success(`${questions.length} questions generated! ✨`);
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) ?? "Generation failed";
      setAiError(msg);
      setAiStep(1);
      toast.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAI = async () => {
    if (!quizTitle.trim())    { toast.error("Enter a quiz title");    return; }
    if (genQs.length === 0)   { toast.error("No questions to save");  return; }

    setSaving(true);
    try {
      const { data: quiz, error: qErr } = await supabase
        .from("quiz")
        .insert({
          teacher_id:           teacherId,
          class_id:             classId,
          subject_id:           subjectId,
          title:                quizTitle.trim(),
          topic:                topic.trim(),
          difficulty,
          time:                 30,
          count:                genQs.length,
          source:               "AI",
          creation_type:        "AI_GENERATED",
          quiz_scope:           "SCHOOL",
          is_gamezone_eligible: isGamezone,
          game_level:           "BEGINNER",
          allowed_game_modes:   isGamezone ? aiGameModes : [],
        })
        .select("id")
        .single();

      if (qErr) throw qErr;

      const rows = genQs.map(q => ({
        quiz_id:     quiz.id,
        question:    q.question,
        options:     q.options,
        answer:      [q.answer],
        type:        "MCQ",
        explanation: q.explanation || null,
      }));
      const { error: qqErr } = await supabase.from("question").insert(rows);
      if (qqErr) throw qqErr;

      toast.success("AI quiz saved!");
      setAiStep(4);
      onCreated();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) ?? "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQ = (q: MCQQuestion) => {
    setGenQs(prev => {
      const idx = prev.findIndex(x => x.id === q.id);
      if (idx < 0) return prev;
      const n = [...prev]; n[idx] = q; return n;
    });
    setShowEditor(false);
    setEditingQ(undefined);
  };

  const STEPS = [["1", "Setup"], ["2", "Generating"], ["3", "Review"], ["4", "Done"]];

  return (
    <>
      {showEditor && (
        <QuestionEditorModal
          question={editingQ}
          onSave={handleEditQ}
          onClose={() => { setShowEditor(false); setEditingQ(undefined); }}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8EDF5] bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE]">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-[#8B5CF6]" />
            <h2 className="text-base font-bold text-[#1A2035]">AI Quiz Generator</h2>
          </div>
          <p className="text-xs text-[#6D28D9]">
            Powered by Gemini · {GEMINI_MODEL} · NCERT curriculum aligned
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#F0F4FA] overflow-x-auto">
          {STEPS.map(([num, label], i) => (
            <React.Fragment key={num}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: aiStep > i + 1 ? "#10B981" : aiStep === i + 1 ? "#8B5CF6" : "#F0F4FA",
                    color:      aiStep >= i + 1 ? "white" : "#7A869A",
                  }}
                >
                  {aiStep > i + 1 ? "✓" : num}
                </div>
                <span className="text-xs font-medium hidden sm:block"
                  style={{ color: aiStep === i + 1 ? "#8B5CF6" : "#7A869A" }}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className="flex-1 h-0.5 bg-[#E8EDF5] min-w-4" />}
            </React.Fragment>
          ))}
        </div>

        <div className="p-6">

          {/* ── Step 1: Setup ── */}
          {aiStep === 1 && (
            <div className="space-y-4">
              {aiError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Subject</label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Class</label>
                  <select
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                  Topic / Chapter *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Quadratic Equations, The French Revolution"
                  className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/40 transition-all"
                  onKeyDown={e => e.key === "Enter" && handleGenerate()}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Grade</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                  >
                    {[6,7,8,9,10,11,12].map(g => <option key={g} value={String(g)}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Questions</label>
                  <select
                    value={count}
                    onChange={e => setCount(+e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                  >
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                  >
                    <option value="MIXED">Mixed</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6D28D9] mb-0.5">Gemini AI · {GEMINI_MODEL}</p>
                  <p className="text-xs text-[#7C3AED]">
                    Generates NCERT-aligned MCQs with explanations. Each question includes 4 options and the correct answer.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || generating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap size={16} />
                  Generate with AI
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Generating ── */}
          {aiStep === 2 && (
            <div className="py-16 flex flex-col items-center gap-5">
              <div className="relative w-20 h-20">
                <div className="w-20 h-20 rounded-2xl bg-[#F5F3FF] flex items-center justify-center">
                  <Sparkles size={32} className="text-[#8B5CF6] animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-[#8B5CF6]/30 animate-ping" />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-[#1A2035] mb-1">
                  Generating {count} questions…
                </div>
                <p className="text-xs text-[#7A869A] max-w-xs">
                  Gemini is analyzing NCERT curriculum for <strong className="text-[#1A2035]">{topic}</strong> (Grade {grade})
                </p>
              </div>
              <div className="w-64">
                <div className="w-full h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#94A3B8] text-center mt-2">
                  This typically takes 10–30 seconds…
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {aiStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#10B981]">
                  <CheckCircle size={16} />
                  {genQs.length} questions generated
                </div>
                <button
                  onClick={() => { setAiStep(1); setGenQs([]); }}
                  className="text-xs text-[#8B5CF6] hover:underline flex items-center gap-1"
                >
                  ↺ Regenerate
                </button>
              </div>

              {/* Quiz title input */}
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 transition-all"
                />
              </div>

              {/* Questions list */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {genQs.map((q, i) => (
                  <div key={q.id} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5] hover:border-[#D4D4F8] transition-colors group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-xs font-semibold text-[#1A2035] leading-relaxed flex-1">
                        Q{i + 1}. {q.question}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingQ(q); setShowEditor(true); }}
                          className="p-1.5 text-[#7A869A] hover:text-[#8B5CF6] hover:bg-[#F5F3FF] rounded-lg transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => setGenQs(prev => prev.filter(x => x.id !== q.id))}
                          className="p-1.5 text-[#7A869A] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {q.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs"
                          style={{ color: opt === q.answer ? "#10B981" : "#6B7280" }}>
                          <span
                            className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{
                              borderColor: opt === q.answer ? "#10B981" : "#E5E7EB",
                              background:  opt === q.answer ? "#ECFDF5" : "white",
                            }}
                          >
                            {String.fromCharCode(65 + j)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {opt === q.answer && (
                            <span className="text-[10px] font-semibold text-[#10B981] shrink-0">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-2 text-[10px] text-[#7A869A] bg-white rounded-lg px-2.5 py-1.5 border border-[#E8EDF5]">
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Game Zone Toggle for AI quiz */}
              <div className="rounded-2xl border border-[#E8EDF5] p-4 bg-[#F8FAFC]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#1A2035]">🎮 Enable for Game Zone</div>
                    <div className="text-[10px] text-[#7A869A]">Students can play this quiz in game modes</div>
                  </div>
                  <button type="button" onClick={() => setIsGamezone(v => !v)}
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                    style={{ background: isGamezone ? "#10B981" : "#E2E8F0" }}>
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: isGamezone ? "translateX(20px)" : "translateX(0)" }}/>
                  </button>
                </div>
                {isGamezone && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ALL_GAME_MODES.map(m => (
                      <button key={m.key} type="button" onClick={() => toggleAiMode(m.key)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                        style={{
                          borderColor: aiGameModes.includes(m.key) ? "#8B5CF6" : "#E8EDF5",
                          background:  aiGameModes.includes(m.key) ? "#F5F3FF"  : "white",
                          color:       aiGameModes.includes(m.key) ? "#8B5CF6"  : "#7A869A",
                        }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#E8EDF5]">
                <button
                  onClick={() => { setAiStep(1); setGenQs([]); }}
                  className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSaveAI}
                  disabled={saving || genQs.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : `Save Quiz (${genQs.length}Q) →`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {aiStep === 4 && (
            <div className="py-12 flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#10B981]" />
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#1A2035] mb-1">Quiz Created!</div>
                <p className="text-sm text-[#7A869A]">
                  Your AI-generated quiz is saved and ready to assign to any class.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setAiStep(1); setGenQs([]); setTopic(""); setQuizTitle(""); }}
                  className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
                >
                  Create Another
                </button>
                <Link
                  href="/teacher/assignments/new"
                  className="flex items-center gap-2 px-6 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors"
                >
                  <Zap size={14} /> Assign to Class
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function TeacherQuizzesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const supabase = createClient();

  const [tab,      setTab]      = useState<Tab>("LIBRARY");
  const [quizzes,  setQuizzes]  = useState<QuizRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [classes,  setClasses]  = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user?.teacherId) return;
    setLoading(true);

    const [{ data: quizData }, { data: csData }] = await Promise.all([
      supabase
        .from("quiz")
        .select("id, title, topic, difficulty, count, time, created_at, source, subject:subject_id(name)")
        .eq("teacher_id", user.teacherId)
        .order("created_at", { ascending: false }),
      supabase
        .from("class_subjects")
        .select("class_id, subject_id, classes(id, name, section), subjects(id, name)")
        .eq("teacher_id", user.teacherId),
    ]);

    if (quizData) setQuizzes(quizData as unknown as QuizRow[]);

    if (csData) {
      const seenC = new Set<string>();
      const seenS = new Set<string>();
      const cls: ClassOption[]   = [];
      const subs: SubjectOption[] = [];

      for (const cs of csData) {
        const c = (Array.isArray(cs.classes) ? cs.classes[0] : cs.classes) as { id?: string; name?: string; section?: string } | null;
        const s = (Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects) as { id?: string; name?: string } | null;
        if (c?.id && !seenC.has(c.id)) {
          seenC.add(c.id);
          cls.push({ id: c.id, name: c.name ?? "", section: c.section ?? "" });
        }
        if (s?.id && !seenS.has(s.id)) {
          seenS.add(s.id);
          subs.push({ id: s.id, name: s.name ?? "" });
        }
      }
      setClasses(cls);
      setSubjects(subs);
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teacherId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleQuizCreated = () => {
    setTab("LIBRARY");
    fetchAll();
  };

  // ── Loading skeleton ──
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const TABS: [Tab, string][] = [
    ["LIBRARY",       "📚 My Library"],
    ["EDUBATTLE",     "🌐 EduBattle"],
    ["CREATE_MANUAL", "✏️ Manual Build"],
    ["CREATE_AI",     "✨ AI Generate"],
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Quiz Library</h1>
          <p className="text-sm text-[#7A869A]">
            {loading
              ? "Loading…"
              : `${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""} available`}
          </p>
        </div>
        {tab === "LIBRARY" && !loading && quizzes.length === 0 && (
          <button
            onClick={() => setTab("CREATE_AI")}
            className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors"
          >
            <Sparkles size={14} /> Create with AI
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl w-fit">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background:  tab === t ? "white"    : "transparent",
              color:       tab === t ? "#1A2035"  : "#7A869A",
              boxShadow:   tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — each is its own component, so parent state changes never drop input focus */}
      {tab === "LIBRARY" && (
        <QuizLibrary quizzes={quizzes} loading={loading} />
      )}

      {tab === "EDUBATTLE" && user?.teacherId && (
        <EduBattleLibrary teacherId={user.teacherId} classes={classes} />
      )}

      {tab === "CREATE_MANUAL" && user?.teacherId && (
        <ManualQuizBuilder
          key="manual"
          teacherId={user.teacherId}
          classes={classes}
          subjects={subjects}
          onCreated={handleQuizCreated}
        />
      )}

      {tab === "CREATE_AI" && user?.teacherId && (
        <AIQuizGenerator
          key="ai"
          teacherId={user.teacherId}
          classes={classes}
          subjects={subjects}
          onCreated={handleQuizCreated}
        />
      )}
    </div>
  );
}

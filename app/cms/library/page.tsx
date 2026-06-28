"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Filter, Trash2, ChevronDown, Loader2,
  FileText, Video, Layers, HelpCircle, BookOpen,
  X, ExternalLink, ChevronLeft, ChevronRight,
  RotateCcw, Tag, AlertCircle, Play,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ResourceType = "PDF" | "VIDEO" | "FLASHCARD" | "QUIZ";

interface FlashCard { front: string; back: string }
interface QuizQuestion {
  question: string; options: string[]; answer: string[]; explanation?: string;
}

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  grade: number | null;
  topic: string | null;
  difficulty: string | null;
  tags: string[] | null;
  file_url: string | null;
  created_at: string;
  description: string | null;
  pages: number | null;
  duration: string | null;
  flashcards: FlashCard[] | null;
  quiz_id: string | null;
  created_by: string | null;
  subject: { id: string; name: string } | null;
  quiz: { id: string; title: string } | null;
}

interface Subject { id: string; name: string }
interface TopicOption { topic: string; subtopic: string | null }

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

const TYPE_META: Record<ResourceType, { icon: React.ReactNode; label: string; bg: string; color: string }> = {
  PDF:       { icon: <FileText size={14} />,   label: "PDF",       bg: "#FEF2F2", color: "#EF4444" },
  VIDEO:     { icon: <Video size={14} />,       label: "Video",     bg: "#EFF6FF", color: "#3B82F6" },
  FLASHCARD: { icon: <Layers size={14} />,      label: "Flashcard", bg: "#F5F3FF", color: "#8B5CF6" },
  QUIZ:      { icon: <HelpCircle size={14} />,  label: "Quiz",      bg: "#FFF7F4", color: "#FF6B35" },
};

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

/* ─── Preview Panel ──────────────────────────────────────────────────────── */
function PdfPreview({ url, pages }: { url: string; pages: number | null }) {
  const isPdfFile = url.toLowerCase().endsWith(".pdf") || url.includes("supabase") || url.includes("storage");
  return (
    <div className="flex flex-col h-full">
      {isPdfFile ? (
        <iframe src={url} className="flex-1 w-full rounded-xl border border-[#E8EDF5]" title="PDF Preview" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5]">
          <FileText size={40} className="text-[#EF4444]" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1A2035]">External PDF Link</p>
            {pages && <p className="text-xs text-[#7A869A] mt-0.5">{pages} pages</p>}
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-xl text-sm font-bold hover:bg-[#DC2626]">
            <ExternalLink size={14} /> Open PDF
          </a>
        </div>
      )}
    </div>
  );
}

function VideoPreview({ url }: { url: string }) {
  const youtubeId = url.includes("youtube.com") ? url.split("v=")[1]?.split("&")[0]
    : url.includes("youtu.be") ? url.split("/").pop()?.split("?")[0] : null;

  return youtubeId ? (
    <div className="rounded-xl overflow-hidden border border-[#E8EDF5] aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        className="w-full h-full" allowFullScreen
        title="Video preview"
      />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5] aspect-video">
      <Play size={40} className="text-[#3B82F6]" />
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-xl text-sm font-bold">
        <ExternalLink size={14} /> Open Video
      </a>
    </div>
  );
}

function FlashcardPreview({ cards }: { cards: FlashCard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card */}
      <div
        className="w-full cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative w-full rounded-2xl transition-transform duration-500"
          style={{
            minHeight: 200,
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-[#8B5CF6] bg-white text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-3">Front · click to flip</div>
            <p className="text-sm font-semibold text-[#1A2035]">{card.front || "—"}</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-[#10B981] bg-[#F0FDF4] text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-[9px] font-bold text-[#10B981] uppercase tracking-wider mb-3">Answer</div>
            <p className="text-sm font-semibold text-[#1A2035]">{card.back || "—"}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3 w-full justify-between">
        <button onClick={() => { setIdx(i => Math.max(0, i-1)); setFlipped(false); }}
          disabled={idx === 0}
          className="p-2 rounded-xl border border-[#E8EDF5] text-[#7A869A] disabled:opacity-30 hover:bg-[#F8FAFC]">
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-[#7A869A] font-semibold">
          Card {idx + 1} / {cards.length}
          <button onClick={() => setFlipped(f => !f)} className="ml-3 text-[#8B5CF6] hover:text-[#7C3AED]">
            <RotateCcw size={12} className="inline" /> flip
          </button>
        </span>
        <button onClick={() => { setIdx(i => Math.min(cards.length-1, i+1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          className="p-2 rounded-xl border border-[#E8EDF5] text-[#7A869A] disabled:opacity-30 hover:bg-[#F8FAFC]">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* All cards mini */}
      <div className="w-full grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {cards.map((c, i) => (
          <button key={i} onClick={() => { setIdx(i); setFlipped(false); }}
            className="text-left p-2 rounded-xl border transition-all text-[10px]"
            style={{ borderColor: i === idx ? "#8B5CF6" : "#E8EDF5", background: i === idx ? "#F5F3FF" : "white" }}>
            <div className="font-semibold text-[#1A2035] truncate">{c.front}</div>
            <div className="text-[#7A869A] truncate">{c.back}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizPreview({ quizId }: { quizId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from("question").select("question, options, answer, explanation")
      .eq("quiz_id", quizId)
      .then(({ data }) => { setQuestions((data ?? []) as QuizQuestion[]); setLoading(false); });
  }, [quizId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#FF6B35]"/></div>;
  if (!questions.length) return <div className="text-center py-8 text-xs text-[#7A869A]">No questions found</div>;

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
      {questions.map((q, qi) => (
        <div key={qi} className="bg-white rounded-xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FFF7F4] border-b border-[#E8EDF5]">
            <span className="text-[10px] font-bold text-[#FF6B35]">Q{qi + 1}</span>
            <p className="text-xs font-semibold text-[#1A2035] mt-0.5">{q.question}</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-1.5">
            {(q.options ?? []).map((opt, oi) => {
              const isCorrect = (q.answer ?? []).includes(opt);
              return (
                <div key={oi} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]"
                  style={{ background: isCorrect ? "#F0FDF4" : "#F8FAFC", color: isCorrect ? "#166534" : "#7A869A",
                    border: `1px solid ${isCorrect ? "#A7F3D0" : "#F0F4FA"}` }}>
                  <span className="font-bold shrink-0">{String.fromCharCode(65+oi)}.</span>
                  <span className={isCorrect ? "font-semibold" : ""}>{opt}</span>
                </div>
              );
            })}
          </div>
          {q.explanation && (
            <div className="px-4 pb-3 text-[10px] text-[#7A869A] italic">{q.explanation}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Preview Panel (slide-in) ───────────────────────────────────────────── */
function PreviewPanel({ resource, onClose, onDelete, canDelete }: {
  resource: Resource;
  onClose: () => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const typeMeta = TYPE_META[resource.type] ?? TYPE_META.PDF;
  const subjName = (resource.subject as { name?: string } | null)?.name ?? "General";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#E8EDF5] bg-white shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: typeMeta.bg, color: typeMeta.color }}>
          {typeMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A2035] truncate">{resource.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[10px] font-semibold" style={{ color: SUBJECT_COLORS[subjName] ?? "#7A869A" }}>{subjName}</span>
            {resource.grade && <span className="text-[10px] text-[#7A869A]">· Class {resource.grade}</span>}
            {resource.difficulty && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: DIFF_STYLE[resource.difficulty]?.bg ?? "#F0F4FA", color: DIFF_STYLE[resource.difficulty]?.color ?? "#7A869A" }}>
                {resource.difficulty}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035] shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Meta */}
      {(resource.topic || resource.description || (resource.tags && resource.tags.length > 0)) && (
        <div className="px-5 py-3 border-b border-[#F0F4FA] bg-[#F8FAFC] shrink-0">
          {resource.topic && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#7A869A] mb-1">
              <Tag size={9}/> <span className="font-semibold">{resource.topic}</span>
            </div>
          )}
          {resource.description && (
            <p className="text-[11px] text-[#7A869A] mb-1">{resource.description}</p>
          )}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.map(t => (
                <span key={t} className="text-[9px] bg-[#F0F4FA] text-[#94A3B8] px-1.5 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content preview */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {resource.type === "PDF" && resource.file_url && (
          <PdfPreview url={resource.file_url} pages={resource.pages} />
        )}
        {resource.type === "VIDEO" && resource.file_url && (
          <VideoPreview url={resource.file_url} />
        )}
        {resource.type === "FLASHCARD" && resource.flashcards && resource.flashcards.length > 0 && (
          <FlashcardPreview cards={resource.flashcards} />
        )}
        {resource.type === "QUIZ" && resource.quiz_id && (
          <QuizPreview quizId={resource.quiz_id} />
        )}
        {!resource.file_url && !resource.flashcards && !resource.quiz_id && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertCircle size={24} className="text-[#CBD5E1]" />
            <p className="text-xs text-[#7A869A]">No preview available</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-5 py-3 border-t border-[#E8EDF5] bg-white flex items-center gap-2">
        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F0F4FA] text-[#1A2035] rounded-xl text-xs font-semibold hover:bg-[#E8EDF5] transition-colors">
            <ExternalLink size={12}/> Open original
          </a>
        )}
        <div className="flex-1" />
        {canDelete && (
          <button
            onClick={() => { onDelete(resource.id); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-[#EF4444] hover:bg-[#FEF2F2] rounded-xl text-xs font-semibold transition-colors">
            <Trash2 size={12}/> Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page (inner) ──────────────────────────────────────────────────── */
function LibraryInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "CMS_ADMIN";

  const [resources,      setResources]      = useState<Resource[]>([]);
  const [subjects,       setSubjects]       = useState<Subject[]>([]);
  const [topicOptions,   setTopicOptions]   = useState<TopicOption[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [total,          setTotal]          = useState(0);
  const [page,           setPage]           = useState(0);
  const [typeCounts,     setTypeCounts]     = useState<Record<string, number>>({});
  const [preview,        setPreview]        = useState<Resource | null>(null);

  // Filters — initialise from URL search params
  const [search,          setSearch]          = useState(searchParams.get("search") ?? "");
  const [filterType,      setFilterType]      = useState(searchParams.get("type") ?? "ALL");
  const [filterSubject,   setFilterSubject]   = useState(searchParams.get("subject") ?? "ALL");
  const [filterGrade,     setFilterGrade]     = useState<number | "ALL">(
    searchParams.get("grade") ? Number(searchParams.get("grade")) : "ALL"
  );
  const [filterTopic,     setFilterTopic]     = useState(searchParams.get("topic") ?? "ALL");
  const [filterSubtopic,  setFilterSubtopic]  = useState(searchParams.get("subtopic") ?? "ALL");
  const [filterDifficulty,setFilterDifficulty]= useState(searchParams.get("difficulty") ?? "ALL");

  // Load meta (subjects, topic list, type counts) once
  useEffect(() => {
    const supabase = createClient();
    supabase.from("subjects").select("id,name").order("name").then(({ data }) => {
      if (!data) return;
      const seen = new Set<string>();
      setSubjects(data.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }));
    });
    supabase.from("resource_topics").select("topic,subtopic").order("topic").then(({ data }) => {
      if (data) setTopicOptions(data as TopicOption[]);
    });
    supabase.from("resources").select("type").then(({ data }) => {
      if (!data) return;
      const counts: Record<string, number> = {};
      data.forEach(r => { counts[r.type] = (counts[r.type] ?? 0) + 1; });
      setTypeCounts(counts);
    });
  }, []);

  const fetchResources = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("resources")
      .select(
        `id, title, type, grade, topic, difficulty, tags, file_url, created_at,
         description, pages, duration, flashcards, quiz_id, created_by,
         subject:subject_id(id, name),
         quiz:quiz_id(id, title)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!isAdmin) query = query.eq("created_by", user.id);
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (filterType !== "ALL") query = query.eq("type", filterType);
    if (filterDifficulty !== "ALL") query = query.eq("difficulty", filterDifficulty);
    if (filterGrade !== "ALL") query = query.eq("grade", filterGrade);
    if (filterTopic !== "ALL") query = query.ilike("topic", `%${filterTopic}%`);

    const { data, count, error } = await query;
    if (error) { toast.error("Failed to load resources"); setLoading(false); return; }
    setResources((data ?? []) as unknown as Resource[]);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [page, search, filterType, filterDifficulty, filterGrade, filterTopic, user, isAdmin]);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchResources, 300);
    return () => clearTimeout(debounceRef.current);
  }, [fetchResources]);

  // Client-side subject + subtopic filter (applied on loaded page)
  const filtered = resources.filter(r => {
    const subjName = (r.subject as { name?: string } | null)?.name ?? "";
    if (filterSubject !== "ALL" && subjName !== filterSubject) return false;
    if (filterSubtopic !== "ALL") {
      const topicStr = r.topic ?? "";
      if (!topicStr.toLowerCase().includes(filterSubtopic.toLowerCase())) return false;
    }
    return true;
  });

  async function deleteResource(id: string) {
    const { error } = await createClient().from("resources").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Resource deleted");
    setResources(rs => rs.filter(r => r.id !== id));
    setTotal(t => t - 1);
  }

  function resetFilters() {
    setSearch(""); setFilterType("ALL"); setFilterSubject("ALL");
    setFilterGrade("ALL"); setFilterTopic("ALL"); setFilterSubtopic("ALL");
    setFilterDifficulty("ALL"); setPage(0);
    router.replace("/cms/library");
  }

  const hasFilters = search || filterType !== "ALL" || filterSubject !== "ALL" ||
    filterGrade !== "ALL" || filterTopic !== "ALL" || filterSubtopic !== "ALL" || filterDifficulty !== "ALL";

  const totalAll = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  // Distinct topic names for filter dropdown
  const distinctTopics = Array.from(new Set(topicOptions.map(t => t.topic))).sort();
  // Subtopics filtered by selected topic
  const distinctSubtopics = filterTopic !== "ALL"
    ? Array.from(new Set(topicOptions.filter(t => t.topic === filterTopic && t.subtopic).map(t => t.subtopic!))).sort()
    : Array.from(new Set(topicOptions.filter(t => t.subtopic).map(t => t.subtopic!))).sort();

  return (
    <div className="flex gap-5 animate-fadeIn" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* ─── Main content ─── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A2035]">Content Library</h1>
            <p className="text-sm text-[#7A869A]">{totalAll.toLocaleString()} resources · click any row to preview</p>
          </div>
          <Link href="/cms/upload"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors">
            + Upload Content
          </Link>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PDF", "VIDEO", "FLASHCARD", "QUIZ"] as const).map(t => {
            const meta = t !== "ALL" ? TYPE_META[t] : null;
            const count = t === "ALL" ? totalAll : (typeCounts[t] ?? 0);
            const active = filterType === t;
            return (
              <button key={t} onClick={() => { setFilterType(t); setPage(0); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
                style={{
                  background: active ? (meta?.color ?? "#1A2035") : "white",
                  color: active ? "white" : (meta?.color ?? "#7A869A"),
                  borderColor: active ? "transparent" : "#E8EDF5",
                }}>
                {meta && <span style={{ color: active ? "white" : meta.color }}>{meta.icon}</span>}
                {t === "ALL" ? "All" : meta?.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? "rgba(255,255,255,0.25)" : "#F0F4FA", color: active ? "white" : "#7A869A" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5] space-y-3">
          {/* Row 1: search + subject + grade */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by title…"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:border-[#FF6B35]" />
            </div>
            <DropSelect label="All Subjects" value={filterSubject} onChange={v => { setFilterSubject(v); setPage(0); }}>
              <option value="ALL">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </DropSelect>
            <DropSelect label="All Classes" value={String(filterGrade)} onChange={v => { setFilterGrade(v === "ALL" ? "ALL" : +v); setPage(0); }}>
              <option value="ALL">All Classes</option>
              {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
            </DropSelect>
          </div>
          {/* Row 2: topic + subtopic + difficulty + reset */}
          <div className="flex flex-wrap gap-2 items-center">
            <DropSelect label="All Topics" value={filterTopic} onChange={v => { setFilterTopic(v); setFilterSubtopic("ALL"); setPage(0); }}>
              <option value="ALL">All Topics</option>
              {distinctTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </DropSelect>
            <DropSelect label="All Subtopics" value={filterSubtopic} onChange={v => { setFilterSubtopic(v); setPage(0); }}>
              <option value="ALL">All Subtopics</option>
              {distinctSubtopics.map(s => <option key={s} value={s}>{s}</option>)}
            </DropSelect>
            <DropSelect label="All Levels" value={filterDifficulty} onChange={v => { setFilterDifficulty(v); setPage(0); }}>
              <option value="ALL">All Levels</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </DropSelect>
            {hasFilters && (
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-[#E8EDF5] text-xs text-[#7A869A] hover:border-[#EF4444] hover:text-[#EF4444] transition-colors">
                <X size={11}/> Reset
              </button>
            )}
            <span className="ml-auto text-xs text-[#7A869A] flex items-center gap-1"><Filter size={11}/>{filtered.length} shown</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={32} className="text-[#CBD5E1] mx-auto mb-3" />
              <div className="text-sm font-semibold text-[#1A2035]">No resources found</div>
              <div className="text-xs text-[#7A869A] mt-1">Try adjusting filters or upload new content</div>
              {hasFilters && (
                <button onClick={resetFilters} className="mt-3 text-xs text-[#FF6B35] underline">Clear all filters</button>
              )}
            </div>
          ) : (
            <>
              {/* Col headers */}
              <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider">
                <div className="col-span-1">Type</div>
                <div className="col-span-4">Title / Topic</div>
                <div className="col-span-2">Subject</div>
                <div className="col-span-1">Class</div>
                <div className="col-span-1">Level</div>
                <div className="col-span-2">Added</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-[#F0F4FA]">
                {filtered.map(r => {
                  const typeMeta = TYPE_META[r.type] ?? TYPE_META.PDF;
                  const subjName = (r.subject as { name?: string } | null)?.name ?? "General";
                  const diff = r.difficulty ?? "MEDIUM";
                  const ds = DIFF_STYLE[diff] ?? DIFF_STYLE.MEDIUM;
                  const isSelected = preview?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setPreview(isSelected ? null : r)}
                      className="grid grid-cols-12 gap-3 px-5 py-3 items-center cursor-pointer transition-colors group"
                      style={{ background: isSelected ? "#FFF7F4" : undefined }}
                    >
                      <div className="col-span-1">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl"
                          style={{ background: typeMeta.bg, color: typeMeta.color }}>
                          {typeMeta.icon}
                        </span>
                      </div>
                      <div className="col-span-4 min-w-0">
                        <div className="text-xs font-semibold text-[#1A2035] truncate group-hover:text-[#FF6B35] transition-colors">{r.title}</div>
                        {r.topic && <div className="text-[10px] text-[#7A869A] truncate flex items-center gap-1"><Tag size={8}/>{r.topic}</div>}
                        {r.tags && r.tags.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {r.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[9px] bg-[#F0F4FA] text-[#94A3B8] px-1.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-semibold" style={{ color: SUBJECT_COLORS[subjName] ?? "#7A869A" }}>{subjName}</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-[10px] text-[#7A869A]">{r.grade ? `Class ${r.grade}` : "—"}</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: ds.bg, color: ds.color }}>{diff}</span>
                      </div>
                      <div className="col-span-2 text-[10px] text-[#7A869A]">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <span className="text-[10px] text-[#FF6B35] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Preview →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#7A869A]">Page {page+1} of {Math.ceil(total/PAGE_SIZE)} · {total} total</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] disabled:opacity-40 hover:bg-[#F8FAFC]">
                ← Prev
              </button>
              <button onClick={() => setPage(p => p+1)} disabled={(page+1)*PAGE_SIZE >= total}
                className="px-3 py-1.5 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] disabled:opacity-40 hover:bg-[#F8FAFC]">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Preview panel ─── */}
      {preview && (
        <div className="w-96 shrink-0 bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden flex flex-col sticky top-5"
          style={{ maxHeight: "calc(100vh - 100px)" }}>
          <PreviewPanel
            resource={preview}
            onClose={() => setPreview(null)}
            onDelete={deleteResource}
            canDelete={isAdmin || preview.created_by === user?.id}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Reusable select helper ─────────────────────────────────────────────── */
function DropSelect({ label: _, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 pl-3 pr-7 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
    </div>
  );
}

/* ─── Page export (wrapped in Suspense for useSearchParams) ──────────────── */
export default function CmsLibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
      </div>
    }>
      <LibraryInner />
    </Suspense>
  );
}

"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, FileText, Video, Layers, HelpCircle,
  Bookmark, BookmarkCheck, Download, Play, Eye, Zap,
  ChevronDown, Loader2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type ResourceType = "PDF" | "VIDEO" | "FLASHCARD" | "QUIZ";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  grade: number | null;
  topic: string | null;
  difficulty: string | null;
  tags: string[] | null;
  learning_purpose: string[] | null;
  description: string | null;
  file_url: string | null;
  flashcards: { front: string; back: string }[] | null;
  created_at: string;
  subject: { id: string; name: string } | null;
}

const TYPE_META: Record<ResourceType, { icon: React.ReactNode; label: string; bg: string; color: string; action: string }> = {
  PDF:       { icon: <FileText size={16} />,   label: "PDF",       bg: "#FEF2F2", color: "#EF4444", action: "Open" },
  VIDEO:     { icon: <Video size={16} />,       label: "Video",     bg: "#EFF6FF", color: "#3B82F6", action: "Watch" },
  FLASHCARD: { icon: <Layers size={16} />,      label: "Flashcard", bg: "#F5F3FF", color: "#8B5CF6", action: "Study" },
  QUIZ:      { icon: <HelpCircle size={16} />,  label: "Quiz",      bg: "#FFF7F4", color: "#FF6B35", action: "Start" },
};

const DIFF_META: Record<string, { label: string; bg: string; color: string }> = {
  EASY:   { label: "Easy",   bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { label: "Medium", bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { label: "Hard",   bg: "#FEE2E2", color: "#991B1B" },
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6", Science: "#10B981", English: "#8B5CF6",
  Hindi: "#F59E0B", "Social Studies": "#EC4899", Physics: "#6366F1",
  Chemistry: "#14B8A6", Biology: "#84CC16",
};

const GRADE_OPTIONS = ["All Grades", "6", "7", "8", "9", "10", "11", "12"];

// ── Flashcard modal ────────────────────────────────────────────────────────────
function FlashcardModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const cards = resource.flashcards ?? [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="text-sm text-[#7A869A] mb-4">No flashcards in this set.</div>
        <button onClick={onClose} className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold">Close</button>
      </div>
    </div>
  );

  const card = cards[idx];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1A2035]">{resource.title}</h2>
          <button onClick={onClose}><X size={18} className="text-[#7A869A]" /></button>
        </div>
        <div className="text-[11px] text-[#7A869A] text-center">
          Card {idx + 1} of {cards.length} · Click to flip
        </div>
        <div
          className="relative h-48 rounded-2xl cursor-pointer select-none"
          onClick={() => setFlipped(f => !f)}
          style={{
            background: flipped
              ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
              : "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
            transition: "background 0.3s",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-center font-semibold text-base" style={{ color: flipped ? "white" : "#1A2035" }}>
              {flipped ? card.back : card.front}
            </p>
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: flipped ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.15)", color: flipped ? "rgba(255,255,255,0.7)" : "#8B5CF6" }}>
            {flipped ? "Back" : "Front"}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
            disabled={idx === 0}
            className="px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#7A869A] disabled:opacity-40">
            ← Prev
          </button>
          <div className="flex gap-1">
            {cards.map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === idx ? "#8B5CF6" : "#E8EDF5" }} />
            ))}
          </div>
          <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
            disabled={idx === cards.length - 1}
            className="px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#7A869A] disabled:opacity-40">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Video modal ────────────────────────────────────────────────────────────────
function VideoModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const url = resource.file_url ?? "";
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYT) {
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) embedUrl = `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black rounded-2xl overflow-hidden w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A2035]">
          <span className="text-white text-sm font-semibold truncate">{resource.title}</span>
          <button onClick={onClose}><X size={18} className="text-white/60 hover:text-white" /></button>
        </div>
        {isYT ? (
          <div className="aspect-video">
            <iframe src={embedUrl} allow="autoplay; fullscreen" className="w-full h-full" />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-[#0A1628]">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-[#FF6B35] text-white rounded-xl font-semibold">
              <Play size={18} /> Open Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 18;

export default function StudentResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPurpose, setFilterPurpose] = useState("ALL");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterGrade, setFilterGrade] = useState("All Grades");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [flashcardRes, setFlashcardRes] = useState<Resource | null>(null);
  const [videoRes, setVideoRes] = useState<Resource | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let q = supabase
      .from("resources")
      .select(
        `id, title, type, grade, topic, difficulty, tags, learning_purpose, description, file_url, flashcards, created_at,
         subject:subject_id ( id, name )`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (filterType !== "ALL") q = q.eq("type", filterType);
    if (filterDiff !== "ALL") q = q.eq("difficulty", filterDiff);
    if (filterPurpose !== "ALL") q = q.contains("learning_purpose", [filterPurpose]);
    if (filterGrade !== "All Grades") q = q.eq("grade", parseInt(filterGrade));

    const { data, count, error } = await q;
    if (error) { toast.error("Could not load resources"); setLoading(false); return; }

    let rows = (data ?? []) as unknown as Resource[];
    if (filterSubject !== "ALL") {
      rows = rows.filter(r => (r.subject as { name?: string } | null)?.name === filterSubject);
    }

    setResources(rows);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [page, search, filterType, filterDiff, filterGrade, filterSubject, filterPurpose]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => {
      if (data) {
        const seen = new Set<string>();
        setSubjects(data.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }));
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchResources, 300);
    return () => clearTimeout(t);
  }, [fetchResources]);

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = { ...prev, [id]: !prev[id] };
      toast.success(next[id] ? "Saved to your library" : "Removed from saved");
      return next;
    });
  };

  const savedCount = Object.values(saved).filter(Boolean).length;

  function handleOpen(r: Resource) {
    if (r.type === "VIDEO") { setVideoRes(r); return; }
    if (r.type === "FLASHCARD") { setFlashcardRes(r); return; }
    if (r.type === "QUIZ") { toast("Quiz mode coming soon!"); return; }
    if (r.file_url) { window.open(r.file_url, "_blank"); return; }
    toast("No file available for this resource.");
  }

  const types: ("ALL" | ResourceType)[] = ["ALL", "PDF", "VIDEO", "FLASHCARD", "QUIZ"];

  return (
    <div className="space-y-5 animate-fadeIn">
      {flashcardRes && <FlashcardModal resource={flashcardRes} onClose={() => setFlashcardRes(null)} />}
      {videoRes && <VideoModal resource={videoRes} onClose={() => setVideoRes(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Study Resources</h1>
          <p className="text-sm text-[#7A869A]">PDFs, videos, flashcards & quizzes uploaded for your class</p>
        </div>
        {savedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#FF6B35] font-semibold bg-[#FFF7F4] px-3 py-1.5 rounded-xl border border-[#FFD5C2]">
            <Bookmark size={12} /> {savedCount} saved
          </div>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {types.map(t => {
          const meta = t !== "ALL" ? TYPE_META[t] : null;
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => { setFilterType(t); setPage(0); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={{
                background: active ? (meta?.color ?? "#1A2035") : "white",
                color: active ? "white" : (meta?.color ?? "#7A869A"),
                borderColor: active ? "transparent" : "#E8EDF5",
              }}
            >
              {meta && <span style={{ color: active ? "white" : meta.color }}>{meta.icon}</span>}
              {t === "ALL" ? "All" : meta?.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-[#F8FAFC] border border-[#E8EDF5] rounded-xl px-3 h-9">
          <Search size={14} className="text-[#7A869A] shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by title or topic..."
            className="flex-1 text-sm bg-transparent outline-none text-[#1A2035] placeholder-[#94A3B8]"
          />
        </div>
        <div className="relative">
          <select
            value={filterSubject}
            onChange={e => { setFilterSubject(e.target.value); setPage(0); }}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterGrade}
            onChange={e => { setFilterGrade(e.target.value); setPage(0); }}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none"
          >
            {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterDiff}
            onChange={e => { setFilterDiff(e.target.value); setPage(0); }}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none"
          >
            <option value="ALL">All Levels</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
        </div>
        
        <div className="relative">
          <select
            value={filterPurpose}
            onChange={e => { setFilterPurpose(e.target.value); setPage(0); }}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none"
          >
            <option value="ALL">All Purposes</option>
            <option value="Exam Prep">Exam Prep</option>
            <option value="Revision">Revision</option>
            <option value="Deep Dive">Deep Dive</option>
            <option value="Animation">Animation</option>
            <option value="Practice">Practice</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
        </div>

        <span className="text-[11px] text-[#7A869A] ml-auto">{total} resources</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm font-semibold text-[#1A2035] mb-1">No resources found</div>
          <div className="text-xs text-[#7A869A]">Try adjusting your filters or check back later</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(r => {
              const meta = TYPE_META[r.type] ?? TYPE_META.PDF;
              const subjName = (r.subject as { name?: string } | null)?.name ?? "General";
              const subjColor = SUBJECT_COLORS[subjName] ?? "#7A869A";
              const diff = r.difficulty ? DIFF_META[r.difficulty] : null;
              const isSaved = saved[r.id] ?? false;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden hover:shadow-md transition-all group"
                >
                  {/* Top accent */}
                  <div className="h-1" style={{ background: meta.color }} />

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1A2035] line-clamp-2 leading-snug">
                          {r.title}
                        </div>
                        <div className="text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span style={{ color: subjColor }} className="font-semibold">{subjName}</span>
                          {r.grade && <span className="text-[#94A3B8]">· Grade {r.grade}</span>}
                          {r.topic && <span className="text-[#94A3B8] truncate">· {r.topic}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      {diff && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: diff.bg, color: diff.color }}>
                          {diff.label}
                        </span>
                      )}
                      {r.type === "FLASHCARD" && r.flashcards && (
                        <span className="text-[10px] text-[#7A869A]">
                          🃏 {r.flashcards.length} cards
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p className="text-[11px] text-[#7A869A] line-clamp-2 mb-3">{r.description}</p>
                    )}

                    
                    {r.learning_purpose && r.learning_purpose.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {r.learning_purpose.map(tag => (
                          <span key={tag} className="text-[9px] bg-[#F3E8FF] text-[#7E22CE] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Tags */}

                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] bg-[#F0F4FA] text-[#94A3B8] px-1.5 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Added date */}
                    <div className="text-[10px] text-[#94A3B8] mb-3">
                      Added {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpen(r)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: meta.color }}
                      >
                        {r.type === "VIDEO" ? <><Play size={11} /> {meta.action}</> :
                         r.type === "FLASHCARD" ? <><Layers size={11} /> {meta.action}</> :
                         r.type === "QUIZ" ? <><Zap size={11} /> {meta.action}</> :
                         <><Eye size={11} /> {meta.action}</>}
                      </button>
                      <button
                        onClick={() => toggleSave(r.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#E8EDF5] hover:bg-[#F8FAFC] transition-colors shrink-0"
                      >
                        {isSaved
                          ? <BookmarkCheck size={15} className="text-[#FF6B35]" />
                          : <Bookmark size={15} className="text-[#7A869A]" />}
                      </button>
                      {r.type !== "VIDEO" && r.file_url && (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#E8EDF5] hover:bg-[#F8FAFC] transition-colors shrink-0"
                        >
                          <Download size={15} className="text-[#7A869A]" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#7A869A]">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] disabled:opacity-40">
                  ← Prev
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                  className="px-3 py-1.5 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

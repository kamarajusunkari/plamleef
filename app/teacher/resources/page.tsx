"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, FileText, Video, Layers, HelpCircle,
  Download, Play, Eye, Globe, Lock, Filter,
  ChevronDown, Loader2, X, Zap, Plus, Upload,
  Trash2, MoreHorizontal,
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
  description: string | null;
  file_url: string | null;
  flashcards: { front: string; back: string }[] | null;
  visibility: string | null;
  created_at: string;
  subject: { id: string; name: string } | null;
}

interface Subject { id: string; name: string }

const TYPE_META: Record<ResourceType, { icon: React.ReactNode; label: string; bg: string; color: string }> = {
  PDF:       { icon: <FileText size={16} />,   label: "PDF",       bg: "#FEF2F2", color: "#EF4444" },
  VIDEO:     { icon: <Video size={16} />,       label: "Video",     bg: "#EFF6FF", color: "#3B82F6" },
  FLASHCARD: { icon: <Layers size={16} />,      label: "Flashcard", bg: "#F5F3FF", color: "#8B5CF6" },
  QUIZ:      { icon: <HelpCircle size={16} />,  label: "Quiz",      bg: "#FFF7F4", color: "#FF6B35" },
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
const PAGE_SIZE = 18;

// ── Flashcard preview modal ────────────────────────────────────────────────────
function FlashcardModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const cards = resource.flashcards ?? [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (cards.length === 0) return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="text-sm text-[#7A869A] mb-4">No flashcards in this set.</div>
        <button onClick={onClose} className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold">Close</button>
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
        <div className="text-[11px] text-[#7A869A] text-center">Card {idx + 1} of {cards.length} · Click to flip</div>
        <div
          className="relative h-48 rounded-2xl cursor-pointer select-none"
          onClick={() => setFlipped(f => !f)}
          style={{ background: flipped ? "linear-gradient(135deg,#8B5CF6,#6D28D9)" : "linear-gradient(135deg,#F5F3FF,#EDE9FE)", transition: "background 0.3s" }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-center font-semibold text-base" style={{ color: flipped ? "white" : "#1A2035" }}>
              {flipped ? card.back : card.front}
            </p>
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)", color: flipped ? "rgba(255,255,255,0.7)" : "#8B5CF6" }}>
            {flipped ? "Back" : "Front"}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0}
            className="px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#7A869A] disabled:opacity-40">
            ← Prev
          </button>
          <div className="flex gap-1">
            {cards.map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? "#8B5CF6" : "#E8EDF5" }} />)}
          </div>
          <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cards.length - 1}
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
          <div className="aspect-video"><iframe src={embedUrl} allow="autoplay; fullscreen" className="w-full h-full" /></div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-[#0A1628]">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold">
              <Play size={18} /> Open Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TeacherResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterGrade, setFilterGrade] = useState("All Grades");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [flashcardRes, setFlashcardRes] = useState<Resource | null>(null);
  const [videoRes, setVideoRes] = useState<Resource | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Upload panel state
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadGrade, setUploadGrade] = useState("");
  const [uploadChapter, setUploadChapter] = useState("");
  const [uploadTopic, setUploadTopic] = useState("");
  const [uploadSubtopic, setUploadSubtopic] = useState("");
  const [uploadBoard, setUploadBoard] = useState("CBSE");
  const [uploadLanguage, setUploadLanguage] = useState("English");
  const [uploadDifficulty, setUploadDifficulty] = useState("EASY");
  const [uploadSource, setUploadSource] = useState("Teacher Upload");
  const [uploadIsPremium, setUploadIsPremium] = useState(false);
  const [learningPurpose, setLearningPurpose] = useState<string[]>([]);
  const [contentStyle, setContentStyle] = useState<string[]>([]);
  const [learningOutcome, setLearningOutcome] = useState<string[]>([]);


  const fetchResources = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("resources")
      .select(
        `id, title, type, grade, topic, difficulty, tags, description, file_url, flashcards, visibility, created_at,
         subject:subject_id ( id, name )`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (filterType !== "ALL") q = q.eq("type", filterType);
    if (filterDiff !== "ALL") q = q.eq("difficulty", filterDiff);
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
  }, [page, search, filterType, filterDiff, filterGrade, filterSubject]);

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

  async function handleUpload() {
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error("Title and file are required");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = uploadFile.name.split(".").pop();
    const path = `teacher/${Date.now()}-${uploadFile.name}`;
    const { error: storageErr } = await supabase.storage.from("resources").upload(path, uploadFile);
    if (storageErr) { toast.error("Upload failed: " + storageErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);

    const subjObj = subjects.find(s => s.name === uploadSubject);
    const { error: dbErr } = await supabase.from("resources").insert({
      title: uploadTitle,
      type: "PDF",
      subject_id: subjObj?.id ?? null,
      grade: uploadGrade ? parseInt(uploadGrade) : null,
      chapter: uploadChapter || null,
      topic: uploadTopic || null,
      subtopic: uploadSubtopic || null,
      board: uploadBoard || null,
      language: uploadLanguage || null,
      difficulty: uploadDifficulty || null,
      source_origin: uploadSource || null,
      is_premium: uploadIsPremium,
      status: "PUBLISHED",
      file_url: urlData.publicUrl,
      visibility: "TEACHER",
      learning_purpose: learningPurpose,
      content_style: contentStyle,
      learning_outcome: learningOutcome,
    });
    if (dbErr) { toast.error("Save failed: " + dbErr.message); setUploading(false); return; }
    toast.success("Resource uploaded successfully!");
    setUploading(false);
    setShowUpload(false);
    setUploadFile(null); setUploadTitle(""); setUploadSubject(""); setUploadGrade("");
    setUploadChapter(""); setUploadTopic(""); setUploadSubtopic("");
    setUploadBoard("CBSE"); setUploadLanguage("English"); setUploadDifficulty("EASY"); setUploadSource("Teacher Upload"); setUploadIsPremium(false);
    setLearningPurpose([]); setContentStyle([]); setLearningOutcome([]);
    fetchResources();
  }

  async function deleteResource(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Resource deleted");
    setResources(rs => rs.filter(r => r.id !== id));
    setTotal(t => t - 1);
    setActiveMenu(null);
  }

  async function pushToStudents(id: string, title: string) {
    const supabase = createClient();
    const { error } = await supabase.from("resources").update({ visibility: "SCHOOL" }).eq("id", id);
    if (error) { toast.error("Push failed: " + error.message); return; }
    toast.success(`"${title}" published to student library!`);
    setResources(rs => rs.map(r => r.id === id ? { ...r, visibility: "SCHOOL" } : r));
    setActiveMenu(null);
  }

  function handleOpen(r: Resource) {
    if (r.type === "VIDEO") { setVideoRes(r); return; }
    if (r.type === "FLASHCARD") { setFlashcardRes(r); return; }
    if (r.type === "QUIZ") { toast("Quiz mode coming soon!"); return; }
    if (r.file_url) { window.open(r.file_url, "_blank"); return; }
    toast("No file available.");
  }

  const types: ("ALL" | ResourceType)[] = ["ALL", "PDF", "VIDEO", "FLASHCARD", "QUIZ"];

  return (
    <div className="flex gap-6 h-full animate-fadeIn">
      {flashcardRes && <FlashcardModal resource={flashcardRes} onClose={() => setFlashcardRes(null)} />}
      {videoRes && <VideoModal resource={videoRes} onClose={() => setVideoRes(null)} />}

      {/* Left sidebar */}
      <aside className="w-60 shrink-0 space-y-4">
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={13} className="text-[#8B5CF6]" />
            <span className="text-sm font-bold text-[#1A2035]">Filters</span>
          </div>

          {/* Type */}
          <div className="mb-4">
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Content Type</div>
            {types.map(t => {
              const meta = t !== "ALL" ? TYPE_META[t] : null;
              const active = filterType === t;
              return (
                <button key={t} onClick={() => { setFilterType(t); setPage(0); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-0.5 transition-all"
                  style={{ background: active ? "#F5F3FF" : "transparent", color: active ? "#8B5CF6" : "#7A869A", fontWeight: active ? 600 : 400 }}>
                  {meta && <span style={{ color: active ? "#8B5CF6" : meta.color }}>{meta.icon}</span>}
                  {t === "ALL" ? "All Types" : meta?.label}
                </button>
              );
            })}
          </div>

          {/* Subject */}
          <div className="border-t border-[#E8EDF5] pt-4 mb-4">
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Subject</div>
            <button onClick={() => { setFilterSubject("ALL"); setPage(0); }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs mb-0.5 transition-all"
              style={{ background: filterSubject === "ALL" ? "#F5F3FF" : "transparent", color: filterSubject === "ALL" ? "#8B5CF6" : "#7A869A", fontWeight: filterSubject === "ALL" ? 600 : 400 }}>
              All Subjects
            </button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => { setFilterSubject(s.name); setPage(0); }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs mb-0.5 transition-all truncate"
                style={{ background: filterSubject === s.name ? "#F5F3FF" : "transparent", color: filterSubject === s.name ? "#8B5CF6" : "#7A869A", fontWeight: filterSubject === s.name ? 600 : 400 }}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Grade */}
          <div className="border-t border-[#E8EDF5] pt-4 mb-4">
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Grade</div>
            {GRADE_OPTIONS.map(g => (
              <button key={g} onClick={() => { setFilterGrade(g); setPage(0); }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs mb-0.5 transition-all"
                style={{ background: filterGrade === g ? "#F5F3FF" : "transparent", color: filterGrade === g ? "#8B5CF6" : "#7A869A", fontWeight: filterGrade === g ? 600 : 400 }}>
                {g}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="border-t border-[#E8EDF5] pt-4">
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Difficulty</div>
            {["ALL", "EASY", "MEDIUM", "HARD"].map(d => (
              <button key={d} onClick={() => { setFilterDiff(d); setPage(0); }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs mb-0.5 transition-all"
                style={{ background: filterDiff === d ? "#F5F3FF" : "transparent", color: filterDiff === d ? "#8B5CF6" : "#7A869A", fontWeight: filterDiff === d ? 600 : 400 }}>
                {d === "ALL" ? "All Levels" : d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="border-t border-[#E8EDF5] pt-3 mt-3">
            <div className="text-[10px] text-[#7A869A] mb-1">{total} resources found</div>
            <button onClick={() => { setFilterSubject("ALL"); setFilterType("ALL"); setFilterGrade("All Grades"); setFilterDiff("ALL"); setSearch(""); setPage(0); }}
              className="text-xs text-[#8B5CF6] hover:underline">
              Clear all filters
            </button>
          </div>
        </div>

        {/* Stats box */}
        <div className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-2xl p-4 text-white">
          <div className="text-xs font-bold mb-3 opacity-80">Library Summary</div>
          <div className="space-y-2">
            {(["PDF", "VIDEO", "FLASHCARD", "QUIZ"] as ResourceType[]).map(t => (
              <div key={t} className="flex items-center gap-2">
                <span style={{ color: TYPE_META[t].color, background: TYPE_META[t].bg }} className="w-6 h-6 rounded-lg flex items-center justify-center">
                  {TYPE_META[t].icon}
                </span>
                <span className="text-xs opacity-80 flex-1">{TYPE_META[t].label}s</span>
                <span className="text-xs font-bold">—</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-[#E8EDF5] flex-1">
            <Search size={14} className="text-[#7A869A] shrink-0" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search resources by title or topic..."
              className="bg-transparent text-sm outline-none flex-1 text-[#1A2035] placeholder-[#94A3B8]" />
          </div>
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 bg-[#8B5CF6] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#7C3AED] transition-colors shrink-0">
            <Plus size={16} /> Upload Resource
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1A2035]">Upload PDF Resource</h3>
              <button onClick={() => setShowUpload(false)}><X size={16} className="text-[#7A869A]" /></button>
            </div>
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer"
              style={{ borderColor: dragOver ? "#8B5CF6" : "#E8EDF5", background: dragOver ? "#F5F3FF" : "#F8FAFC" }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, "")); } }}
              onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept=".pdf"; i.onchange = e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, "")); } }; i.click(); }}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={20} className="text-[#EF4444]" />
                  <span className="text-sm font-semibold text-[#1A2035]">{uploadFile.name}</span>
                  <span className="text-xs text-[#7A869A]">({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-[#8B5CF6] mx-auto mb-2" />
                  <div className="text-sm font-semibold text-[#1A2035] mb-1">Drop PDF here or click to browse</div>
                  <div className="text-xs text-[#7A869A]">Max 50 MB · PDF only</div>
                </>
              )}
            </div>
            {/* Metadata — full required fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Title *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 — Photosynthesis Notes" className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Board *</label>
                <div className="relative">
                  <select value={uploadBoard} onChange={e => setUploadBoard(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    {["CBSE","ICSE","IGCSE","State Board","IB","NIOS","Other"].map(b => <option key={b}>{b}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Language</label>
                <div className="relative">
                  <select value={uploadLanguage} onChange={e => setUploadLanguage(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    {["English","Hindi","Telugu","Tamil","Kannada","Marathi","Other"].map(l => <option key={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Subject *</label>
                <div className="relative">
                  <select value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Class *</label>
                <div className="relative">
                  <select value={uploadGrade} onChange={e => setUploadGrade(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    <option value="">Select class</option>
                    {["1","2","3","4","5","6","7","8","9","10","11","12"].map(g => <option key={g} value={g}>Class {g}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Chapter *</label>
                <input value={uploadChapter} onChange={e => setUploadChapter(e.target.value)}
                  placeholder="e.g. Life Processes" className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Topic *</label>
                <input value={uploadTopic} onChange={e => setUploadTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis" className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Subtopic</label>
                <input value={uploadSubtopic} onChange={e => setUploadSubtopic(e.target.value)}
                  placeholder="e.g. Chlorophyll & Light Reaction" className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Difficulty</label>
                <div className="relative">
                  <select value={uploadDifficulty} onChange={e => setUploadDifficulty(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    <option value="EASY">Beginner (Easy)</option>
                    <option value="MEDIUM">Intermediate</option>
                    <option value="HARD">Advanced (Hard)</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Source</label>
                <div className="relative">
                  <select value={uploadSource} onChange={e => setUploadSource(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none">
                    {["Teacher Upload","YouTube","PalmLeef","External Website","Government","Publisher"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Premium</label>
                <button type="button" onClick={() => setUploadIsPremium(!uploadIsPremium)}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: uploadIsPremium ? "#F59E0B" : "#E2E8F0" }}>
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: uploadIsPremium ? "translateX(20px)" : "translateX(0)" }}/>
                </button>
                <span className="text-xs text-[#7A869A]">{uploadIsPremium ? "Premium" : "Free"}</span>
              </div>
            </div>

              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Learning Purpose</label>
                  <input className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" placeholder="e.g. Exam Prep" onKeyDown={e => {
                    if(e.key === 'Enter') { e.preventDefault(); e.currentTarget.value.split(',').forEach(v=>{v=v.trim();if(v&&!learningPurpose.includes(v))setLearningPurpose(p=>[...p,v])}); e.currentTarget.value=''; }
                  }} />
                  <div className="flex flex-wrap gap-1 mt-1">{learningPurpose.map(p => <span key={p} className="text-[10px] bg-[#F3E8FF] text-[#7E22CE] px-1.5 py-0.5 rounded-md">{p} <button onClick={()=>setLearningPurpose(learningPurpose.filter(x=>x!==p))}>×</button></span>)}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Content Style</label>
                  <input className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" placeholder="e.g. Lecture" onKeyDown={e => {
                    if(e.key === 'Enter') { e.preventDefault(); e.currentTarget.value.split(',').forEach(v=>{v=v.trim();if(v&&!contentStyle.includes(v))setContentStyle(p=>[...p,v])}); e.currentTarget.value=''; }
                  }} />
                  <div className="flex flex-wrap gap-1 mt-1">{contentStyle.map(p => <span key={p} className="text-[10px] bg-[#E0F2FE] text-[#0369A1] px-1.5 py-0.5 rounded-md">{p} <button onClick={()=>setContentStyle(contentStyle.filter(x=>x!==p))}>×</button></span>)}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1">Learning Outcome</label>
                  <input className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20" placeholder="e.g. Memorize" onKeyDown={e => {
                    if(e.key === 'Enter') { e.preventDefault(); e.currentTarget.value.split(',').forEach(v=>{v=v.trim();if(v&&!learningOutcome.includes(v))setLearningOutcome(p=>[...p,v])}); e.currentTarget.value=''; }
                  }} />
                  <div className="flex flex-wrap gap-1 mt-1">{learningOutcome.map(p => <span key={p} className="text-[10px] bg-[#DCFCE7] text-[#15803D] px-1.5 py-0.5 rounded-md">{p} <button onClick={()=>setLearningOutcome(learningOutcome.filter(x=>x!==p))}>×</button></span>)}</div>
                </div>
              </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowUpload(false)}
                className="px-4 py-2 rounded-xl border border-[#E8EDF5] text-sm text-[#7A869A] font-semibold hover:bg-[#F8FAFC]">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading}
                className="flex items-center gap-2 px-5 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold hover:bg-[#7C3AED] disabled:opacity-60 transition-colors">
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload</>}
              </button>
            </div>
          </div>
        )}

        {/* Resources grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8EDF5]">
            <div className="text-4xl mb-3">📂</div>
            <div className="text-sm font-semibold text-[#1A2035] mb-1">No resources found</div>
            <div className="text-xs text-[#7A869A] mb-4">Try adjusting filters or upload a new resource</div>
            <button onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold hover:bg-[#7C3AED]">
              <Plus size={13} /> Upload Resource
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {resources.map(r => {
                const meta = TYPE_META[r.type] ?? TYPE_META.PDF;
                const subjName = (r.subject as { name?: string } | null)?.name ?? "General";
                const subjColor = SUBJECT_COLORS[subjName] ?? "#7A869A";
                const diff = r.difficulty ? DIFF_META[r.difficulty] : null;
                const isGlobal = r.visibility === "ALL" || r.visibility === "PUBLIC";

                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden hover:shadow-md transition-all group">
                    <div className="h-1" style={{ background: meta.color }} />
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: meta.bg, color: meta.color }}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {r.visibility === "TEACHER" ? (
                              <span className="text-[9px] font-bold text-[#F59E0B] bg-[#FEF3C7] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Lock size={7} /> Private
                              </span>
                            ) : isGlobal ? (
                              <span className="text-[9px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Globe size={7} /> Library
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#F5F3FF] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Lock size={7} /> School
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-[#1A2035] line-clamp-2 leading-snug">{r.title}</div>
                        </div>
                        {/* Menu */}
                        <div className="relative shrink-0">
                          <button onClick={() => setActiveMenu(activeMenu === r.id ? null : r.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#7A869A] hover:bg-[#F0F4FA] rounded-lg transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                          {activeMenu === r.id && (
                            <div className="absolute right-0 top-7 z-10 bg-white border border-[#E8EDF5] rounded-xl shadow-lg py-1 min-w-[130px]">
                              {r.visibility === "TEACHER" && (
                                <button onClick={() => pushToStudents(r.id, r.title)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1A2035] hover:bg-[#F8FAFC]">
                                  <Zap size={11} /> Share with Class
                                </button>
                              )}
                              {r.file_url && (
                                <a href={r.file_url || "#"} target="_blank" rel="noopener noreferrer"
                                  onClick={() => setActiveMenu(null)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#1A2035] hover:bg-[#F8FAFC]">
                                  <Eye size={11} /> Open
                                </a>
                              )}
                              <button onClick={() => deleteResource(r.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#EF4444] hover:bg-[#FEF2F2]">
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="text-[10px] mb-2 flex flex-wrap items-center gap-1.5">
                        <span style={{ color: subjColor }} className="font-semibold">{subjName}</span>
                        {r.grade && <span className="text-[#94A3B8]">· Grade {r.grade}</span>}
                        {r.topic && <span className="text-[#94A3B8] truncate">· {r.topic}</span>}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
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
                          <span className="text-[10px] text-[#7A869A]">🃏 {r.flashcards.length} cards</span>
                        )}
                      </div>

                      {/* Description */}
                      {r.description && (
                        <p className="text-[11px] text-[#7A869A] line-clamp-2 mb-3">{r.description}</p>
                      )}

                      {/* Tags */}
                      {r.tags && r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {r.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] bg-[#F0F4FA] text-[#94A3B8] px-1.5 py-0.5 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] text-[#94A3B8] mb-3">
                        Added {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => handleOpen(r)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: meta.color }}>
                          {r.type === "VIDEO" ? <><Play size={11} /> Watch</> :
                           r.type === "FLASHCARD" ? <><Layers size={11} /> Preview</> :
                           r.type === "QUIZ" ? <><Zap size={11} /> Preview</> :
                           <><Eye size={11} /> Open</>}
                        </button>
                        <button onClick={() => pushToStudents(r.id, r.title)}
                          disabled={r.visibility !== "TEACHER"}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-[#E8EDF5] text-[#8B5CF6] hover:bg-[#F5F3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          <Zap size={11} /> {r.visibility === "TEACHER" ? "Share" : "Shared"}
                        </button>
                        {r.type !== "VIDEO" && r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#E8EDF5] hover:bg-[#F8FAFC] shrink-0">
                            <Download size={14} className="text-[#7A869A]" />
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
    </div>
  );
}

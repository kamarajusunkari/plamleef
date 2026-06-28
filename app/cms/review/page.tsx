"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, BookOpen, Loader2, Clock,
  Eye, FileText, Video, Layers, HelpCircle, X,
  ExternalLink, ChevronLeft, ChevronRight, RotateCcw,
  Tag, AlertCircle, User2, Play,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface FlashCard { front: string; back: string }
interface QuizQuestion { question: string; options: string[]; answer: string[]; explanation?: string }

type ResourceRow = {
  id: string;
  title: string;
  type: string;
  grade: number | null;
  topic: string | null;
  difficulty: string | null;
  description: string | null;
  created_at: string;
  visibility: string;
  file_url: string | null;
  pages: number | null;
  duration: string | null;
  flashcards: FlashCard[] | null;
  quiz_id: string | null;
  created_by: string | null;
  subject: { name: string } | null;
  uploaderName: string;
};

/* ─── Style maps ─────────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  PDF:       { icon: <FileText size={14}/>,   bg: "#EFF6FF", color: "#3B82F6" },
  VIDEO:     { icon: <Video size={14}/>,       bg: "#FEF9C3", color: "#854D0E" },
  FLASHCARD: { icon: <Layers size={14}/>,      bg: "#F5F3FF", color: "#8B5CF6" },
  NOTES:     { icon: <FileText size={14}/>,    bg: "#ECFDF5", color: "#10B981" },
  QUIZ:      { icon: <HelpCircle size={14}/>,  bg: "#FFF7F4", color: "#FF6B35" },
};

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};

const VIS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_REVIEW: { bg: "#FFFBEB", color: "#F59E0B", label: "Pending" },
  PUBLIC:         { bg: "#ECFDF5", color: "#10B981", label: "Approved" },
  REJECTED:       { bg: "#FEF2F2", color: "#EF4444", label: "Rejected" },
  PRIVATE:        { bg: "#F0F4FA", color: "#7A869A", label: "Private" },
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6", Science: "#10B981", English: "#8B5CF6",
  Hindi: "#F59E0B", "Social Studies": "#EC4899", Physics: "#6366F1",
  Chemistry: "#14B8A6", Biology: "#84CC16",
};

/* ─── Inline preview components ─────────────────────────────────────────── */
function PdfPreview({ url, pages }: { url: string; pages: number | null }) {
  const isStorageUrl = url.includes("supabase") || url.toLowerCase().endsWith(".pdf");
  return isStorageUrl ? (
    <iframe src={url} className="w-full rounded-xl border border-[#E8EDF5]" style={{ height: 360 }} title="PDF" />
  ) : (
    <div className="flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5] py-10">
      <FileText size={36} className="text-[#EF4444]" />
      {pages && <p className="text-xs text-[#7A869A]">{pages} pages</p>}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-xl text-xs font-bold">
        <ExternalLink size={12}/> Open PDF
      </a>
    </div>
  );
}

function VideoPreview({ url }: { url: string }) {
  const ytId = url.includes("youtube.com") ? url.split("v=")[1]?.split("&")[0]
    : url.includes("youtu.be") ? url.split("/").pop()?.split("?")[0] : null;
  return ytId ? (
    <div className="rounded-xl overflow-hidden border border-[#E8EDF5] aspect-video">
      <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen title="Video"/>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] rounded-xl border border-[#E8EDF5] py-10">
      <Play size={36} className="text-[#3B82F6]"/>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-xl text-xs font-bold">
        <ExternalLink size={12}/> Open Video
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
      <div className="w-full cursor-pointer" style={{ perspective: "1000px" }} onClick={() => setFlipped(f => !f)}>
        <div className="relative w-full rounded-2xl transition-transform duration-500"
          style={{ minHeight: 160, transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-[#8B5CF6] bg-white text-center"
            style={{ backfaceVisibility: "hidden" }}>
            <p className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-2">Front · click to flip</p>
            <p className="text-sm font-semibold text-[#1A2035]">{card.front || "—"}</p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-[#10B981] bg-[#F0FDF4] text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <p className="text-[9px] font-bold text-[#10B981] uppercase tracking-wider mb-2">Answer</p>
            <p className="text-sm font-semibold text-[#1A2035]">{card.back || "—"}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between w-full">
        <button onClick={() => { setIdx(i => Math.max(0, i-1)); setFlipped(false); }} disabled={idx===0}
          className="p-1.5 rounded-xl border border-[#E8EDF5] text-[#7A869A] disabled:opacity-30">
          <ChevronLeft size={14}/>
        </button>
        <span className="text-xs text-[#7A869A]">Card {idx+1}/{cards.length}
          <button onClick={() => setFlipped(f=>!f)} className="ml-2 text-[#8B5CF6]"><RotateCcw size={11} className="inline"/> flip</button>
        </span>
        <button onClick={() => { setIdx(i => Math.min(cards.length-1, i+1)); setFlipped(false); }} disabled={idx===cards.length-1}
          className="p-1.5 rounded-xl border border-[#E8EDF5] text-[#7A869A] disabled:opacity-30">
          <ChevronRight size={14}/>
        </button>
      </div>
    </div>
  );
}

function QuizPreview({ quizId }: { quizId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    createClient().from("question").select("question,options,answer,explanation")
      .eq("quiz_id", quizId)
      .then(({ data }) => { setQuestions((data ?? []) as QuizQuestion[]); setLoading(false); });
  }, [quizId]);
  if (loading) return <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-[#FF6B35]"/></div>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {questions.map((q, qi) => (
        <div key={qi} className="bg-white rounded-xl border border-[#E8EDF5]">
          <div className="px-3 py-2 bg-[#FFF7F4] border-b border-[#F0F4FA]">
            <span className="text-[9px] font-bold text-[#FF6B35]">Q{qi+1}</span>
            <p className="text-[11px] font-semibold text-[#1A2035] mt-0.5">{q.question}</p>
          </div>
          <div className="px-3 py-2 grid grid-cols-2 gap-1">
            {(q.options??[]).map((opt,oi) => {
              const correct = (q.answer??[]).includes(opt);
              return (
                <div key={oi} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px]"
                  style={{ background: correct?"#F0FDF4":"#F8FAFC", color: correct?"#166534":"#7A869A", border:`1px solid ${correct?"#A7F3D0":"#F0F4FA"}` }}>
                  <span className="font-bold">{String.fromCharCode(65+oi)}.</span>
                  <span className={correct?"font-semibold":""}>{opt}</span>
                </div>
              );
            })}
          </div>
          {q.explanation && <p className="px-3 pb-2 text-[9px] text-[#7A869A] italic">{q.explanation}</p>}
        </div>
      ))}
      {questions.length === 0 && <p className="text-center text-xs text-[#7A869A] py-4">No questions found</p>}
    </div>
  );
}

/* ─── Preview + Action Panel ─────────────────────────────────────────────── */
function ReviewPanel({ resource, onClose, onApprove, onReject, isActing, isAdmin }: {
  resource: ResourceRow;
  onClose: () => void;
  onApprove: (r: ResourceRow) => void;
  onReject: (r: ResourceRow) => void;
  isActing: boolean;
  isAdmin: boolean;
}) {
  const typeMeta = TYPE_META[resource.type] ?? TYPE_META.PDF;
  const subjName = resource.subject?.name ?? "General";
  const subjectColor = SUBJECT_COLORS[subjName] ?? "#7A869A";
  const vs = VIS_STYLE[resource.visibility] ?? { bg: "#F0F4FA", color: "#7A869A", label: resource.visibility };
  const ds = resource.difficulty ? (DIFF_STYLE[resource.difficulty] ?? null) : null;
  const isPending = resource.visibility === "PENDING_REVIEW";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8EDF5] bg-white shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: typeMeta.bg, color: typeMeta.color }}>
            {typeMeta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1A2035] leading-snug">{resource.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold" style={{ color: subjectColor }}>{subjName}</span>
              {resource.grade && <span className="text-[10px] text-[#7A869A] bg-[#F0F4FA] px-1.5 py-0.5 rounded-full">Class {resource.grade}</span>}
              {ds && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={ds}>{resource.difficulty}</span>}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: vs.bg, color: vs.color }}>{vs.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035] shrink-0 mt-0.5">
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* Submitter info */}
      <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#F0F4FA] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8B5CF6] flex items-center justify-center shrink-0">
            <User2 size={12} className="text-white"/>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1A2035]">{resource.uploaderName}</p>
            <p className="text-[10px] text-[#7A869A]">
              Submitted {new Date(resource.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })}
            </p>
          </div>
        </div>
        {(resource.topic || resource.description) && (
          <div className="mt-2 space-y-1">
            {resource.topic && (
              <div className="flex items-center gap-1 text-[10px] text-[#7A869A]">
                <Tag size={9}/> <span className="font-semibold text-[#475569]">{resource.topic}</span>
              </div>
            )}
            {resource.description && (
              <p className="text-[10px] text-[#7A869A]">{resource.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Content preview */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <p className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Content Preview</p>

        {resource.type === "PDF" && resource.file_url && (
          <PdfPreview url={resource.file_url} pages={resource.pages}/>
        )}
        {resource.type === "VIDEO" && resource.file_url && (
          <VideoPreview url={resource.file_url}/>
        )}
        {resource.type === "FLASHCARD" && resource.flashcards && resource.flashcards.length > 0 && (
          <FlashcardPreview cards={resource.flashcards}/>
        )}
        {resource.type === "QUIZ" && resource.quiz_id && (
          <QuizPreview quizId={resource.quiz_id}/>
        )}
        {!resource.file_url && !resource.flashcards && !resource.quiz_id && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle size={24} className="text-[#CBD5E1]"/>
            <p className="text-xs text-[#7A869A]">No preview available</p>
          </div>
        )}

        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] text-[#7A869A] hover:text-[#1A2035] transition-colors">
            <ExternalLink size={10}/> Open original
          </a>
        )}
      </div>

      {/* Action footer */}
      {isAdmin && (
        <div className="shrink-0 px-5 py-4 border-t border-[#E8EDF5] bg-white">
          {isPending ? (
            <div className="flex gap-3">
              <button
                onClick={() => onReject(resource)}
                disabled={isActing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 transition-colors"
              >
                {isActing ? <Loader2 size={13} className="animate-spin"/> : <XCircle size={13}/>}
                Reject
              </button>
              <button
                onClick={() => onApprove(resource)}
                disabled={isActing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 transition-colors"
              >
                {isActing ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle size={13}/>}
                Approve & Publish
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              {resource.visibility === "PUBLIC"
                ? <><CheckCircle size={14} className="text-[#10B981]"/><span className="text-sm font-semibold text-[#10B981]">Already published</span></>
                : <><XCircle size={14} className="text-[#EF4444]"/><span className="text-sm font-semibold text-[#EF4444]">Already rejected</span></>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function CmsReviewPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const supabase = createClient();
  const [resources,  setResources]  = useState<ResourceRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [actionIds,  setActionIds]  = useState<Set<string>>(new Set());
  const [visFilter,  setVisFilter]  = useState<"PENDING_REVIEW"|"PUBLIC"|"all">("PENDING_REVIEW");
  const [selected,   setSelected]   = useState<ResourceRow | null>(null);

  const isAdmin = user?.role === "CMS_ADMIN";

  useEffect(() => {
    if (userLoading || !user) return;
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, user, visFilter]);

  async function fetchResources() {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("resources")
      .select(`id, title, type, grade, topic, difficulty, description, created_at, visibility,
               file_url, pages, duration, flashcards, quiz_id, created_by,
               subject:subject_id(name), users:created_by(name)`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!isAdmin) {
      query = query.eq("created_by", user.id);
    } else if (visFilter !== "all") {
      query = query.eq("visibility", visFilter);
    }

    const { data, error } = await query;
    setLoading(false);
    if (error) { toast.error("Failed to load"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setResources((data as any[] ?? []).map((r) => {
      const sub = Array.isArray(r.subject) ? r.subject[0] : r.subject;
      const usr = Array.isArray(r.users)   ? r.users[0]   : r.users;
      return { ...r, subject: sub, uploaderName: usr?.name ?? "—" };
    }));
  }

  async function handleApprove(resource: ResourceRow) {
    setActionIds(prev => new Set(prev).add(resource.id));
    const { error } = await supabase.from("resources").update({ visibility: "PUBLIC" }).eq("id", resource.id);
    setActionIds(prev => { const s = new Set(prev); s.delete(resource.id); return s; });
    if (error) { toast.error("Failed to approve"); return; }
    toast.success(`✓ "${resource.title}" approved & published`);
    if (visFilter === "PENDING_REVIEW") {
      // Remove from pending list immediately
      setResources(prev => prev.filter(r => r.id !== resource.id));
      setSelected(prev => prev?.id === resource.id ? null : prev);
    } else {
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, visibility: "PUBLIC" } : r));
      setSelected(prev => prev?.id === resource.id ? { ...prev, visibility: "PUBLIC" } : prev);
    }
  }

  async function handleReject(resource: ResourceRow) {
    setActionIds(prev => new Set(prev).add(resource.id));
    const { error } = await supabase.from("resources").update({ visibility: "REJECTED" }).eq("id", resource.id);
    setActionIds(prev => { const s = new Set(prev); s.delete(resource.id); return s; });
    if (error) { toast.error("Failed to reject"); return; }
    toast.success(`"${resource.title}" rejected`);
    if (visFilter === "PENDING_REVIEW") {
      // Remove from pending list immediately
      setResources(prev => prev.filter(r => r.id !== resource.id));
      setSelected(prev => prev?.id === resource.id ? null : prev);
    } else {
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, visibility: "REJECTED" } : r));
      setSelected(prev => prev?.id === resource.id ? { ...prev, visibility: "REJECTED" } : prev);
    }
  }

  const pendingCount = resources.filter(r => r.visibility === "PENDING_REVIEW").length;

  if (userLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-[#FF6B35]"/>
    </div>
  );

  return (
    <div className="flex gap-5 animate-fadeIn" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* ─── Main list ─── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A2035]">
              {isAdmin ? "Review Queue" : "My Submissions"}
            </h1>
            <p className="text-sm text-[#7A869A]">
              {isAdmin ? "Preview content then approve or reject" : "Track the status of your uploads"}
            </p>
          </div>
          {!loading && isAdmin && pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs font-semibold text-[#F59E0B]">
              <Clock size={12}/> {pendingCount} pending
            </div>
          )}
        </div>

        {/* Admin filter tabs */}
        {isAdmin && (
          <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl w-fit">
            {(["PENDING_REVIEW","PUBLIC","all"] as const).map(f => (
              <button key={f} onClick={() => { setVisFilter(f); setSelected(null); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${visFilter===f ? "bg-white text-[#1A2035] shadow-sm" : "text-[#7A869A]"}`}>
                {f==="PENDING_REVIEW" ? "Pending" : f==="PUBLIC" ? "Approved" : "All"}
              </button>
            ))}
          </div>
        )}

        {/* Staff notice */}
        {!isAdmin && (
          <div className="flex items-center gap-3 p-4 bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl">
            <Eye size={16} className="text-[#8B5CF6] shrink-0"/>
            <p className="text-sm text-[#5B21B6]">
              Click any row to <strong>preview</strong> your content. A <strong>Super Admin</strong> will review and publish it.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#FF6B35]"/>
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] flex flex-col items-center text-center">
            <BookOpen size={40} className="text-[#E8EDF5] mb-3"/>
            <p className="text-sm font-semibold text-[#1A2035]">{isAdmin ? "Review queue is empty" : "No submissions yet"}</p>
            <p className="text-xs text-[#7A869A] mt-1">{isAdmin ? "All caught up!" : "Upload content to see it here"}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
            {/* Column headers */}
            <div className="px-5 py-2.5 border-b border-[#E8EDF5] bg-[#F8FAFC] grid gap-3 text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
              style={{ gridTemplateColumns: isAdmin ? "36px 1fr 90px 60px 60px 130px 90px 100px" : "36px 1fr 90px 60px 60px 90px 80px" }}>
              <span/>
              <span>Title</span>
              <span>Subject</span>
              <span>Class</span>
              <span>Level</span>
              {isAdmin && <span>Submitted By</span>}
              <span>Status</span>
              <span className="text-right">{isAdmin ? "Actions" : "Date"}</span>
            </div>

            <div className="divide-y divide-[#F0F4FA]">
              {resources.map(resource => {
                const tm = TYPE_META[resource.type] ?? TYPE_META.PDF;
                const ds = resource.difficulty ? (DIFF_STYLE[resource.difficulty] ?? null) : null;
                const vs = VIS_STYLE[resource.visibility] ?? { bg:"#F0F4FA", color:"#7A869A", label: resource.visibility };
                const isActing = actionIds.has(resource.id);
                const isSelected = selected?.id === resource.id;
                const isPending = resource.visibility === "PENDING_REVIEW";

                return (
                  <div key={resource.id}
                    onClick={() => setSelected(isSelected ? null : resource)}
                    className="px-5 py-3 items-center cursor-pointer hover:bg-[#F8FAFC] transition-colors group grid gap-3"
                    style={{
                      gridTemplateColumns: isAdmin ? "36px 1fr 90px 60px 60px 130px 90px 100px" : "36px 1fr 90px 60px 60px 90px 80px",
                      background: isSelected ? "#FFF7F4" : undefined,
                    }}
                  >
                    {/* Type icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                      style={{ background: tm.bg, color: tm.color }}>
                      {tm.icon}
                    </div>

                    {/* Title */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1A2035] truncate group-hover:text-[#FF6B35] transition-colors">{resource.title}</p>
                      {resource.topic && (
                        <p className="text-[10px] text-[#7A869A] truncate flex items-center gap-1"><Tag size={8}/>{resource.topic}</p>
                      )}
                    </div>

                    {/* Subject */}
                    <div>
                      <span className="text-[10px] font-semibold truncate block"
                        style={{ color: SUBJECT_COLORS[resource.subject?.name ?? ""] ?? "#7A869A" }}>
                        {resource.subject?.name || "—"}
                      </span>
                    </div>

                    {/* Grade */}
                    <div className="text-[10px] text-[#7A869A]">{resource.grade ? `Class ${resource.grade}` : "—"}</div>

                    {/* Difficulty */}
                    <div>
                      {ds
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={ds}>{resource.difficulty}</span>
                        : <span className="text-[10px] text-[#CBD5E1]">—</span>}
                    </div>

                    {/* Submitted by (admin only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-[#8B5CF6] flex items-center justify-center shrink-0">
                          <User2 size={10} className="text-white"/>
                        </div>
                        <span className="text-[10px] text-[#475569] truncate">{resource.uploaderName}</span>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: vs.bg, color: vs.color }}>{vs.label}</span>
                    </div>

                    {/* Actions / date */}
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {isPending ? (
                          <>
                            <button onClick={() => handleReject(resource)} disabled={isActing}
                              className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] disabled:opacity-40 transition-colors" title="Reject">
                              {isActing ? <Loader2 size={13} className="animate-spin"/> : <XCircle size={13}/>}
                            </button>
                            <button onClick={() => handleApprove(resource)} disabled={isActing}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 transition-colors"
                              title="Approve">
                              {isActing ? <Loader2 size={10} className="animate-spin"/> : <CheckCircle size={10}/>}
                              Approve
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-semibold" style={{ color: vs.color }}>{vs.label}</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-right text-[10px] text-[#7A869A]">
                        {new Date(resource.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Preview + action panel ─── */}
      {selected && (
        <div className="w-96 shrink-0 bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden flex flex-col sticky top-5"
          style={{ maxHeight: "calc(100vh - 100px)" }}>
          <ReviewPanel
            resource={selected}
            onClose={() => setSelected(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            isActing={actionIds.has(selected.id)}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}

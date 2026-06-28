"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FileText, Video, Layers, BookOpen, Upload, Plus, Trash2,
  CheckCircle, Sparkles, Loader2, X, Link2, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ContentType = "PDF" | "VIDEO" | "FLASHCARD" | "QUIZ";
interface Subject { id: string; name: string; }
interface FlashCard { id: string; front: string; back: string; }
interface QuizDraft {
  id: string; text: string;
  opt1: string; opt2: string; opt3: string; opt4: string;
  correct: number; explanation: string;
}
interface ResourceTopic {
  id: string;
  subject_name: string;
  class_no: number;
  topic: string;
  subtopic: string | null;
  priority: number;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const GRADES = [1,2,3,4,5,6,7,8,9,10,11,12];
const DIFFICULTIES = ["EASY","MEDIUM","HARD"] as const;
const BOARDS = ["CBSE","ICSE","IGCSE","State Board","IB","NIOS","Cambridge","Other"] as const;
const LANGUAGES = ["English","Hindi","Telugu","Tamil","Kannada","Malayalam","Marathi","Bengali","Gujarati","Punjabi","Other"] as const;
const SOURCES = ["PalmLeef","YouTube","Teacher Upload","School Upload","Government","Publisher","Open Educational Resources","External Website"] as const;
const STATUSES = ["DRAFT","PUBLISHED","ARCHIVED"] as const;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash-lite";

function uid() { return Math.random().toString(36).slice(2,10); }
function emptyCard(): FlashCard { return { id: uid(), front: "", back: "" }; }
function emptyQ(): QuizDraft { return { id: uid(), text:"", opt1:"", opt2:"", opt3:"", opt4:"", correct:0, explanation:"" }; }

const TABS: { key: ContentType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key:"PDF",       label:"PDF",        icon:<FileText size={16}/>,  color:"#EF4444", bg:"#FEF2F2" },
  { key:"VIDEO",     label:"Video",      icon:<Video size={16}/>,     color:"#3B82F6", bg:"#EFF6FF" },
  { key:"FLASHCARD", label:"Flashcards", icon:<Layers size={16}/>,    color:"#8B5CF6", bg:"#F5F3FF" },
  { key:"QUIZ",      label:"Quiz",       icon:<BookOpen size={16}/>,  color:"#FF6B35", bg:"#FFF7F4" },
];

/* ─── Gemini AI helper ───────────────────────────────────────────────────── */
async function callGeminiForQuiz(topic: string, subject: string, count: number): Promise<QuizDraft[]> {
  const prompt = `Generate exactly ${count} multiple-choice quiz questions about "${topic}" for the subject "${subject}".
Return a JSON array only (no markdown, no extra text) with this exact schema:
[{"text":"Question text","opt1":"Option A","opt2":"Option B","opt3":"Option C","opt4":"Option D","correct":0,"explanation":"Why the correct answer is right"}]
"correct" is the 0-based index of the correct option (0=opt1, 1=opt2, 2=opt3, 3=opt4).
Make questions educational, clear, and NCERT-aligned.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array in Gemini response");
  const parsed = JSON.parse(match[0]);
  return parsed.map((q: Omit<QuizDraft,"id">) => ({ ...q, id: uid() }));
}

/* ─────────────────────────────────────────────────────────────────────────
   MetaFields — MUST be defined OUTSIDE the parent component so React never
   unmounts/remounts it on parent state changes (avoids cursor-jump bug).
──────────────────────────────────────────────────────────────────────────── */
interface MetaFieldsProps {
  tab: ContentType;
  isStaff: boolean;
  subjects: Subject[];
  approvedTopics: ResourceTopic[];
  // Core
  title: string;        setTitle: (v: string) => void;
  subjectId: string;    setSubjectId: (v: string) => void;
  grade: number;        setGrade: (v: number) => void;
  chapter: string;      setChapter: (v: string) => void;
  topic: string;        setTopic: (v: string) => void;
  subtopic: string;     setSubtopic: (v: string) => void;
  topicId: string | null; setTopicId: (v: string | null) => void;
  board: string;        setBoard: (v: string) => void;
  language: string;     setLanguage: (v: string) => void;
  difficulty: "EASY"|"MEDIUM"|"HARD";  setDifficulty: (v: "EASY"|"MEDIUM"|"HARD") => void;
  sourceOrigin: string; setSourceOrigin: (v: string) => void;
  isPremium: boolean;   setIsPremium: (v: boolean) => void;
  status: string;       setStatus: (v: string) => void;
  tags: string;         setTags: (v: string) => void;
  description: string;  setDescription: (v: string) => void;
  // Arrays
  learningPurpose: string[]; setLearningPurpose: React.Dispatch<React.SetStateAction<string[]>>;
  contentStyle: string[];    setContentStyle: React.Dispatch<React.SetStateAction<string[]>>;
  learningOutcome: string[]; setLearningOutcome: React.Dispatch<React.SetStateAction<string[]>>;
}

function MetaFields({
  tab, isStaff, subjects, approvedTopics,
  title, setTitle,
  subjectId, setSubjectId,
  grade, setGrade,
  chapter, setChapter,
  topic, setTopic,
  subtopic, setSubtopic,
  topicId, setTopicId,
  board, setBoard,
  language, setLanguage,
  difficulty, setDifficulty,
  sourceOrigin, setSourceOrigin,
  isPremium, setIsPremium,
  status, setStatus,
  tags, setTags,
  learningPurpose, setLearningPurpose,
  contentStyle, setContentStyle,
  learningOutcome, setLearningOutcome,
  description, setDescription,
}: MetaFieldsProps) {
  const titlePlaceholder =
    tab === "PDF"       ? "e.g. Fractions Reference Sheet" :
    tab === "VIDEO"     ? "e.g. Photosynthesis Explained" :
    tab === "FLASHCARD" ? "e.g. Algebra Formulas" :
                          "e.g. Algebra Quiz Set";

  const currentSubjectName = subjects.find(s => s.id === subjectId)?.name ?? "";
  const filteredTopics = approvedTopics.filter(
    t => t.subject_name === currentSubjectName && t.class_no === grade
  );

  function handleTopicSelect(id: string) {
    setTopicId(id || null);
    if (!id) { setTopic(""); setChapter(""); setSubtopic(""); return; }
    const found = approvedTopics.find(t => t.id === id);
    if (found) {
      setChapter(found.topic);
      setTopic(found.topic);
      setSubtopic(found.subtopic ?? "");
    }
  }

  function addChip(arr: string[], set: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
    val.split(",").forEach(v => { v = v.trim(); if (v && !arr.includes(v)) set(p => [...p, v]); });
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5] space-y-4">
      {/* Section label */}
      <div className="text-xs font-bold text-[#7A869A] uppercase tracking-wider">Resource Metadata</div>

      {/* Row 1 — Title + Board + Class + Language */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="label-xs">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder} className="field-input"/>
        </div>
        <div>
          <label className="label-xs">Board *</label>
          <div className="relative">
            <select value={board} onChange={e => setBoard(e.target.value)} className="field-input appearance-none pr-8">
              <option value="">— Select —</option>
              {BOARDS.map(b => <option key={b}>{b}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label-xs">Language</label>
          <div className="relative">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="field-input appearance-none pr-8">
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
      </div>

      {/* Row 2 — Subject + Class + Difficulty + Source */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label-xs">Subject *</label>
          <div className="relative">
            <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(null); setTopic(""); setChapter(""); setSubtopic(""); }} className="field-input appearance-none pr-8">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label-xs">Class *</label>
          <div className="relative">
            <select value={grade} onChange={e => { setGrade(+e.target.value); setTopicId(null); setTopic(""); setChapter(""); setSubtopic(""); }} className="field-input appearance-none pr-8">
              {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label-xs">Difficulty</label>
          <div className="relative">
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as "EASY"|"MEDIUM"|"HARD")} className="field-input appearance-none pr-8">
              <option value="EASY">Beginner (Easy)</option>
              <option value="MEDIUM">Intermediate (Medium)</option>
              <option value="HARD">Advanced (Hard)</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label-xs">Source</label>
          <div className="relative">
            <select value={sourceOrigin} onChange={e => setSourceOrigin(e.target.value)} className="field-input appearance-none pr-8">
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
      </div>

      {/* Row 3 — Chapter + Topic + Subtopic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {isStaff ? (
          <div className="md:col-span-3">
            <label className="label-xs">Chapter / Topic *
              <span className="text-[#8B5CF6] font-bold normal-case tracking-normal ml-1">(select from admin-approved list)</span>
            </label>
            <div className="relative">
              <select value={topicId ?? ""} onChange={e => handleTopicSelect(e.target.value)} className="field-input appearance-none pr-8"
                style={{ borderColor: !topicId ? "#FCD34D" : "#E8EDF5" }}>
                <option value="">— Select topic —</option>
                {filteredTopics.length === 0 && <option disabled>No active topics for this subject &amp; class</option>}
                {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.topic}{t.subtopic ? ` › ${t.subtopic}` : ""}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
            </div>
            {filteredTopics.length === 0 && currentSubjectName && (
              <p className="text-[10px] text-[#F59E0B] mt-1 font-semibold">No active topics for {currentSubjectName} · Class {grade}. Contact your admin.</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="label-xs">Chapter *</label>
              <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="e.g. Life Processes" className="field-input"/>
            </div>
            <div>
              <label className="label-xs">Topic *</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis" className="field-input"/>
            </div>
            <div>
              <label className="label-xs">Subtopic</label>
              <input value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="e.g. Chlorophyll & Light Reaction" className="field-input"/>
            </div>
          </>
        )}
      </div>

      {/* Row 4 — Status + Premium + Tags */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label-xs">Status</label>
          <div className="relative">
            <select value={status} onChange={e => setStatus(e.target.value)} className="field-input appearance-none pr-8">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        </div>
        <div className="flex flex-col justify-start gap-1.5">
          <label className="label-xs">Premium</label>
          <button type="button" onClick={() => setIsPremium(!isPremium)}
            className="relative w-11 h-6 rounded-full transition-colors shrink-0 self-start"
            style={{ background: isPremium ? "#F59E0B" : "#E2E8F0" }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: isPremium ? "translateX(20px)" : "translateX(0)" }}/>
          </button>
        </div>
        <div className="md:col-span-2">
          <label className="label-xs">Tags (comma separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="photosynthesis, biology, cbse, class10" className="field-input"/>
        </div>
      </div>

      {/* Row 5 — Learning Purpose + Content Style + Outcome (all tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([
          { label: "Learning Purpose", arr: learningPurpose, set: setLearningPurpose, ph: "Exam Prep, Revision, Animation…", bg: "#F3E8FF", tc: "#7E22CE" },
          { label: "Content Style",    arr: contentStyle,    set: setContentStyle,    ph: "Animation, Lecture, Whiteboard…", bg: "#E0F2FE", tc: "#0369A1" },
          { label: "Learning Outcome", arr: learningOutcome, set: setLearningOutcome, ph: "Memorize, Practice, Understand…", bg: "#DCFCE7", tc: "#15803D" },
        ] as const).map(({ label, arr, set, ph, bg, tc }) => (
          <div key={label}>
            <label className="label-xs">{label} <span className="text-[#94A3B8] normal-case">(press Enter to add)</span></label>
            <input className="field-input" placeholder={ph} onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); addChip(arr, set, e.currentTarget.value); e.currentTarget.value = ""; }
            }}/>
            <div className="flex flex-wrap gap-1 mt-1">
              {arr.map(p => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: bg, color: tc }}>
                  {p}
                  <button type="button" onClick={() => set(arr.filter(x => x !== p))} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 6 — Description */}
      <div>
        <label className="label-xs">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="Brief description of this resource…" className="field-input resize-none"/>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FlashcardEditor — isolated component so card textareas never lose focus
──────────────────────────────────────────────────────────────────────────── */
interface FlashcardEditorProps {
  cards: FlashCard[];
  onChange: (cards: FlashCard[]) => void;
}
function FlashcardEditor({ cards, onChange }: FlashcardEditorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {cards.map((card, ci) => (
        <div key={card.id} className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5]">
            <span className="text-xs font-bold text-[#8B5CF6]">Card {ci + 1}</span>
            {cards.length > 2 && (
              <button
                onClick={() => onChange(cards.filter(c => c.id !== card.id))}
                className="text-[#7A869A] hover:text-[#EF4444] transition-colors"
              >
                <Trash2 size={12}/>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#F0F4FA]">
            <div className="p-3">
              <div className="text-[9px] font-bold text-[#7A869A] uppercase mb-1.5">Front (Question)</div>
              <textarea
                value={card.front}
                onChange={e => onChange(cards.map(c => c.id === card.id ? { ...c, front: e.target.value } : c))}
                rows={3}
                placeholder="e.g. What is the formula for area of circle?"
                className="w-full text-xs text-[#1A2035] bg-transparent outline-none resize-none placeholder-[#CBD5E1]"
              />
            </div>
            <div className="p-3 bg-[#F5F3FF]">
              <div className="text-[9px] font-bold text-[#8B5CF6] uppercase mb-1.5">Back (Answer)</div>
              <textarea
                value={card.back}
                onChange={e => onChange(cards.map(c => c.id === card.id ? { ...c, back: e.target.value } : c))}
                rows={3}
                placeholder="e.g. A = πr²"
                className="w-full text-xs text-[#1A2035] bg-transparent outline-none resize-none placeholder-[#C4B5FD]"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   QuizQuestionEditor — isolated so question inputs don't lose focus
──────────────────────────────────────────────────────────────────────────── */
interface QuizQuestionEditorProps {
  questions: QuizDraft[];
  onChange: (questions: QuizDraft[]) => void;
}
function QuizQuestionEditor({ questions, onChange }: QuizQuestionEditorProps) {
  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={q.id} className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-[#FFF7F4] border-b border-[#E8EDF5]">
            <span className="text-xs font-bold text-[#FF6B35]">Q{qi + 1}</span>
            {questions.length > 1 && (
              <button onClick={() => onChange(questions.filter(x => x.id !== q.id))} className="text-[#7A869A] hover:text-[#EF4444]">
                <Trash2 size={13}/>
              </button>
            )}
          </div>
          <div className="p-5 space-y-3">
            <textarea
              value={q.text}
              onChange={e => onChange(questions.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))}
              rows={2}
              placeholder="Question text…"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#FF6B35]/20 resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["opt1","opt2","opt3","opt4"] as const).map((key, i) => (
                <div key={key} className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: q.correct === i ? "#ECFDF5" : "#F0F4FA", color: q.correct === i ? "#10B981" : "#7A869A" }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    value={q[key]}
                    onChange={e => onChange(questions.map(x => x.id === q.id ? { ...x, [key]: e.target.value } : x))}
                    placeholder={`Option ${i + 1}`}
                    className="w-full h-9 pl-10 pr-3 rounded-xl border text-xs text-[#1A2035] placeholder-[#94A3B8] outline-none"
                    style={{
                      borderColor: q.correct === i ? "#A7F3D0" : "#E8EDF5",
                      background:  q.correct === i ? "#F0FDF4"  : "#F8FAFC",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-xs">Correct Answer</label>
                <select
                  value={q.correct}
                  onChange={e => onChange(questions.map(x => x.id === q.id ? { ...x, correct: +e.target.value } : x))}
                  className="field-input"
                >
                  {["Option A","Option B","Option C","Option D"].map((o, i) => <option key={i} value={i}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label-xs">Explanation</label>
                <input
                  value={q.explanation}
                  onChange={e => onChange(questions.map(x => x.id === q.id ? { ...x, explanation: e.target.value } : x))}
                  placeholder="Why is this correct?"
                  className="field-input"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function CmsUploadPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "CMS_ADMIN";
  const isStaff = user?.role === "CMS_STAFF";
  // Staff uploads go to PENDING_REVIEW; admin uploads go straight to PUBLIC
  const uploadVisibility = isAdmin ? "PUBLIC" : "PENDING_REVIEW";

  const [tab, setTab] = useState<ContentType>("PDF");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [approvedTopics, setApprovedTopics] = useState<ResourceTopic[]>([]);
  const [saving, setSaving] = useState(false);

  /* shared metadata */
  const [subjectId,   setSubjectId]   = useState("");
  const [grade,       setGrade]       = useState(8);
  const [topic,       setTopic]       = useState("");
  const [topicId,     setTopicId]     = useState<string | null>(null);
  const [difficulty,  setDifficulty]  = useState<"EASY"|"MEDIUM"|"HARD">("MEDIUM");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [tags,        setTags]        = useState("");

  const [learningPurpose, setLearningPurpose] = useState<string[]>([]);
  const [contentStyle, setContentStyle] = useState<string[]>([]);
  const [learningOutcome, setLearningOutcome] = useState<string[]>([]);
  /* new required fields */
  const [board,          setBoard]          = useState("CBSE");
  const [language,       setLanguage]       = useState("English");
  const [chapter,        setChapter]        = useState("");
  const [subtopic,       setSubtopic]       = useState("");
  const [sourceOrigin,   setSourceOrigin]   = useState("PalmLeef");
  const [isPremium,      setIsPremium]      = useState(false);
  const [status,         setStatus]         = useState("PUBLISHED");


  /* PDF state */
  const [pdfFile,  setPdfFile]  = useState<File|null>(null);
  const [pdfUrl,   setPdfUrl]   = useState("");
  const [pdfPages, setPdfPages] = useState<number|"">("");
  const pdfRef = useRef<HTMLInputElement>(null);

  /* VIDEO state */
  const [videoUrl,      setVideoUrl]      = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoThumb,    setVideoThumb]    = useState("");

  /* FLASHCARD state */
  const [cards, setCards] = useState<FlashCard[]>([emptyCard(), emptyCard()]);

  /* QUIZ state */
  const [questions,    setQuestions]    = useState<QuizDraft[]>([emptyQ()]);
  const [aiTopic,      setAiTopic]      = useState("");
  const [aiCount,      setAiCount]      = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);

  /* QUIZ — Game Zone settings */
  const [isGamezone,   setIsGamezone]   = useState(true);
  const [gameLevel,    setGameLevel]    = useState<"BEGINNER"|"INTERMEDIATE"|"ADVANCED">("BEGINNER");
  const [gameModes,    setGameModes]    = useState<string[]>(["speed-blitz","tug-of-war","challenge","practice","tournament"]);

  // These are the 5 Games (not modes). Modes like VS AI / Pass & Play are selected in-game.
  const ALL_GAME_MODES = [
    { key:"speed-blitz",  label:"⚡ Speed Blitz" },
    { key:"tug-of-war",   label:"🪢 Tug of War" },
    { key:"challenge",    label:"⚔️ Challenge" },
    { key:"practice",     label:"🧘 Practice" },
    { key:"tournament",   label:"🏆 Tournament" },
  ];

  function toggleGameMode(key: string) {
    setGameModes(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  }

  /* fetch subjects + approved topics */
  useEffect(() => {
    const supabase = createClient();
    supabase.from("subjects").select("id,name").order("name").then(({ data }) => {
      if (!data) return;
      const seen = new Set<string>();
      const unique = data.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; });
      setSubjects(unique);
      if (unique[0]) setSubjectId(unique[0].id);
    });
    supabase
      .from("resource_topics")
      .select("id,subject_name,class_no,topic,subtopic,priority")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("topic")
      .then(({ data }) => { if (data) setApprovedTopics(data); });
  }, []);

  function resetShared() {
    setTitle(""); setDescription(""); setTopic(""); setChapter(""); setSubtopic(""); setTopicId(null); setTags(""); setLearningPurpose([]); setContentStyle([]); setLearningOutcome([]);
    setGrade(8); setDifficulty("MEDIUM"); setBoard("CBSE"); setLanguage("English"); setSourceOrigin("PalmLeef"); setIsPremium(false); setStatus("PUBLISHED");
    setIsGamezone(true);
    setGameLevel("BEGINNER");
    setGameModes(["vs-ai","speed-blitz","tug-of-war","challenge","pass-play","practice","tournament"]);
  }

  function validateTopicForStaff(): boolean {
    if (!isStaff) return true;
    if (!topicId) { toast.error("Please select a topic from the approved list"); return false; }
    return true;
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    const supabase = createClient();
    const { error } = await supabase.storage.from("resources").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from("resources").getPublicUrl(path).data.publicUrl;
  }

  async function saveResource(payload: Record<string, unknown>) {
    const { error } = await createClient().from("resources").insert(payload);
    if (error) throw new Error(error.message);
  }

  /* PDF submit */
  async function submitPdf() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!validateTopicForStaff()) return;
    if (!pdfFile && !pdfUrl.trim()) { toast.error("Upload a file or enter a URL"); return; }
    setSaving(true);
    try {
      let finalUrl = pdfUrl.trim();
      if (pdfFile) finalUrl = await uploadFile(pdfFile, `pdfs/${uid()}_${pdfFile.name}`);
      await saveResource({
        title, description, type:"PDF",
        subject_id: subjectId || null,
        topic, topic_id: topicId || null, grade, difficulty,
        file_url: finalUrl,
        pages: pdfPages || null,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        source:"CMS", visibility: uploadVisibility, created_by: user?.id ?? null,
        board: board || null,
        language: language || null,
        chapter: chapter || null,
        subtopic: subtopic || null,
        source_origin: sourceOrigin || null,
        is_premium: isPremium,
        status,
        learning_purpose: learningPurpose,
        content_style: contentStyle,
        learning_outcome: learningOutcome,
      });
      toast.success(isAdmin ? "✓ PDF saved to library" : "✓ PDF submitted for review");
      resetShared(); setPdfFile(null); setPdfUrl(""); setPdfPages("");
    } catch(e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  /* VIDEO submit */
  async function submitVideo() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!validateTopicForStaff()) return;
    if (!videoUrl.trim()) { toast.error("Video URL is required"); return; }
    setSaving(true);
    try {
      await saveResource({
        title, description, type:"VIDEO",
        subject_id: subjectId || null,
        topic, topic_id: topicId || null, grade, difficulty,
        file_url: videoUrl.trim(),
        thumbnail_url: videoThumb.trim() || null,
        duration: videoDuration.trim() || null,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        source:"CMS", visibility: uploadVisibility, created_by: user?.id ?? null,
        board: board || null,
        language: language || null,
        chapter: chapter || null,
        subtopic: subtopic || null,
        source_origin: sourceOrigin || null,
        is_premium: isPremium,
        status,
        learning_purpose: learningPurpose,
        content_style: contentStyle,
        learning_outcome: learningOutcome,
      });
      toast.success(isAdmin ? "✓ Video saved to library" : "✓ Video submitted for review");
      resetShared(); setVideoUrl(""); setVideoDuration(""); setVideoThumb("");
    } catch(e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  /* FLASHCARD submit */
  async function submitFlashcards() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!validateTopicForStaff()) return;
    const valid = cards.filter(c => c.front.trim() && c.back.trim());
    if (valid.length < 2) { toast.error("Add at least 2 complete flashcards"); return; }
    setSaving(true);
    try {
      await saveResource({
        title, description, type:"FLASHCARD",
        subject_id: subjectId || null,
        topic, topic_id: topicId || null, grade, difficulty,
        flashcards: valid.map(c => ({ front: c.front, back: c.back })),
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        source:"CMS", visibility: uploadVisibility, created_by: user?.id ?? null,
        board: board || null,
        language: language || null,
        chapter: chapter || null,
        subtopic: subtopic || null,
        source_origin: sourceOrigin || null,
        is_premium: isPremium,
        status,
        learning_purpose: learningPurpose,
        content_style: contentStyle,
        learning_outcome: learningOutcome,
      });
      toast.success(isAdmin ? `✓ ${valid.length} flashcards saved to library` : `✓ ${valid.length} flashcards submitted for review`);
      resetShared(); setCards([emptyCard(), emptyCard()]);
    } catch(e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  /* QUIZ submit */
  async function submitQuiz() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!validateTopicForStaff()) return;
    const valid = questions.filter(q => q.text.trim() && q.opt1.trim() && q.opt2.trim());
    if (valid.length === 0) { toast.error("Add at least one complete question"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const subName = subjects.find(s => s.id === subjectId)?.name ?? "General";
      const { data: quiz, error: qErr } = await supabase.from("quiz").insert({
        subject_id: subjectId || null,
        topic, title,
        class_no: String(grade),
        time: 30, count: valid.length,
        difficulty, source:"CMS", creation_type:"MANUAL",
        quiz_scope: "EDUBATTLE",
        is_gamezone_eligible: isGamezone,
        game_level: gameLevel,
        allowed_game_modes: isGamezone ? gameModes : [],
        is_published: true,
      }).select("id").single();
      if (qErr || !quiz) throw new Error(qErr?.message ?? "Quiz create failed");

      await supabase.from("question").insert(valid.map(q => ({
        quiz_id: quiz.id,
        question: q.text,
        options: [q.opt1, q.opt2, q.opt3, q.opt4].filter(Boolean),
        answer: [[q.opt1,q.opt2,q.opt3,q.opt4][q.correct]],
        type:"MCQ", explanation: q.explanation || null,
      }))).throwOnError();

      await saveResource({
        title: `${title} — ${subName} Class ${grade}`,
        description, type:"QUIZ",
        subject_id: subjectId || null,
        topic, topic_id: topicId || null, grade, difficulty,
        quiz_id: quiz.id,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        source:"CMS", visibility: uploadVisibility, created_by: user?.id ?? null,
        board: board || null,
        language: language || null,
        chapter: chapter || null,
        subtopic: subtopic || null,
        source_origin: sourceOrigin || null,
        is_premium: isPremium,
        status,
        learning_purpose: learningPurpose,
        content_style: contentStyle,
        learning_outcome: learningOutcome,
      });
      toast.success(isAdmin ? `✓ ${valid.length}-question quiz saved` : `✓ ${valid.length}-question quiz submitted for review`);
      resetShared(); setQuestions([emptyQ()]);
    } catch(e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  /* Real Gemini AI generation */
  async function generateAiQuestions() {
    if (!aiTopic.trim()) { toast.error("Enter a topic first"); return; }
    const subName = subjects.find(s => s.id === subjectId)?.name ?? "General";
    setAiGenerating(true);
    try {
      const generated = await callGeminiForQuiz(aiTopic.trim(), subName, aiCount);
      setQuestions(generated);
      if (!title.trim()) setTitle(`${aiTopic} — ${subName} Quiz`);
      if (!topic.trim()) setTopic(aiTopic.trim());
      toast.success(`✓ ${generated.length} questions generated by Gemini AI`);
    } catch(e: unknown) {
      toast.error(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  const currentTab = TABS.find(t => t.key === tab)!;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Upload Resources</h1>
          <p className="text-sm text-[#7A869A]">Add PDFs, videos, flashcards and quizzes to the EduBattle library</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#10B981] bg-[#ECFDF5] px-3 py-1.5 rounded-full font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"/> Live DB
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-3">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); resetShared(); }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
            style={{ borderColor: tab === t.key ? t.color : "#E8EDF5", background: tab === t.key ? t.bg : "white" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tab === t.key ? t.color : "#F0F4FA", color: tab === t.key ? "white" : "#7A869A" }}>
              {t.icon}
            </div>
            <span className="text-xs font-bold" style={{ color: tab === t.key ? t.color : "#7A869A" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Shared metadata — top-level component, never remounts */}
      <MetaFields
        tab={tab}
        isStaff={isStaff}
        subjects={subjects}
        approvedTopics={approvedTopics}
        title={title}             setTitle={setTitle}
        subjectId={subjectId}     setSubjectId={setSubjectId}
        grade={grade}             setGrade={setGrade}
        topic={topic}             setTopic={setTopic}
        topicId={topicId}         setTopicId={setTopicId}
        difficulty={difficulty}   setDifficulty={setDifficulty}
        board={board}             setBoard={setBoard}
        language={language}       setLanguage={setLanguage}
        chapter={chapter}         setChapter={setChapter}
        subtopic={subtopic}       setSubtopic={setSubtopic}
        sourceOrigin={sourceOrigin} setSourceOrigin={setSourceOrigin}
        isPremium={isPremium}     setIsPremium={setIsPremium}
        status={status}           setStatus={setStatus}
        tags={tags}               setTags={setTags}
        learningPurpose={learningPurpose} setLearningPurpose={setLearningPurpose}
        contentStyle={contentStyle} setContentStyle={setContentStyle}
        learningOutcome={learningOutcome} setLearningOutcome={setLearningOutcome}
        description={description} setDescription={setDescription}
      />

      {/* ── PDF ─────────────────────────────────────────────────────────── */}
      {tab === "PDF" && (
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5] space-y-4">
          <div className="text-sm font-bold text-[#1A2035]">PDF File</div>
          <div
            onClick={() => pdfRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-[#EF4444] hover:bg-[#FFF5F5]"
            style={{ borderColor: pdfFile ? "#EF4444" : "#E8EDF5", background: pdfFile ? "#FEF2F2" : "#F8FAFC" }}
          >
            <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}/>
            {pdfFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-[#EF4444]"/>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#1A2035]">{pdfFile.name}</div>
                  <div className="text-xs text-[#7A869A]">{(pdfFile.size/1024/1024).toFixed(2)} MB</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setPdfFile(null); }} className="ml-2 text-[#7A869A] hover:text-[#EF4444]">
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-[#CBD5E1] mb-2"/>
                <div className="text-sm font-semibold text-[#1A2035]">Drop PDF here or click to browse</div>
                <div className="text-xs text-[#7A869A] mt-1">Max 50 MB · .pdf only</div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E8EDF5]"/>
            <span className="text-xs text-[#7A869A] font-medium">OR paste URL</span>
            <div className="flex-1 h-px bg-[#E8EDF5]"/>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
              <input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://drive.google.com/…" className="field-input pl-9"/>
            </div>
            <div className="w-32">
              <input type="number" value={pdfPages} onChange={e => setPdfPages(e.target.value ? +e.target.value : "")} placeholder="Pages" className="field-input text-center"/>
            </div>
          </div>
          <button onClick={submitPdf} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
            Save PDF to Library
          </button>
        </div>
      )}

      {/* ── VIDEO ───────────────────────────────────────────────────────── */}
      {tab === "VIDEO" && (
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5] space-y-4">
          <div className="text-sm font-bold text-[#1A2035]">Video Details</div>
          <div>
            <label className="label-xs">Video URL * (YouTube, Vimeo, Drive or direct link)</label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="field-input pl-9"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Duration (e.g. 14:32)</label>
              <input value={videoDuration} onChange={e => setVideoDuration(e.target.value)} placeholder="mm:ss" className="field-input"/>
            </div>
            <div>
              <label className="label-xs">Thumbnail URL (optional)</label>
              <input value={videoThumb} onChange={e => setVideoThumb(e.target.value)} placeholder="https://…" className="field-input"/>
            </div>
          </div>
          {videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) && (
            <div className="rounded-xl overflow-hidden border border-[#E8EDF5] aspect-video bg-[#F0F4FA] flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${videoUrl.split("v=")[1]?.split("&")[0] ?? videoUrl.split("/").pop()}`}
                className="w-full h-full" allowFullScreen
              />
            </div>
          )}
          <button onClick={submitVideo} disabled={saving} className="btn-primary" style={{ background:"#3B82F6" }}>
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Video size={14}/>}
            Save Video to Library
          </button>
        </div>
      )}

      {/* ── FLASHCARD ───────────────────────────────────────────────────── */}
      {tab === "FLASHCARD" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#1A2035]">{cards.length} Flashcards</div>
            <div className="text-xs text-[#7A869A]">Click a card to flip preview</div>
          </div>
          <FlashcardEditor cards={cards} onChange={setCards}/>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCards(cs => [...cs, emptyCard()])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[#E8EDF5] text-sm font-semibold text-[#7A869A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-all"
            >
              <Plus size={15}/> Add Card
            </button>
            <button onClick={submitFlashcards} disabled={saving} className="btn-primary" style={{ background:"#8B5CF6" }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Layers size={14}/>}
              Save {cards.filter(c => c.front && c.back).length} Cards to Library
            </button>
          </div>
        </div>
      )}

      {/* ── QUIZ ─────────────────────────────────────────────────────────── */}
      {tab === "QUIZ" && (
        <div className="space-y-4">
          {/* ── Game Zone Settings ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-[#1A2035]">🎮 Game Zone Settings</div>
                <div className="text-[10px] text-[#7A869A]">This quiz will be in the universal EduBattle library</div>
              </div>
              <button
                type="button"
                onClick={() => setIsGamezone(v => !v)}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                style={{ background: isGamezone ? "#10B981" : "#E2E8F0" }}
              >
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: isGamezone ? "translateX(20px)" : "translateX(0)" }}/>
              </button>
            </div>
            {isGamezone && (
              <>
                <div className="mb-3">
                  <label className="label-xs mb-2 block">Game Level</label>
                  <div className="flex gap-2">
                    {(["BEGINNER","INTERMEDIATE","ADVANCED"] as const).map(l => (
                      <button key={l} type="button" onClick={() => setGameLevel(l)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                        style={{
                          borderColor: gameLevel === l ? "#FF6B35" : "#E8EDF5",
                          background:  gameLevel === l ? "#FFF7F4"  : "white",
                          color:       gameLevel === l ? "#FF6B35"  : "#7A869A",
                        }}>
                        {l === "BEGINNER" ? "🟢" : l === "INTERMEDIATE" ? "🟡" : "🔴"} {l.slice(0,4)}.
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-xs mb-2 block">Available Games (players pick their own mode)</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_GAME_MODES.map(m => (
                      <button key={m.key} type="button" onClick={() => toggleGameMode(m.key)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                        style={{
                          borderColor: gameModes.includes(m.key) ? "#FF6B35" : "#E8EDF5",
                          background:  gameModes.includes(m.key) ? "#FFF7F4"  : "#F8FAFC",
                          color:       gameModes.includes(m.key) ? "#FF6B35"  : "#7A869A",
                        }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI generator strip */}
          <div className="bg-gradient-to-r from-[#FF6B35] to-[#FFB347] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-white"/>
              <span className="text-sm font-bold text-white">Gemini AI Generator</span>
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold ml-auto">gemini-2.5-flash-lite</span>
            </div>
            <div className="flex gap-2">
              <input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Enter topic (e.g. Photosynthesis, Newton's Laws)…"
                className="flex-1 bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-sm text-white placeholder-white/70 outline-none focus:bg-white/30"
              />
              <select
                value={aiCount}
                onChange={e => setAiCount(+e.target.value)}
                className="bg-white/20 border border-white/30 rounded-xl px-3 text-sm text-white outline-none"
              >
                {[3,5,8,10].map(n => <option key={n} value={n} className="text-[#1A2035]">{n} Qs</option>)}
              </select>
              <button
                onClick={generateAiQuestions}
                disabled={aiGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#FF6B35] rounded-xl text-sm font-bold hover:bg-white/90 disabled:opacity-60 shrink-0"
              >
                {aiGenerating ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
                {aiGenerating ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>

          {/* Question cards — isolated component */}
          <QuizQuestionEditor questions={questions} onChange={setQuestions}/>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setQuestions(qs => [...qs, emptyQ()])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[#E8EDF5] text-sm font-semibold text-[#7A869A] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all"
            >
              <Plus size={15}/> Add Question
            </button>
            <div className="flex items-center gap-2">
              {questions.filter(q => q.text && q.opt1 && q.opt2).length > 0 && (
                <span className="text-xs text-[#10B981] font-semibold">
                  <CheckCircle size={12} className="inline mr-1"/>
                  {questions.filter(q => q.text && q.opt1 && q.opt2).length} ready
                </span>
              )}
              <button onClick={submitQuiz} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <BookOpen size={14}/>}
                Save {questions.filter(q => q.text && q.opt1 && q.opt2).length} Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* helper styles */}
      <style>{`
        .label-xs { display:block; font-size:10px; font-weight:700; color:#7A869A; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .field-input { width:100%; height:40px; padding:0 12px; border-radius:12px; border:1px solid #E8EDF5; background:#F8FAFC; font-size:13px; color:#1A2035; outline:none; }
        .field-input:focus { border-color:#FF6B35; box-shadow:0 0 0 3px rgba(255,107,53,.12); }
        textarea.field-input { height:auto; padding:10px 12px; }
        .btn-primary { display:flex; align-items:center; gap:6px; padding:10px 20px; background:#FF6B35; color:white; border-radius:12px; font-size:13px; font-weight:700; transition:opacity .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.88; }
        .btn-primary:disabled { opacity:.55; }
      `}</style>
    </div>
  );
}

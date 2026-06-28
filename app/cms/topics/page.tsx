"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, BookOpen,
  ChevronDown, ChevronRight, Loader2, Search, X, Edit2,
  CheckCircle, XCircle, Tag, Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRouter } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Topic {
  id: string;
  subject_name: string;
  class_no: number;
  topic: string;
  subtopic: string | null;
  description: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

// Grouped hierarchy: Subject → Class → TopicGroup → subtopics
interface SubtopicEntry { id: string; subtopic: string; is_active: boolean; description: string | null; priority: number }
interface TopicGroup { topicName: string; entries: Topic[]; baseActive: boolean }
interface ClassGroup { class_no: number; topicGroups: TopicGroup[] }
interface SubjectGroup { subject_name: string; classGroups: ClassGroup[] }

/* ─── Constants ──────────────────────────────────────────────────────────── */
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const SUBJECT_OPTIONS = [
  "Mathematics", "Science", "English", "Hindi", "Social Studies",
  "Physics", "Chemistry", "Biology", "History", "Geography",
  "Civics", "Economics", "Computer Science", "Sanskrit", "Other",
];
const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6", Science: "#10B981", English: "#8B5CF6",
  Hindi: "#F59E0B", "Social Studies": "#EC4899", Physics: "#6366F1",
  Chemistry: "#14B8A6", Biology: "#84CC16", History: "#F97316",
  Geography: "#06B6D4", Civics: "#A855F7", Economics: "#EF4444",
  "Computer Science": "#0EA5E9", Sanskrit: "#D97706", Other: "#7A869A",
};

/* ─── Build hierarchy from flat list ────────────────────────────────────── */
function buildHierarchy(topics: Topic[]): SubjectGroup[] {
  const bySubject: Record<string, Record<number, Record<string, Topic[]>>> = {};
  for (const t of topics) {
    if (!bySubject[t.subject_name]) bySubject[t.subject_name] = {};
    if (!bySubject[t.subject_name][t.class_no]) bySubject[t.subject_name][t.class_no] = {};
    const topicKey = t.topic;
    if (!bySubject[t.subject_name][t.class_no][topicKey]) bySubject[t.subject_name][t.class_no][topicKey] = [];
    bySubject[t.subject_name][t.class_no][topicKey].push(t);
  }
  return Object.entries(bySubject).sort(([a], [b]) => a.localeCompare(b)).map(([subject_name, byClass]) => ({
    subject_name,
    classGroups: Object.entries(byClass).sort(([a], [b]) => +a - +b).map(([class_no, byTopic]) => ({
      class_no: +class_no,
      topicGroups: Object.entries(byTopic).sort(([a], [b]) => a.localeCompare(b)).map(([topicName, entries]) => ({
        topicName,
        entries: entries.sort((a, b) => (a.subtopic ?? "").localeCompare(b.subtopic ?? "")),
        baseActive: entries.some(e => e.is_active),
      })),
    })),
  }));
}

/* ─── Topic Modal ────────────────────────────────────────────────────────── */
interface TopicPrefill { subject_name?: string; class_no?: number; topic?: string }
function TopicModal({ editing, prefillData, onClose, onSaved, userId }: {
  editing: Topic | null; prefillData?: TopicPrefill | null;
  onClose: () => void; onSaved: () => void; userId: string;
}) {
  const [subjectName, setSubjectName] = useState(editing?.subject_name ?? prefillData?.subject_name ?? SUBJECT_OPTIONS[0]);
  const [classNo,     setClassNo]     = useState<number>(editing?.class_no ?? prefillData?.class_no ?? 8);
  const [topic,       setTopic]       = useState(editing?.topic ?? prefillData?.topic ?? "");
  const [subtopic,    setSubtopic]    = useState(editing?.subtopic ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [priority,    setPriority]    = useState<number>(editing?.priority ?? 0);
  const [saving,      setSaving]      = useState(false);

  async function handleSave() {
    if (!topic.trim()) { toast.error("Topic name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        subject_name: subjectName, class_no: classNo,
        topic: topic.trim(), subtopic: subtopic.trim() || null,
        description: description.trim() || null, priority,
        created_by: userId,
      };
      const supabase = createClient();
      if (editing) {
        const { error } = await supabase.from("resource_topics").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Topic updated");
      } else {
        const { error } = await supabase.from("resource_topics").insert(payload);
        if (error) {
          if (error.code === "23505" || error.message.includes("unique")) {
            toast.error("This topic already exists for the selected subject & class"); return;
          }
          throw error;
        }
        toast.success("Topic added");
      }
      onSaved(); onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EDF5]">
          <h2 className="text-base font-bold text-[#1A2035]">{editing ? "Edit Topic" : "Add New Topic"}</h2>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Subject *</label>
              <div className="relative">
                <select value={subjectName} onChange={e => setSubjectName(e.target.value)} className="field-input appearance-none pr-8">
                  {SUBJECT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className="label-xs">Class *</label>
              <div className="relative">
                <select value={classNo} onChange={e => setClassNo(+e.target.value)} className="field-input appearance-none pr-8">
                  {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
              </div>
            </div>
          </div>
          <div>
            <label className="label-xs">Topic / Chapter *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Linear Equations" className="field-input"/>
          </div>
          <div>
            <label className="label-xs">Subtopic <span className="text-[#CBD5E1] font-normal">(optional)</span></label>
            <input value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="e.g. One-variable equations" className="field-input"/>
          </div>
          <div>
            <label className="label-xs">Description <span className="text-[#CBD5E1] font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="What resources should staff upload for this?" className="field-input resize-none"/>
          </div>
          <div>
            <label className="label-xs">Priority <span className="text-[#CBD5E1] font-normal">(higher = shown first)</span></label>
            <input type="number" value={priority} onChange={e => setPriority(+e.target.value)} min={0} max={100} className="field-input"/>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8EDF5]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#7A869A] hover:text-[#1A2035]">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] disabled:opacity-60">
            {saving ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
            {editing ? "Save Changes" : "Add Topic"}
          </button>
        </div>
      </div>
      <style>{`
        .label-xs { display:block; font-size:10px; font-weight:700; color:#7A869A; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .field-input { width:100%; height:40px; padding:0 12px; border-radius:12px; border:1px solid #E8EDF5; background:#F8FAFC; font-size:13px; color:#1A2035; outline:none; }
        .field-input:focus { border-color:#FF6B35; box-shadow:0 0 0 3px rgba(255,107,53,.12); }
        textarea.field-input { height:auto; padding:10px 12px; }
      `}</style>
    </div>
  );
}

/* ─── Delete Modal ───────────────────────────────────────────────────────── */
function DeleteModal({ topic, onClose, onDeleted }: { topic: Topic; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    const { error } = await createClient().from("resource_topics").delete().eq("id", topic.id);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    toast.success("Deleted"); onDeleted(); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mb-4"><Trash2 size={20} className="text-[#EF4444]"/></div>
        <h3 className="text-sm font-bold text-[#1A2035] mb-1">Delete this entry?</h3>
        <p className="text-xs text-[#7A869A] mb-1">
          <strong className="text-[#1A2035]">{topic.topic}</strong>{topic.subtopic ? ` › ${topic.subtopic}` : ""}
        </p>
        <p className="text-xs text-[#7A869A] mb-6">Existing resources using this topic are not affected.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E8EDF5] rounded-xl text-sm font-semibold text-[#7A869A]">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EF4444] text-white rounded-xl text-sm font-bold disabled:opacity-60">
            {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Subtopic row ───────────────────────────────────────────────────────── */
function SubtopicRow({ entry, onToggle, onEdit, onDelete }: {
  entry: Topic;
  onToggle: (id: string, cur: boolean) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
}) {
  return (
    <div className="flex items-center gap-3 pl-8 pr-4 py-2 hover:bg-[#FFFBEB] group transition-colors">
      <div className="w-px h-4 bg-[#E8EDF5] shrink-0" />
      <Tag size={10} className="text-[#CBD5E1] shrink-0" />
      <span className="text-xs text-[#475569] flex-1 truncate">{entry.subtopic ?? "—"}</span>
      {entry.description && <span className="text-[10px] text-[#CBD5E1] truncate max-w-[160px] hidden lg:block">{entry.description}</span>}
      <button onClick={() => onToggle(entry.id, entry.is_active)} className="flex items-center gap-1 text-[10px] font-semibold shrink-0 transition-colors"
        style={{ color: entry.is_active ? "#10B981" : "#CBD5E1" }}>
        {entry.is_active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
        <span className="hidden sm:inline">{entry.is_active ? "On" : "Off"}</span>
      </button>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(entry)} className="w-6 h-6 flex items-center justify-center rounded-lg text-[#7A869A] hover:text-[#FF6B35] hover:bg-[#FFF7F4]">
          <Edit2 size={11}/>
        </button>
        <button onClick={() => onDelete(entry)} className="w-6 h-6 flex items-center justify-center rounded-lg text-[#7A869A] hover:text-[#EF4444] hover:bg-[#FEF2F2]">
          <Trash2 size={11}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Topic group row (expandable) ──────────────────────────────────────── */
function TopicGroupRow({ group, onToggle, onEdit, onDelete, onAddSubtopic }: {
  group: TopicGroup;
  onToggle: (id: string, cur: boolean) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
  onAddSubtopic: (t: Topic) => void;
}) {
  // Find the "base" entry (no subtopic) or fall back to first
  const baseEntry = group.entries.find(e => !e.subtopic) ?? group.entries[0];
  const hasSubtopics = group.entries.some(e => e.subtopic);
  const subtopicEntries = group.entries.filter(e => e.subtopic);
  const [expanded, setExpanded] = useState(false);

  const activeCount = group.entries.filter(e => e.is_active).length;

  return (
    <div>
      {/* Topic header row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] group transition-colors cursor-pointer"
        onClick={() => hasSubtopics && setExpanded(e => !e)}
      >
        {/* Expand arrow */}
        <div className="w-5 shrink-0 flex items-center justify-center">
          {hasSubtopics
            ? <ChevronRight size={13} className="text-[#CBD5E1] transition-transform" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)" }} />
            : <div className="w-3 h-3 rounded-full border border-[#E8EDF5]" />}
        </div>

        {/* Topic name */}
        <span className="text-sm font-semibold text-[#1A2035] flex-1 truncate">{group.topicName}</span>

        {/* Subtopic count chip */}
        {hasSubtopics && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F0F4FA] text-[#7A869A] shrink-0">
            {subtopicEntries.length} subtopic{subtopicEntries.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Active badge */}
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${activeCount > 0 ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#F0F4FA] text-[#CBD5E1]"}`}>
          {activeCount > 0 ? `${activeCount} active` : "inactive"}
        </span>

        {/* Toggle base entry */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(baseEntry.id, baseEntry.is_active); }}
          className="shrink-0 transition-colors"
          title={baseEntry.is_active ? "Deactivate" : "Activate"}
        >
          {baseEntry.is_active
            ? <ToggleRight size={20} className="text-[#10B981]"/>
            : <ToggleLeft  size={20} className="text-[#CBD5E1]"/>}
        </button>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={() => onAddSubtopic(baseEntry)} title="Add subtopic"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[#7A869A] hover:text-[#FF6B35] hover:bg-[#FFF7F4] text-[10px] font-bold">
            +
          </button>
          <button onClick={() => onEdit(baseEntry)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[#7A869A] hover:text-[#FF6B35] hover:bg-[#FFF7F4]">
            <Edit2 size={11}/>
          </button>
          <button onClick={() => onDelete(baseEntry)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[#7A869A] hover:text-[#EF4444] hover:bg-[#FEF2F2]">
            <Trash2 size={11}/>
          </button>
        </div>
      </div>

      {/* Subtopics */}
      {expanded && subtopicEntries.length > 0 && (
        <div className="bg-[#FAFBFF] border-t border-[#F0F4FA]">
          {subtopicEntries.map(entry => (
            <SubtopicRow key={entry.id} entry={entry} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Class group (collapsible) ──────────────────────────────────────────── */
function ClassGroupSection({ cg, subjectColor, onToggle, onEdit, onDelete, onAddSubtopic, onAddTopicInClass }: {
  cg: ClassGroup;
  subjectColor: string;
  onToggle: (id: string, cur: boolean) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
  onAddSubtopic: (t: Topic) => void;
  onAddTopicInClass: (subject_name: string, class_no: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalTopics = cg.topicGroups.length;
  const activeTopics = cg.topicGroups.filter(g => g.baseActive).length;
  const subjectName = cg.topicGroups[0]?.entries[0]?.subject_name ?? "";

  return (
    <div className="border border-[#E8EDF5] rounded-xl overflow-hidden">
      {/* Class header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F0F4FA] transition-colors">
        <button className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setOpen(o => !o)}>
          <Layers size={13} style={{ color: subjectColor }} />
          <span className="text-xs font-bold text-[#1A2035]">Class {cg.class_no}</span>
          <span className="text-[9px] text-[#7A869A]">{totalTopics} topic{totalTopics !== 1 ? "s" : ""} · {activeTopics} active</span>
        </button>
        {/* Add topic to THIS class */}
        <button
          onClick={() => onAddTopicInClass(subjectName, cg.class_no)}
          title={`Add topic to Class ${cg.class_no}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#FF6B35] bg-[#FFF7F4] hover:bg-[#FFEDE6] transition-colors shrink-0"
        >
          <Plus size={10}/> Topic
        </button>
        <ChevronDown size={12} className="text-[#7A869A] transition-transform shrink-0 cursor-pointer"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          onClick={() => setOpen(o => !o)} />
      </div>

      {/* Topics */}
      {open && (
        <div className="divide-y divide-[#F0F4FA]">
          {cg.topicGroups.map(tg => (
            <TopicGroupRow
              key={tg.topicName}
              group={tg}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubtopic={onAddSubtopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Subject section ────────────────────────────────────────────────────── */
function SubjectSection({ sg, onToggle, onEdit, onDelete, onAddSubtopic, onAddTopicInClass, onAddTopicInSubject }: {
  sg: SubjectGroup;
  onToggle: (id: string, cur: boolean) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
  onAddSubtopic: (t: Topic) => void;
  onAddTopicInClass: (subject_name: string, class_no: number) => void;
  onAddTopicInSubject: (subject_name: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const color = SUBJECT_COLORS[sg.subject_name] ?? "#7A869A";
  const totalTopics = sg.classGroups.reduce((s, c) => s + c.topicGroups.length, 0);
  const activeTopics = sg.classGroups.reduce((s, c) => s + c.topicGroups.filter(g => g.baseActive).length, 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
      {/* Subject header */}
      <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
        <button className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setOpen(o => !o)}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-sm font-bold text-[#1A2035] text-left">{sg.subject_name}</span>
          <span className="text-[10px] text-[#7A869A]">
            {sg.classGroups.length} class{sg.classGroups.length !== 1 ? "es" : ""} · {totalTopics} topics · {activeTopics} active
          </span>
        </button>
        {/* Add to this subject (picks class in modal) */}
        <button
          onClick={() => onAddTopicInSubject(sg.subject_name)}
          title={`Add topic to ${sg.subject_name}`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#E8EDF5] text-[#7A869A] hover:text-[#FF6B35] hover:border-[#FF6B35] hover:bg-[#FFF7F4] transition-colors shrink-0"
        >
          <Plus size={10}/> Add Topic
        </button>
        <ChevronDown size={14} className="text-[#7A869A] transition-transform shrink-0 cursor-pointer"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          onClick={() => setOpen(o => !o)} />
      </div>

      {/* Class groups */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#F0F4FA]">
          <div className="h-2" />
          {sg.classGroups.map(cg => (
            <ClassGroupSection
              key={cg.class_no}
              cg={cg}
              subjectColor={color}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubtopic={onAddSubtopic}
              onAddTopicInClass={onAddTopicInClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function TopicsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();

  const [topics,        setTopics]        = useState<Topic[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [showModal,     setShowModal]     = useState(false);
  const [editingTopic,  setEditingTopic]  = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [prefill,       setPrefill]       = useState<Partial<Topic> | null>(null);

  useEffect(() => {
    if (!userLoading && user && user.role !== "CMS_ADMIN") router.replace("/cms/dashboard");
  }, [user, userLoading, router]);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createClient()
      .from("resource_topics").select("*")
      .order("priority", { ascending: false })
      .order("subject_name").order("class_no").order("topic").order("subtopic");
    if (error) toast.error("Failed to load topics");
    else setTopics(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  async function toggleActive(id: string, current: boolean) {
    const { error } = await createClient().from("resource_topics").update({ is_active: !current }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setTopics(ts => ts.map(t => t.id === id ? { ...t, is_active: !current } : t));
    toast.success(current ? "Deactivated" : "Activated");
  }

  function openEdit(t: Topic) { setEditingTopic(t); setPrefill(null); setShowModal(true); }

  // Add subtopic to existing topic (pre-fill subject + class + topic)
  function openAddSubtopic(base: Topic) {
    setEditingTopic(null);
    setPrefill({ subject_name: base.subject_name, class_no: base.class_no, topic: base.topic });
    setShowModal(true);
  }

  // Add new topic to existing class (pre-fill subject + class)
  function openAddTopicInClass(subject_name: string, class_no: number) {
    setEditingTopic(null);
    setPrefill({ subject_name, class_no });
    setShowModal(true);
  }

  // Add topic to existing subject (pre-fill subject only, user picks class)
  function openAddTopicInSubject(subject_name: string) {
    setEditingTopic(null);
    setPrefill({ subject_name });
    setShowModal(true);
  }

  function openAdd() { setEditingTopic(null); setPrefill(null); setShowModal(true); }

  // Filter + build hierarchy
  const filtered = search
    ? topics.filter(t =>
        t.topic.toLowerCase().includes(search.toLowerCase()) ||
        (t.subtopic ?? "").toLowerCase().includes(search.toLowerCase()) ||
        t.subject_name.toLowerCase().includes(search.toLowerCase())
      )
    : topics;

  const hierarchy = buildHierarchy(filtered);
  const activeCount   = topics.filter(t => t.is_active).length;
  const inactiveCount = topics.length - activeCount;

  if (userLoading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Topic Management</h1>
          <p className="text-sm text-[#7A869A]">
            Define approved topics per subject & class. Content staff must select an active topic when uploading.
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors">
          <Plus size={15}/> Add Topic
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
          <div className="text-2xl font-bold text-[#1A2035]">{topics.length}</div>
          <div className="text-xs text-[#7A869A] mt-0.5">Total Entries</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
          <div className="flex items-center gap-2"><CheckCircle size={16} className="text-[#10B981]"/>
            <div className="text-2xl font-bold text-[#10B981]">{activeCount}</div>
          </div>
          <div className="text-xs text-[#7A869A] mt-0.5">Active (visible in upload)</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
          <div className="flex items-center gap-2"><XCircle size={16} className="text-[#EF4444]"/>
            <div className="text-2xl font-bold text-[#EF4444]">{inactiveCount}</div>
          </div>
          <div className="text-xs text-[#7A869A] mt-0.5">Inactive (hidden from staff)</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search topics, subtopics, or subjects…"
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10"/>
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] hover:text-[#1A2035]"><X size={14}/></button>}
      </div>

      {/* Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#FF6B35]"/>
        </div>
      ) : hierarchy.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] text-center py-16">
          <BookOpen size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <div className="text-sm font-semibold text-[#1A2035] mb-1">
            {topics.length === 0 ? "No topics yet" : "No matches found"}
          </div>
          <div className="text-xs text-[#7A869A] mb-4">
            {topics.length === 0 ? "Add your first topic to let staff categorise uploads" : "Try a different search term"}
          </div>
          {topics.length === 0 && (
            <button onClick={openAdd} className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-xs font-bold">
              Add First Topic
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {hierarchy.map(sg => (
            <SubjectSection
              key={sg.subject_name}
              sg={sg}
              onToggle={toggleActive}
              onEdit={openEdit}
              onDelete={setDeletingTopic}
              onAddSubtopic={openAddSubtopic}
              onAddTopicInClass={openAddTopicInClass}
              onAddTopicInSubject={openAddTopicInSubject}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TopicModal
          editing={editingTopic}
          prefillData={prefill}
          onClose={() => { setShowModal(false); setEditingTopic(null); setPrefill(null); }}
          onSaved={loadTopics}
          userId={user?.id ?? ""}
        />
      )}
      {deletingTopic && (
        <DeleteModal topic={deletingTopic} onClose={() => setDeletingTopic(null)} onDeleted={loadTopics}/>
      )}
    </div>
  );
}

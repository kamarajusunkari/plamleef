"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Star, CheckCircle, Clock, XCircle,
  Plus, X, Loader2, BookOpen, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Resource {
  id: string; title: string; type: string; subject: string;
  topic: string | null; status: string; credits_awarded: number;
  download_count: number; created_at: string; exam_types: string[];
}
interface Profile { id: string; credit_balance: number; }

const RESOURCE_TYPES = ["NOTES","PYQ","MOCK_TEST","VIDEO","FLASHCARD"];
const EXAM_TYPES     = ["SSC","RRB","UPSC","BANK_PO","NDA","CTET","STATE_PSC","GENERAL"];
const SUBJECTS       = ["Mathematics","English","Reasoning","General Awareness","Science","History","Geography","Polity","Economics","Computer"];

const CREDIT_REWARDS: Record<string, number> = {
  NOTES: 5, PYQ: 10, MOCK_TEST: 20, VIDEO: 8, FLASHCARD: 5,
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  NOTES:     { bg: "#ECFDF5", color: "#10B981" },
  PYQ:       { bg: "#EFF6FF", color: "#3B82F6" },
  MOCK_TEST: { bg: "#F5F3FF", color: "#8B5CF6" },
  VIDEO:     { bg: "#FEF9C3", color: "#854D0E" },
  FLASHCARD: { bg: "#FFF7F4", color: "#FF6B35" },
};

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#F59E0B]">
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
    </div>
  );
}

export default function AspirantResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", type: "NOTES", subject: "", topic: "",
    description: "", exam_types: [] as string[], file_url: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: prof } = await supabase.from("aspirant_profiles")
        .select("id, credit_balance").eq("user_id", user.id).single();
      setProfile(prof as Profile ?? null);
      if (prof) {
        const { data } = await supabase.from("aspirant_resources")
          .select("*").eq("aspirant_id", prof.id).order("created_at", { ascending: false });
        setResources((data ?? []) as Resource[]);
      }
      setLoading(false);
    });
  }, []);

  function toggleExam(e: string) {
    setForm(f => ({
      ...f,
      exam_types: f.exam_types.includes(e) ? f.exam_types.filter(x => x !== e) : [...f.exam_types, e],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.subject) { toast.error("Title and subject are required"); return; }
    if (form.exam_types.length === 0) { toast.error("Select at least one exam type"); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("aspirant_resources").insert({
      aspirant_id: profile.id,
      title: form.title.trim(), type: form.type, subject: form.subject,
      topic: form.topic.trim() || null, description: form.description.trim() || null,
      exam_types: form.exam_types, file_url: form.file_url.trim() || null,
      status: "PENDING_REVIEW", credits_awarded: 0,
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error("Upload failed. Try again."); return; }
    toast.success(`Resource submitted! You'll earn ${CREDIT_REWARDS[form.type]} credits once approved.`);
    setResources(prev => [data as Resource, ...prev]);
    setForm({ title:"", type:"NOTES", subject:"", topic:"", description:"", exam_types:[], file_url:"" });
    setShowForm(false);
  }

  const totalEarned = resources.filter(r => r.status === "APPROVED").reduce((s, r) => s + r.credits_awarded, 0);
  const pending     = resources.filter(r => r.status === "PENDING_REVIEW").length;
  const approved    = resources.filter(r => r.status === "APPROVED").length;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Resources</h1>
          <p className="text-sm text-[#7A869A]">Upload study materials to earn credits</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-sm font-bold hover:bg-[#D97706] transition-colors">
          <Plus size={15}/> Upload Resource
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Credits Earned", value: totalEarned,       icon:<Star size={16}/>,      color:"#F59E0B", bg:"#FFFBEB" },
          { label:"Pending Review", value: pending,            icon:<Clock size={16}/>,      color:"#8B5CF6", bg:"#F5F3FF" },
          { label:"Approved",       value: approved,           icon:<CheckCircle size={16}/>,color:"#10B981", bg:"#ECFDF5" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Credit reward guide */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4">
        <div className="text-xs font-bold text-[#92400E] mb-2 flex items-center gap-2"><Star size={12}/> Credit Rewards for Approved Uploads</div>
        <div className="flex flex-wrap gap-2">
          {RESOURCE_TYPES.map(t => (
            <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: TYPE_STYLE[t]?.bg, color: TYPE_STYLE[t]?.color }}>
              {t} → +{CREDIT_REWARDS[t]} ⭐
            </span>
          ))}
        </div>
      </div>

      {/* Upload form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#E8EDF5] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1A2035]">Upload Resource</h2>
              <button onClick={() => setShowForm(false)} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Resource Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {RESOURCE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="py-2 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{
                        borderColor: form.type === t ? (TYPE_STYLE[t]?.color ?? "#F59E0B") : "#E8EDF5",
                        background: form.type === t ? (TYPE_STYLE[t]?.bg ?? "#FFFBEB") : "white",
                        color: form.type === t ? (TYPE_STYLE[t]?.color ?? "#F59E0B") : "#7A869A",
                      }}>
                      {t} {form.type === t && `(+${CREDIT_REWARDS[t]}⭐)`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. SSC CGL Algebra Notes 2024"
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]" required/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Subject *</label>
                  <Sel value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))}>
                    <option value="">Select subject</option>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </Sel>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Topic</label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="e.g. Algebra, Profit & Loss"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Relevant Exams * (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TYPES.map(e => (
                    <button key={e} type="button" onClick={() => toggleExam(e)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${form.exam_types.includes(e) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#7A869A] border-[#E8EDF5]"}`}>
                      {e.replace("_"," ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">File / Drive Link</label>
                <input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                  placeholder="https://drive.google.com/…"
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
                <p className="text-[10px] text-[#7A869A] mt-1">Paste a Google Drive / Dropbox link. Direct upload coming soon.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Brief description of what this resource covers…"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B] resize-none"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#7A869A] hover:bg-[#F8FAFC] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#D97706] disabled:opacity-50 transition-colors">
                  {submitting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resources list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#F59E0B]"/></div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <BookOpen size={36} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No uploads yet</p>
          <p className="text-xs text-[#7A869A] mt-1 mb-5">Share your notes and earn credits that unlock premium tests.</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-[#F59E0B] text-white rounded-xl text-sm font-bold hover:bg-[#D97706] transition-colors">
            Upload First Resource
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="grid px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
            style={{ gridTemplateColumns: "36px 1fr 90px 80px 70px 80px 70px" }}>
            <span/><span>Title</span><span>Type</span><span>Subject</span><span>Status</span><span className="text-right">Credits</span><span className="text-right">Downloads</span>
          </div>
          <div className="divide-y divide-[#F0F4FA]">
            {resources.map(r => {
              const ts = TYPE_STYLE[r.type] ?? { bg:"#F0F4FA", color:"#7A869A" };
              const statusStyle =
                r.status === "APPROVED"       ? { bg:"#ECFDF5", color:"#10B981", icon:<CheckCircle size={10}/>, label:"Approved" } :
                r.status === "PENDING_REVIEW" ? { bg:"#FFFBEB", color:"#F59E0B", icon:<Clock size={10}/>, label:"Pending" } :
                                                { bg:"#FEF2F2", color:"#EF4444", icon:<XCircle size={10}/>, label:"Rejected" };
              return (
                <div key={r.id} className="grid px-5 py-3 items-center gap-3"
                  style={{ gridTemplateColumns: "36px 1fr 90px 80px 70px 80px 70px" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={ts}>
                    <FileText size={14}/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</p>
                    {r.topic && <p className="text-[10px] text-[#7A869A] truncate">{r.topic}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={ts}>{r.type}</span>
                  <span className="text-[10px] text-[#7A869A]">{r.subject}</span>
                  <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.icon} {statusStyle.label}
                  </span>
                  <div className="text-right">
                    {r.credits_awarded > 0
                      ? <span className="text-xs font-bold text-[#F59E0B]">+{r.credits_awarded} ⭐</span>
                      : <span className="text-[10px] text-[#CBD5E1]">—</span>}
                  </div>
                  <div className="text-right text-[10px] text-[#7A869A]">{r.download_count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

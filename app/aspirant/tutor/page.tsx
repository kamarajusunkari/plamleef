"use client";
import React, { useState, useEffect } from "react";
import {
  UserCheck, Star, Clock, DollarSign, CheckCircle, AlertCircle,
  Loader2, ChevronDown, X, Shield, Zap, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface AspirantProfile { id: string; name: string; is_tutor: boolean; verification_status: string; }
interface TutorProfile {
  id: string; subjects: string[]; classes_taught: string[]; rate_per_hour: number;
  bio: string | null; status: string; rejection_reason: string | null;
  rating: number; total_sessions: number; exam_score_proof: string | null;
}
interface Session {
  id: string; subject: string; class_level: string | null; scheduled_at: string;
  duration_minutes: number; total_amount: number; tutor_earnings: number;
  status: string; rating: number | null; review: string | null;
}

const SUBJECTS  = ["Mathematics","English","Reasoning","Science","Hindi","Social Studies","Physics","Chemistry","Biology","General Awareness"];
const CLASSES   = ["1","2","3","4","5","6","7","8","9","10","11","12"];

function Sel({ value, onChange, children }: { value: string; onChange: (v:string)=>void; children: React.ReactNode }) {
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

function MultiToggle({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]);
  }
  return (
    <div>
      <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${selected.includes(o) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#7A869A] border-[#E8EDF5]"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AspirantTutorPage() {
  const [aspirant,  setAspirant]  = useState<AspirantProfile | null>(null);
  const [tutor,     setTutor]     = useState<TutorProfile | null>(null);
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    subjects: [] as string[], classes_taught: [] as string[],
    rate_per_hour: 200, bio: "", exam_score_proof: "", id_proof: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: asp } = await supabase.from("aspirant_profiles")
        .select("id, name, is_tutor, verification_status").eq("user_id", user.id).single();
      setAspirant(asp as AspirantProfile ?? null);

      if (asp) {
        const [{ data: tp }, { data: sess }] = await Promise.all([
          supabase.from("tutor_profiles").select("*").eq("aspirant_id", asp.id).single(),
          supabase.from("tutor_sessions")
            .select("id, subject, class_level, scheduled_at, duration_minutes, total_amount, tutor_earnings, status, rating, review")
            .order("scheduled_at", { ascending: false }).limit(20),
        ]);
        if (tp) {
          setTutor(tp as TutorProfile);
          setForm({ subjects: tp.subjects ?? [], classes_taught: tp.classes_taught ?? [],
            rate_per_hour: tp.rate_per_hour, bio: tp.bio ?? "", exam_score_proof: tp.exam_score_proof ?? "", id_proof: "" });
        }
        setSessions((sess ?? []) as Session[]);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!aspirant) return;
    if (form.subjects.length === 0) { toast.error("Select at least one subject"); return; }
    if (form.classes_taught.length === 0) { toast.error("Select at least one class"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      aspirant_id: aspirant.id,
      subjects: form.subjects, classes_taught: form.classes_taught,
      rate_per_hour: form.rate_per_hour, bio: form.bio.trim() || null,
      exam_score_proof: form.exam_score_proof.trim() || null,
      status: "PENDING",
    };
    let error;
    if (tutor) {
      ({ error } = await supabase.from("tutor_profiles").update(payload).eq("id", tutor.id));
    } else {
      const { data: newTutor, error: e2 } = await supabase.from("tutor_profiles").insert(payload).select().single();
      error = e2;
      if (newTutor) setTutor(newTutor as TutorProfile);
      await supabase.from("aspirant_profiles").update({ is_tutor: true }).eq("id", aspirant.id);
      setAspirant(a => a ? { ...a, is_tutor: true } : a);
    }
    setSaving(false);
    if (error) { toast.error("Save failed. Try again."); return; }
    toast.success(tutor ? "Profile updated!" : "Application submitted! We'll verify and approve within 48 hours.");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F59E0B]"/>
    </div>
  );

  const statusMeta =
    tutor?.status === "APPROVED"  ? { color:"#10B981", bg:"#ECFDF5", label:"Approved — You are live on the platform!", icon:<CheckCircle size={14}/> } :
    tutor?.status === "PENDING"   ? { color:"#F59E0B", bg:"#FFFBEB", label:"Under Review — We'll approve within 48 hours.", icon:<Clock size={14}/> } :
    tutor?.status === "REJECTED"  ? { color:"#EF4444", bg:"#FEF2F2", label:`Rejected: ${tutor.rejection_reason ?? "See details below"}`, icon:<AlertCircle size={14}/> } :
    tutor?.status === "SUSPENDED" ? { color:"#F59E0B", bg:"#FFFBEB", label:"Suspended — Contact support.", icon:<AlertCircle size={14}/> } : null;

  const totalEarnings = sessions.filter(s => s.status === "COMPLETED").reduce((sum, s) => sum + s.tutor_earnings, 0);
  const avgRating = sessions.filter(s => s.rating !== null).length > 0
    ? (sessions.filter(s => s.rating !== null).reduce((s, x) => s + (x.rating ?? 0), 0) / sessions.filter(s => s.rating !== null).length).toFixed(1)
    : null;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Tutor Profile</h1>
        <p className="text-sm text-[#7A869A]">Teach school students online and earn money</p>
      </div>

      {/* Status banner */}
      {statusMeta && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border" style={{ background: statusMeta.bg, borderColor: statusMeta.color + "40" }}>
          <span style={{ color: statusMeta.color }}>{statusMeta.icon}</span>
          <p className="text-sm font-semibold" style={{ color: statusMeta.color }}>{statusMeta.label}</p>
        </div>
      )}

      {/* How it works */}
      {!tutor && (
        <div className="bg-gradient-to-br from-[#FF6B35] to-[#F59E0B] rounded-2xl p-5 text-white">
          <div className="font-bold text-sm mb-3 flex items-center gap-2"><Zap size={16}/> How Tutoring Works</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { step:"1", title:"Apply", desc:"Fill your profile, upload ID and score proof" },
              { step:"2", title:"Get Verified", desc:"We verify within 48 hours, then you go live" },
              { step:"3", title:"Earn Money", desc:"Parents book you. You keep 85% of every session" },
            ].map(s => (
              <div key={s.step}>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black mb-2">{s.step}</div>
                <div className="text-xs font-bold mb-0.5">{s.title}</div>
                <div className="text-[10px] text-white/70">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-white/10 rounded-xl text-[10px] text-white/80 flex items-center gap-2">
            <Shield size={12}/> EduBattle takes 15% platform fee. You earn 85% of every session fee.
          </div>
        </div>
      )}

      {/* Stats (if approved tutor) */}
      {tutor?.status === "APPROVED" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:"Total Sessions",  value: tutor.total_sessions, icon:<BookOpen size={16}/>, color:"#3B82F6", bg:"#EFF6FF" },
            { label:"Total Earnings",  value: `₹${totalEarnings}`,  icon:<DollarSign size={16}/>, color:"#10B981", bg:"#ECFDF5" },
            { label:"Avg Rating",      value: avgRating ? `${avgRating} ★` : "—", icon:<Star size={16}/>, color:"#F59E0B", bg:"#FFFBEB" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
              <div className="text-xs text-[#7A869A]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Profile form */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8EDF5] flex items-center gap-2">
          <UserCheck size={16} className="text-[#F59E0B]"/>
          <span className="text-sm font-bold text-[#1A2035]">{tutor ? "Edit Tutor Profile" : "Apply to Become a Tutor"}</span>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <MultiToggle label="Subjects You Teach *"
            options={SUBJECTS} selected={form.subjects}
            onChange={v => setForm(f => ({ ...f, subjects: v }))} />

          <MultiToggle label="Classes You Teach *"
            options={CLASSES} selected={form.classes_taught}
            onChange={v => setForm(f => ({ ...f, classes_taught: v }))} />

          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
              Rate per Hour (₹) *
            </label>
            <input type="number" value={form.rate_per_hour} min={100} max={2000}
              onChange={e => setForm(f => ({ ...f, rate_per_hour: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
            <p className="text-[10px] text-[#7A869A] mt-1">
              You earn ₹{Math.round(form.rate_per_hour * 0.85)}/hr (85%). Platform fee: ₹{Math.round(form.rate_per_hour * 0.15)}/hr (15%).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">About You</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} placeholder="Tell parents and students about your background, experience, and teaching style…"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B] resize-none"/>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
              Exam Score Proof (link to result / marksheet)
            </label>
            <input value={form.exam_score_proof} onChange={e => setForm(f => ({ ...f, exam_score_proof: e.target.value }))}
              placeholder="https://drive.google.com/… (SSC CGL result, UPSC prelim scorecard, etc.)"
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#F59E0B] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#D97706] disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <UserCheck size={14}/>}
              {tutor ? "Save Changes" : "Submit Application"}
            </button>
          </div>
        </form>
      </div>

      {/* Sessions */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8EDF5] text-sm font-bold text-[#1A2035]">My Sessions</div>
          <div className="divide-y divide-[#F0F4FA]">
            {sessions.map(s => {
              const statusStyle =
                s.status === "COMPLETED"  ? { bg:"#ECFDF5", color:"#10B981", label:"Completed" } :
                s.status === "CONFIRMED"  ? { bg:"#EFF6FF", color:"#3B82F6", label:"Confirmed" } :
                s.status === "PENDING"    ? { bg:"#FFFBEB", color:"#F59E0B", label:"Pending" } :
                s.status === "CANCELLED"  ? { bg:"#FEF2F2", color:"#EF4444", label:"Cancelled" } :
                                            { bg:"#F0F4FA", color:"#7A869A", label: s.status };
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035]">{s.subject} — Class {s.class_level ?? "—"}</p>
                    <p className="text-[10px] text-[#7A869A]">
                      {new Date(s.scheduled_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"numeric", minute:"numeric" })}
                      {" · "}{s.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#10B981]">₹{s.tutor_earnings}</div>
                    <div className="text-[9px] text-[#7A869A]">Your share</div>
                  </div>
                  {s.rating && (
                    <div className="text-xs font-bold text-[#F59E0B]">{"★".repeat(s.rating)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

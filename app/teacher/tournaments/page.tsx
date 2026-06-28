"use client";
import React, { useState, useEffect } from "react";
import {
  Trophy, Plus, Loader2, ChevronDown, Users, Clock,
  CheckCircle, Star, Trash2, Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface Quiz { id: string; title: string; subject_name: string; count: number }
interface Tournament {
  id: string; title: string; status: string; scope: string;
  banner_emoji: string; starts_at: string; ends_at: string;
  prize_xp_1st: number; participant_count: number; quiz_title: string;
}

const EMOJIS = ["🏆","⚡","🧠","🎯","🔥","🌟","🚀","🎮","📚","💡"];
const SCOPES  = [{ value:"CLASS", label:"My Class only" }, { value:"SCHOOL", label:"Whole School" }];

export default function TeacherTournamentsPage() {
  const { user } = useCurrentUser();
  const [quizzes,      setQuizzes]      = useState<Quiz[]>([]);
  const [tournaments,  setTournaments]  = useState<Tournament[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", quiz_id: "", scope: "CLASS",
    banner_emoji: "🏆", starts_at: "", ends_at: "",
    max_participants: 50, entry_xp: 0,
    prize_xp_1st: 200, prize_xp_2nd: 100, prize_xp_3rd: 50,
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      const supabase = createClient();

      const { data: qData } = await supabase
        .from("quiz").select("id, title, count, subjects!quiz_subject_id_fkey(name)")
        .eq("is_published", true).order("created_at", { ascending: false });

      setQuizzes(((qData ?? []) as any[]).map(q => ({
        id: q.id, title: q.title, count: q.count ?? 0,
        subject_name: (q.subjects as any)?.name ?? "General",
      })));

      const { data: tData } = await supabase
        .from("tournaments")
        .select("*, quiz!tournaments_quiz_id_fkey(title)")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      const tIds = (tData ?? []).map((t: any) => t.id);
      let countMap: Record<string, number> = {};
      if (tIds.length) {
        const { data: pData } = await supabase
          .from("tournament_participants").select("tournament_id").in("tournament_id", tIds);
        (pData ?? []).forEach((r: any) => { countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1; });
      }

      setTournaments(((tData ?? []) as any[]).map(t => ({
        ...t, quiz_title: (t.quiz as any)?.title ?? "Quiz", participant_count: countMap[t.id] ?? 0,
      })));
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.quiz_id || !form.starts_at || !form.ends_at) {
      toast.error("Fill all required fields"); return;
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast.error("End time must be after start time"); return;
    }
    setCreating(true);
    const { data, error } = await createClient().from("tournaments").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      quiz_id: form.quiz_id,
      created_by: user?.id,
      creator_role: "TEACHER",
      school_id: user?.schoolId ?? null,
      scope: form.scope,
      format: "BLITZ",
      status: new Date(form.starts_at) <= new Date() ? "ACTIVE" : "UPCOMING",
      banner_emoji: form.banner_emoji,
      max_participants: form.max_participants,
      entry_xp: form.entry_xp,
      prize_xp_1st: form.prize_xp_1st,
      prize_xp_2nd: form.prize_xp_2nd,
      prize_xp_3rd: form.prize_xp_3rd,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
    }).select("*, quiz!tournaments_quiz_id_fkey(title)").single();

    setCreating(false);
    if (error) { toast.error("Failed to create tournament"); return; }
    toast.success("Tournament created! 🏆");
    setTournaments(prev => [{ ...(data as any), quiz_title: (data?.quiz as any)?.title ?? "Quiz", participant_count: 0 }, ...prev]);
    setShowForm(false);
    setForm({ title:"", description:"", quiz_id:"", scope:"CLASS", banner_emoji:"🏆", starts_at:"", ends_at:"", max_participants:50, entry_xp:0, prize_xp_1st:200, prize_xp_2nd:100, prize_xp_3rd:50 });
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    UPCOMING:  { bg:"#EFF6FF", color:"#3B82F6", label:"Upcoming" },
    ACTIVE:    { bg:"#ECFDF5", color:"#10B981", label:"● Live" },
    COMPLETED: { bg:"#F0F4FA", color:"#7A869A", label:"Ended" },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">🏆 My Tournaments</h1>
          <p className="text-sm text-[#7A869A]">Create and manage quiz tournaments for your students</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#E55A28] transition-colors">
          <Plus size={16}/> Create Tournament
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8EDF5] bg-[#FFF7F4]">
            <div className="text-sm font-bold text-[#1A2035]">New Tournament</div>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            {/* Emoji picker */}
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-2 block">Banner Emoji</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setForm(f => ({ ...f, banner_emoji: e }))}
                    className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${form.banner_emoji === e ? "border-[#FF6B35] bg-[#FFF7F4]" : "border-[#E8EDF5] hover:border-[#FF6B35]"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                  placeholder="e.g. Math Masters Championship"
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Tell students about this tournament…"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] resize-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Quiz *</label>
                <div className="relative">
                  <select value={form.quiz_id} onChange={e => setForm(f => ({ ...f, quiz_id: e.target.value }))} required
                    className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
                    <option value="">Select a quiz…</option>
                    {quizzes.map(q => <option key={q.id} value={q.id}>{q.title} ({q.count} Qs)</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Scope</label>
                <div className="relative">
                  <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                    className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
                    {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Starts At *</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Ends At *</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} required
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
              </div>
            </div>

            {/* Prizes */}
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-2 block">XP Prizes</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key:"prize_xp_1st" as const, medal:"🥇", label:"1st" },
                  { key:"prize_xp_2nd" as const, medal:"🥈", label:"2nd" },
                  { key:"prize_xp_3rd" as const, medal:"🥉", label:"3rd" },
                ].map(p => (
                  <div key={p.key}>
                    <label className="text-[10px] text-[#7A869A] block mb-1">{p.medal} {p.label}</label>
                    <input type="number" value={form[p.key]} onChange={e => setForm(f => ({ ...f, [p.key]: Number(e.target.value) }))} min={0}
                      className="w-full h-9 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F0F4FA] text-[#1A2035] text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#E55A28] transition-colors">
                {creating ? <Loader2 size={14} className="animate-spin"/> : <Trophy size={14}/>}
                Create Tournament
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Trophy size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No tournaments yet</p>
          <p className="text-xs text-[#7A869A] mt-1">Create your first tournament to motivate students!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => {
            const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.UPCOMING;
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-[#E8EDF5] p-5 flex gap-4">
                <div className="text-3xl shrink-0">{t.banner_emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                    <span className="text-[9px] text-[#7A869A] font-semibold">{t.scope}</span>
                  </div>
                  <p className="text-sm font-bold text-[#1A2035]">{t.title}</p>
                  <p className="text-[10px] text-[#7A869A]">{t.quiz_title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#7A869A]">
                    <span><Users size={10} className="inline"/> {t.participant_count} joined</span>
                    <span><Star size={10} className="inline text-[#F59E0B]"/> {t.prize_xp_1st} XP top prize</span>
                    <span><Clock size={10} className="inline"/> {new Date(t.starts_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

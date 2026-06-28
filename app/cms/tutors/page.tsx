"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Clock, CheckCircle, Loader2, X, Users, XCircle,
  GraduationCap, MapPin, Globe, IndianRupee, Award,
  BadgeCheck, Search, BookOpen, Video, Home, Phone,
  ToggleLeft, ToggleRight, AlertTriangle, RefreshCw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TutorApp {
  id: string;
  user_id: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  qualifications: string | null;
  experience_years: number;
  phone: string | null;
  location: string | null;
  subjects: string[];
  boards: string[];
  grades: string[];
  languages: string[];
  mode: string;
  hourly_rate: number;
  availability: Record<string, string[]>;
  status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  is_active: boolean;
  total_students: number;
  total_sessions: number;
  avg_rating: number;
  created_at: string;
  // joined
  teacher_name: string;
  teacher_email: string;
}

type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ALL";

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; color: string; label: string; border: string }> = {
  PENDING:   { bg: "#FFFBEB", color: "#F59E0B", label: "Pending",   border: "#FDE68A" },
  APPROVED:  { bg: "#ECFDF5", color: "#10B981", label: "Approved",  border: "#A7F3D0" },
  REJECTED:  { bg: "#FEF2F2", color: "#EF4444", label: "Rejected",  border: "#FECACA" },
  SUSPENDED: { bg: "#F0F4FA", color: "#7A869A", label: "Suspended", border: "#CBD5E1" },
  DRAFT:     { bg: "#F5F3FF", color: "#8B5CF6", label: "Draft",     border: "#DDD6FE" },
};

const TABS: TabKey[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "ALL"];

// ─── Small helpers ─────────────────────────────────────────────────────────────
function TagList({ items, color, bg }: { items: string[]; color: string; bg: string }) {
  if (!items?.length) return <span className="text-[10px] text-[#CBD5E1]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(i => (
        <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: bg, color }}>{i}</span>
      ))}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1.5">{text}</div>;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CmsTutorsPage() {
  const [apps,          setApps]          = useState<TutorApp[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<TutorApp | null>(null);
  const [tab,           setTab]           = useState<TabKey>("PENDING");
  const [saving,        setSaving]        = useState(false);
  const [rejectNote,    setRejectNote]    = useState("");
  const [confirmAction, setConfirmAction] = useState<"reject" | "suspend" | null>(null);
  const [search,        setSearch]        = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("tutor_profiles")
      .select("*")
      .neq("status", "DRAFT")          // Drafts not visible to admin
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Tutor applications load error:", error);
      toast.error(error.message || "Failed to load applications.");
      setLoading(false);
      return;
    }

    // Fetch teacher emails separately from public.users
    const userIds = (data ?? []).map((t: Record<string, unknown>) => t.user_id as string).filter(Boolean);
    let emailMap: Record<string, string> = {};
    let nameMap:  Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);
      (users ?? []).forEach((u: { id: string; name?: string; email?: string }) => {
        emailMap[u.id] = u.email ?? "";
        nameMap[u.id]  = u.name  ?? "";
      });
    }

    const mapped: TutorApp[] = ((data ?? []) as Record<string, unknown>[]).map(t => ({
      ...(t as unknown as TutorApp),
      teacher_name:  nameMap[t.user_id as string]  || (t.display_name as string) || "Unknown",
      teacher_email: emailMap[t.user_id as string] || "",
    }));

    setApps(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived counts ────────────────────────────────────────────────────────
  const counts = {
    ALL:       apps.length,
    PENDING:   apps.filter(a => a.status === "PENDING").length,
    APPROVED:  apps.filter(a => a.status === "APPROVED").length,
    REJECTED:  apps.filter(a => a.status === "REJECTED").length,
    SUSPENDED: apps.filter(a => a.status === "SUSPENDED").length,
  };

  const filtered = apps.filter(a => {
    const matchTab    = tab === "ALL" || a.status === tab;
    const q           = search.trim().toLowerCase();
    const matchSearch = !q ||
      a.teacher_name.toLowerCase().includes(q) ||
      a.teacher_email.toLowerCase().includes(q) ||
      (a.subjects ?? []).some(s => s.toLowerCase().includes(q)) ||
      (a.location ?? "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  async function updateStatus(app: TutorApp, updates: Partial<TutorApp>, msg: string) {
    setSaving(true);
    const { error } = await createClient()
      .from("tutor_profiles")
      .update({ ...updates, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);
    setSaving(false);
    if (error) { toast.error("Action failed. Please retry."); return; }
    toast.success(msg);
    const updated = { ...app, ...updates };
    setApps(prev => prev.map(a => a.id === app.id ? updated : a));
    setSelected(updated);
    setConfirmAction(null);
    setRejectNote("");
  }

  function approve(app: TutorApp) {
    updateStatus(app, {
      status: "APPROVED",
      is_active: true,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    } as Partial<TutorApp>, `${app.teacher_name} approved as tutor ✅`);
  }

  function reject(app: TutorApp) {
    if (!rejectNote.trim()) { toast.error("Please provide a rejection reason."); return; }
    updateStatus(app, { status: "REJECTED", rejection_reason: rejectNote } as Partial<TutorApp>, "Application rejected.");
  }

  function suspend(app: TutorApp) {
    updateStatus(app, { status: "SUSPENDED", is_active: false } as Partial<TutorApp>, "Tutor suspended.");
  }

  function reinstate(app: TutorApp) {
    updateStatus(app, { status: "APPROVED", is_active: true, approved_at: new Date().toISOString() } as Partial<TutorApp>, "Tutor reinstated ✅");
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 animate-fadeIn" style={{ minHeight: "calc(100vh - 80px)" }}>
      <Toaster position="top-right" />

      {/* ── LEFT: List ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#1A2035]">Tutor Applications</h1>
            <p className="text-sm text-[#7A869A]">Review applications from teachers who want to tutor students</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: "Total",    v: counts.ALL,       color: "#3B82F6", bg: "#EFF6FF", Icon: Users },
            { label: "Pending",  v: counts.PENDING,   color: "#F59E0B", bg: "#FFFBEB", Icon: Clock },
            { label: "Approved", v: counts.APPROVED,  color: "#10B981", bg: "#ECFDF5", Icon: BadgeCheck },
            { label: "Rejected", v: counts.REJECTED,  color: "#EF4444", bg: "#FEF2F2", Icon: XCircle },
          ] as const).map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E8EDF5] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <s.Icon size={16} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#1A2035]">{s.v}</div>
                <div className="text-[10px] text-[#7A869A]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl flex-wrap">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${tab === t ? "bg-white text-[#1A2035] shadow-sm" : "text-[#7A869A] hover:text-[#1A2035]"}`}>
                {t === "ALL" ? `All (${counts.ALL})` : `${STATUS_CFG[t]?.label} (${counts[t]})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs h-9 px-3 bg-white rounded-xl border border-[#E8EDF5]">
            <Search size={13} className="text-[#7A869A] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, subject, city…"
              className="flex-1 text-xs text-[#1A2035] bg-transparent outline-none placeholder-[#CBD5E1]" />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#7A869A] hover:text-[#1A2035]"><X size={11} /></button>
            )}
          </div>
        </div>

        {/* Pending alert banner */}
        {counts.PENDING > 0 && tab !== "PENDING" && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs font-semibold text-[#F59E0B]">
            <Clock size={13} /> {counts.PENDING} application{counts.PENDING !== 1 ? "s" : ""} waiting for review
            <button onClick={() => setTab("PENDING")} className="ml-auto text-[10px] underline underline-offset-2 font-bold">View →</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
            <GraduationCap size={36} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#1A2035]">No applications found</p>
            <p className="text-xs text-[#7A869A] mt-1">{search ? "Try a different search term" : "No tutor applications in this category yet"}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
            {/* Table head */}
            <div className="hidden sm:grid px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
              style={{ gridTemplateColumns: "1fr 160px 64px 90px 88px" }}>
              <span>Teacher</span><span>Subjects</span><span>Rate</span><span>Status</span><span className="text-right">Submitted</span>
            </div>

            <div className="divide-y divide-[#F8FAFC]">
              {filtered.map(app => {
                const st = STATUS_CFG[app.status] ?? STATUS_CFG.PENDING;
                const sel = selected?.id === app.id;
                const initials = (app.teacher_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={app.id}
                    onClick={() => { setSelected(sel ? null : app); setConfirmAction(null); setRejectNote(""); }}
                    className="flex sm:grid px-4 py-3 items-center gap-3 cursor-pointer hover:bg-[#FAFBFF] transition-colors"
                    style={{ gridTemplateColumns: "1fr 160px 64px 90px 88px", background: sel ? "#FFF7F4" : undefined }}>

                    {/* Teacher */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>{initials}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1A2035] truncate">{app.teacher_name}</p>
                        <p className="text-[10px] text-[#7A869A] truncate">{app.teacher_email}</p>
                      </div>
                    </div>

                    {/* Subjects */}
                    <div className="hidden sm:flex flex-wrap gap-0.5">
                      {(app.subjects ?? []).slice(0, 2).map(s => (
                        <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{s}</span>
                      ))}
                      {(app.subjects ?? []).length > 2 && <span className="text-[9px] text-[#7A869A]">+{app.subjects.length - 2}</span>}
                    </div>

                    {/* Rate */}
                    <span className="hidden sm:block text-xs font-semibold text-[#1A2035]">₹{app.hourly_rate}</span>

                    {/* Status */}
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full w-fit shrink-0"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>

                    {/* Date */}
                    <span className="hidden sm:block text-right text-[10px] text-[#7A869A]">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Detail panel ── */}
      {selected && (() => {
        const st = STATUS_CFG[selected.status] ?? STATUS_CFG.PENDING;
        const initials = (selected.teacher_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const modeLabel = ({ online: "Online Only", offline: "In-person", both: "Online & In-person" } as Record<string, string>)[selected.mode] ?? selected.mode;
        const totalSlots = Object.values(selected.availability ?? {}).flat().length;

        return (
          <div className="w-[380px] shrink-0 bg-white rounded-2xl border border-[#E8EDF5] flex flex-col sticky top-5 overflow-hidden"
            style={{ maxHeight: "calc(100vh - 110px)" }}>

            {/* ── Panel header ── */}
            <div className="shrink-0">
              {/* Gradient bar */}
              <div className="h-11 relative" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
                <button onClick={() => setSelected(null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center text-white transition-colors">
                  <X size={12} />
                </button>
              </div>

              <div className="px-5 pb-4 pt-2 border-b border-[#E8EDF5]">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-10 h-10 rounded-xl -mt-5 border-2 border-white flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>{initials}</div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-[#1A2035] truncate leading-tight">{selected.teacher_name}</p>
                    <p className="text-[10px] text-[#7A869A] truncate">{selected.teacher_email}</p>
                  </div>
                </div>
                {selected.tagline && <p className="text-[10px] text-[#7A869A] mb-2">{selected.tagline}</p>}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  {selected.status === "APPROVED" && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${selected.is_active ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#F0F4FA] text-[#7A869A]"}`}>
                      {selected.is_active ? "● Accepting Students" : "Not Accepting"}
                    </span>
                  )}
                  {selected.submitted_at && (
                    <span className="text-[9px] text-[#7A869A]">
                      · {new Date(selected.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Rate/hr",  value: `₹${selected.hourly_rate}`,   color: "#F59E0B" },
                  { label: "Exp.",     value: `${selected.experience_years} yr${selected.experience_years !== 1 ? "s" : ""}`, color: "#8B5CF6" },
                  { label: "Slots/wk", value: totalSlots > 0 ? totalSlots : "—",  color: "#3B82F6" },
                ].map(s => (
                  <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-2.5 text-center">
                    <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] text-[#7A869A]">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#7A869A]">
                {selected.mode && (
                  <span className="flex items-center gap-1">
                    {selected.mode === "online" && <Video size={11} />}
                    {selected.mode === "offline" && <Home size={11} />}
                    {selected.mode === "both" && <Globe size={11} />}
                    {modeLabel}
                  </span>
                )}
                {selected.location && <span className="flex items-center gap-1"><MapPin size={11} /> {selected.location}</span>}
                {selected.phone && <span className="flex items-center gap-1"><Phone size={11} /> {selected.phone}</span>}
              </div>

              {/* Bio */}
              {selected.bio && (
                <div>
                  <SectionLabel text="About" />
                  <p className="text-xs text-[#1A2035] leading-relaxed bg-[#F8FAFC] rounded-xl p-3">{selected.bio}</p>
                </div>
              )}

              {/* Qualifications */}
              {selected.qualifications && (
                <div>
                  <SectionLabel text="Qualifications" />
                  <p className="text-xs text-[#1A2035] bg-[#F8FAFC] rounded-xl p-3">{selected.qualifications}</p>
                </div>
              )}

              {/* Subjects */}
              {(selected.subjects ?? []).length > 0 && (
                <div>
                  <SectionLabel text="Subjects" />
                  <TagList items={selected.subjects} color="#3B82F6" bg="#EFF6FF" />
                </div>
              )}

              {/* Grades + Boards */}
              <div className="grid grid-cols-2 gap-3">
                {(selected.grades ?? []).length > 0 && (
                  <div>
                    <SectionLabel text="Grades" />
                    <TagList items={selected.grades} color="#10B981" bg="#ECFDF5" />
                  </div>
                )}
                {(selected.boards ?? []).length > 0 && (
                  <div>
                    <SectionLabel text="Boards" />
                    <TagList items={selected.boards} color="#8B5CF6" bg="#F5F3FF" />
                  </div>
                )}
              </div>

              {/* Languages */}
              {(selected.languages ?? []).length > 0 && (
                <div>
                  <SectionLabel text="Languages" />
                  <TagList items={selected.languages} color="#FF6B35" bg="#FFF7F4" />
                </div>
              )}

              {/* Availability summary */}
              {totalSlots > 0 && (
                <div>
                  <SectionLabel text="Availability" />
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selected.availability ?? {})
                      .filter(([, slots]) => slots.length > 0)
                      .map(([day, slots]) => (
                        <span key={day} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#8B5CF6]">
                          {day} ({slots.length})
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {selected.status === "REJECTED" && selected.rejection_reason && (
                <div className="bg-[#FEF2F2] rounded-xl p-3 border border-[#FECACA]">
                  <SectionLabel text="Rejection Reason" />
                  <p className="text-xs text-[#EF4444]">{selected.rejection_reason}</p>
                </div>
              )}

              {/* ── Action zone ── */}
              <div className="border-t border-[#E8EDF5] pt-4 space-y-2">

                {/* Default buttons */}
                {confirmAction === null && (
                  <>
                    {(selected.status === "PENDING" || selected.status === "REJECTED") && (
                      <button onClick={() => approve(selected)} disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Approve Tutor
                      </button>
                    )}

                    {selected.status === "SUSPENDED" && (
                      <button onClick={() => reinstate(selected)} disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Reinstate Tutor
                      </button>
                    )}

                    {(selected.status === "PENDING" || selected.status === "APPROVED") && (
                      <button onClick={() => setConfirmAction("reject")}
                        className="w-full py-2.5 rounded-xl border-2 border-[#EF4444] text-[#EF4444] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#FEF2F2] transition-colors">
                        <XCircle size={13} />
                        {selected.status === "APPROVED" ? "Revoke & Reject" : "Reject Application"}
                      </button>
                    )}

                    {selected.status === "APPROVED" && (
                      <button onClick={() => setConfirmAction("suspend")}
                        className="w-full py-2.5 rounded-xl bg-[#F0F4FA] hover:bg-[#E8EDF5] text-[#7A869A] text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                        <AlertTriangle size={13} /> Suspend Tutor
                      </button>
                    )}
                  </>
                )}

                {/* Reject form */}
                {confirmAction === "reject" && (
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Rejection Reason *</div>
                    <textarea
                      value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                      rows={3}
                      placeholder="Give clear, actionable feedback so the teacher can improve and reapply…"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#EF4444] resize-none placeholder-[#CBD5E1]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setConfirmAction(null); setRejectNote(""); }}
                        className="flex-1 py-2 rounded-xl bg-[#F0F4FA] text-[#7A869A] text-xs font-semibold hover:bg-[#E8EDF5] transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => reject(selected)} disabled={saving}
                        className="flex-1 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Suspend confirm */}
                {confirmAction === "suspend" && (
                  <div className="space-y-2.5">
                    <div className="px-3 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
                      <p className="text-xs text-[#92400E] font-medium">Suspending will immediately hide this tutor from all student search results. You can reinstate later.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmAction(null)}
                        className="flex-1 py-2 rounded-xl bg-[#F0F4FA] text-[#7A869A] text-xs font-semibold hover:bg-[#E8EDF5] transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => suspend(selected)} disabled={saving}
                        className="flex-1 py-2 rounded-xl bg-[#7A869A] hover:bg-[#64748B] text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                        Confirm Suspend
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

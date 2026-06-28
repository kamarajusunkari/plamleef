"use client";
import React, { useState, useEffect } from "react";
import {
  Search, Loader2, CheckCircle, X,
  Calendar, ChevronDown, Send, MapPin, Clock, Monitor, Home, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tutor {
  id: string;
  user_id: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  qualifications: string | null;
  experience_years: number;
  subjects: string[];
  grades: string[];
  boards: string[];
  languages: string[];
  mode: string;
  hourly_rate: number;
  avg_rating: number;
  total_sessions: number;
  total_students: number;
  location: string | null;
  phone: string | null;
  // from users table
  user_name: string;
  user_email: string;
}

interface BookingForm {
  subject: string;
  grade: string;
  scheduled_at: string;
  duration_minutes: number;
  notes: string;
}

const DURATIONS = [30, 45, 60, 90, 120];

const MODE_LABEL: Record<string, string> = {
  online: "Online only",
  offline: "Home visits only",
  both: "Online & home visits",
};

function avatarColor(name: string): string {
  const colors = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function Stars({ rating }: { rating: number }) {
  if (!rating) return <span className="text-[10px] text-[#7A869A]">No ratings yet</span>;
  return (
    <span className="text-[10px] font-semibold text-[#F59E0B]">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))} {rating.toFixed(1)}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ParentTutorsPage() {
  const { user } = useCurrentUser();
  const [tutors,     setTutors]     = useState<Tutor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [subjectF,   setSubjectF]   = useState("ALL");
  const [booking,    setBooking]    = useState<Tutor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [form, setForm] = useState<BookingForm>({
    subject: "", grade: "", scheduled_at: "", duration_minutes: 60, notes: "",
  });

  // ── Load approved active tutors ──────────────────────────────────────────
  useEffect(() => {
    async function fetchTutors() {
      const supabase = createClient();

      const { data: tData, error } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("status", "APPROVED")
        .eq("is_active", true)
        .order("avg_rating", { ascending: false });

      if (error || !tData?.length) { setLoading(false); return; }

      // Fetch display names from users table
      const userIds = tData.map((t: any) => t.user_id).filter(Boolean);
      const { data: uData } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      const userMap: Record<string, { name: string; email: string }> = {};
      (uData ?? []).forEach((u: any) => { userMap[u.id] = { name: u.name ?? "", email: u.email ?? "" }; });

      setTutors(tData.map((t: any) => ({
        ...t,
        user_name:  userMap[t.user_id]?.name  || t.display_name || "Tutor",
        user_email: userMap[t.user_id]?.email || "",
      })));
      setLoading(false);
    }
    fetchTutors();
  }, []);

  // ── Load my bookings ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("tutor_sessions")
      .select("id, subject, class_level, scheduled_at, duration_minutes, total_amount, status, tutor_id")
      .eq("parent_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setMyBookings(data ?? []));
  }, [user]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allSubjects = Array.from(new Set(tutors.flatMap(t => t.subjects))).sort();

  const filtered = tutors.filter(t => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (t.display_name || t.user_name).toLowerCase().includes(q) ||
      t.subjects.some(s => s.toLowerCase().includes(q)) ||
      (t.location ?? "").toLowerCase().includes(q);
    const matchSubject = subjectF === "ALL" || t.subjects.includes(subjectF);
    return matchSearch && matchSubject;
  });

  // ── Booking ───────────────────────────────────────────────────────────────
  function openBooking(tutor: Tutor) {
    setBooking(tutor);
    setForm({
      subject: tutor.subjects[0] ?? "",
      grade: tutor.grades[0] ?? "",
      scheduled_at: "",
      duration_minutes: 60,
      notes: "",
    });
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !user) return;
    if (!form.scheduled_at) { toast.error("Please pick a date and time"); return; }

    const totalAmount   = Math.round((booking.hourly_rate * form.duration_minutes) / 60);
    const platformFee   = Math.round(totalAmount * 0.15);
    const tutorEarnings = totalAmount - platformFee;

    setSubmitting(true);
    const { error } = await createClient().from("tutor_sessions").insert({
      tutor_id:         booking.id,
      parent_id:        user.id,
      subject:          form.subject,
      class_level:      form.grade,
      scheduled_at:     form.scheduled_at,
      duration_minutes: form.duration_minutes,
      rate_per_hour:    booking.hourly_rate,
      total_amount:     totalAmount,
      platform_fee:     platformFee,
      tutor_earnings:   tutorEarnings,
      status:           "PENDING",
      notes:            form.notes.trim() || null,
    });
    setSubmitting(false);

    if (error) { toast.error("Booking failed. Please try again."); return; }
    const tutorDisplayName = booking.display_name || booking.user_name;
    toast.success(`Session booked with ${tutorDisplayName}! They will confirm shortly 🎉`);
    setBooking(null);

    // Refresh bookings list
    const { data } = await createClient()
      .from("tutor_sessions")
      .select("id, subject, class_level, scheduled_at, duration_minutes, total_amount, status, tutor_id")
      .eq("parent_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(10);
    setMyBookings(data ?? []);
  }

  const totalCost = booking ? Math.round((booking.hourly_rate * form.duration_minutes) / 60) : 0;

  const SESSION_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:   { bg: "#FFFBEB", color: "#F59E0B", label: "Pending" },
    CONFIRMED: { bg: "#EFF6FF", color: "#3B82F6", label: "Confirmed" },
    COMPLETED: { bg: "#ECFDF5", color: "#10B981", label: "Completed" },
    CANCELLED: { bg: "#FEF2F2", color: "#EF4444", label: "Cancelled" },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Find a Tutor</h1>
        <p className="text-sm text-[#7A869A]">Book verified tutors for your child — one-on-one sessions, online or at home</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, subject or city…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none focus:border-[#10B981]"/>
        </div>
        <div className="relative">
          <select value={subjectF} onChange={e => setSubjectF(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none appearance-none focus:border-[#10B981]">
            <option value="ALL">All Subjects</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
        </div>
      </div>

      {/* Tutors */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#10B981]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Users size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No tutors available</p>
          <p className="text-xs text-[#7A869A] mt-1">
            {tutors.length === 0 ? "No approved tutors yet — check back soon!" : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tutor => {
            const name    = tutor.display_name || tutor.user_name;
            const color   = avatarColor(name);
            const initials = name.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={tutor.id} className="bg-white rounded-2xl border border-[#E8EDF5] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: color }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2035] truncate">{name}</p>
                    {tutor.tagline && <p className="text-[10px] text-[#7A869A] truncate">{tutor.tagline}</p>}
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle size={10} className="text-[#10B981]"/>
                      <span className="text-[10px] text-[#10B981] font-semibold">Verified</span>
                      {tutor.experience_years > 0 && (
                        <span className="text-[10px] text-[#7A869A]">· {tutor.experience_years} yr{tutor.experience_years !== 1 ? "s" : ""} exp</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-[#1A2035]">₹{tutor.hourly_rate}<span className="text-[9px] text-[#7A869A] font-normal">/hr</span></div>
                  </div>
                </div>

                {/* Rating */}
                <Stars rating={tutor.avg_rating}/>

                {/* Bio */}
                {tutor.bio && (
                  <p className="text-[11px] text-[#7A869A] leading-relaxed line-clamp-2">{tutor.bio}</p>
                )}

                {/* Subjects */}
                {tutor.subjects.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-[#7A869A] uppercase tracking-wider mb-1.5">Teaches</div>
                    <div className="flex flex-wrap gap-1">
                      {tutor.subjects.map(s => (
                        <span key={s} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grades */}
                {tutor.grades.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tutor.grades.map(g => (
                      <span key={g} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#8B5CF6]">{g}</span>
                    ))}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[10px] text-[#7A869A] flex-wrap">
                  {tutor.mode === "online"  && <span className="flex items-center gap-1"><Monitor size={10}/> Online</span>}
                  {tutor.mode === "offline" && <span className="flex items-center gap-1"><Home size={10}/> Home visits</span>}
                  {tutor.mode === "both"    && <span className="flex items-center gap-1"><Monitor size={10}/> Online & home</span>}
                  {tutor.location && <span className="flex items-center gap-1"><MapPin size={10}/>{tutor.location}</span>}
                  {tutor.total_sessions > 0 && <span>{tutor.total_sessions} sessions</span>}
                </div>

                {/* CTA */}
                <button onClick={() => openBooking(tutor)}
                  className="w-full py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors mt-auto">
                  <Calendar size={14}/> Book a Session
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* My bookings */}
      {myBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8EDF5] text-sm font-bold text-[#1A2035]">My Bookings</div>
          <div className="divide-y divide-[#F0F4FA]">
            {myBookings.map((b: any) => {
              const ss = SESSION_STYLE[b.status] ?? SESSION_STYLE.PENDING;
              const matchedTutor = tutors.find(t => t.id === b.tutor_id);
              const tName = matchedTutor ? (matchedTutor.display_name || matchedTutor.user_name) : "Tutor";
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035]">{b.subject} with {tName}</p>
                    <p className="text-[10px] text-[#7A869A]">
                      {new Date(b.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "numeric" })}
                      {" · "}{b.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                    <span className="text-[10px] font-bold text-[#1A2035]">₹{b.total_amount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking modal */}
      {booking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setBooking(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#E8EDF5] flex items-center gap-3" style={{ background: "#ECFDF5" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: avatarColor(booking.display_name || booking.user_name) }}>
                {(booking.display_name || booking.user_name).split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1A2035]">Book with {booking.display_name || booking.user_name}</p>
                <p className="text-[10px] text-[#7A869A]">₹{booking.hourly_rate}/hr · {MODE_LABEL[booking.mode] ?? booking.mode}</p>
              </div>
              <button onClick={() => setBooking(null)} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18}/></button>
            </div>

            <form onSubmit={handleBook} className="p-6 space-y-4">
              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Subject *</label>
                <div className="relative">
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required
                    className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#10B981]">
                    {booking.subjects.length > 0
                      ? booking.subjects.map(s => <option key={s} value={s}>{s}</option>)
                      : <option value="">Any subject</option>}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
                </div>
              </div>

              {/* Grade */}
              {booking.grades.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Grade / Class</label>
                  <div className="relative">
                    <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                      className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#10B981]">
                      {booking.grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
                  </div>
                </div>
              )}

              {/* Date & time */}
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#10B981]"/>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} type="button" onClick={() => setForm(f => ({ ...f, duration_minutes: d }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.duration_minutes === d ? "bg-[#10B981] text-white border-[#10B981]" : "bg-white text-[#7A869A] border-[#E8EDF5]"}`}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Notes for tutor</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Topics to cover, child's current level, specific doubts…"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#10B981] resize-none"/>
              </div>

              {/* Cost */}
              <div className="bg-[#ECFDF5] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#1A2035]">Session Cost</div>
                  <div className="text-[10px] text-[#7A869A]">₹{booking.hourly_rate}/hr × {form.duration_minutes} min</div>
                </div>
                <div className="text-2xl font-bold text-[#10B981]">₹{totalCost}</div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

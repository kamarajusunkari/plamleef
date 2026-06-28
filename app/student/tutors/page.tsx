"use client";
import React, { useState, useEffect } from "react";
import {
  Search, Loader2, CheckCircle, Users, ChevronDown,
  MapPin, Monitor, Home, MessageCircle, Zap, BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  mode: string;
  hourly_rate: number;
  avg_rating: number;
  total_sessions: number;
  location: string | null;
  // from users
  user_name: string;
}

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

export default function StudentTutorsPage() {
  const [tutors,    setTutors]    = useState<Tutor[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [subjectF,  setSubjectF]  = useState("ALL");

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

      const userIds = tData.map((t: any) => t.user_id).filter(Boolean);
      const { data: uData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      const userMap: Record<string, string> = {};
      (uData ?? []).forEach((u: any) => { userMap[u.id] = u.name ?? ""; });

      setTutors(tData.map((t: any) => ({
        ...t,
        user_name: userMap[t.user_id] || t.display_name || "Tutor",
      })));
      setLoading(false);
    }
    fetchTutors();
  }, []);

  const allSubjects = Array.from(new Set(tutors.flatMap(t => t.subjects))).sort();

  const filtered = tutors.filter(t => {
    const q = search.trim().toLowerCase();
    const name = t.display_name || t.user_name;
    const matchSearch = !q ||
      name.toLowerCase().includes(q) ||
      t.subjects.some(s => s.toLowerCase().includes(q)) ||
      (t.location ?? "").toLowerCase().includes(q);
    const matchSubject = subjectF === "ALL" || t.subjects.includes(subjectF);
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Find a Tutor</h1>
        <p className="text-sm text-[#7A869A]">Browse verified tutors — ask your parent to book a session for you</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] rounded-2xl p-5 text-white flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-sm mb-1 flex items-center gap-2"><Zap size={15}/> 1-on-1 Sessions with Experts</div>
          <p className="text-[11px] text-white/80">Verified tutors · Online & home visits · Any subject</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black">{tutors.length}</div>
          <div className="text-[10px] text-white/70">tutors available</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or subject…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
        </div>
        {allSubjects.length > 0 && (
          <div className="relative">
            <select value={subjectF} onChange={e => setSubjectF(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none appearance-none">
              <option value="ALL">All Subjects</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Users size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">
            {tutors.length === 0 ? "No tutors available yet" : "No tutors match your search"}
          </p>
          <p className="text-xs text-[#7A869A] mt-1">
            {tutors.length === 0 ? "Check back soon — tutors are being verified!" : "Try different keywords"}
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
                {/* Top */}
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
                        <span className="text-[10px] text-[#7A869A]">· {tutor.experience_years} yr exp</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#1A2035] shrink-0">
                    ₹{tutor.hourly_rate}<span className="text-[9px] text-[#7A869A] font-normal">/hr</span>
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
                      {tutor.subjects.map((s: string) => (
                        <span key={s} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grades */}
                {tutor.grades.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tutor.grades.map((g: string) => (
                      <span key={g} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#8B5CF6]">{g}</span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-[10px] text-[#7A869A] flex-wrap">
                  {tutor.mode === "online"  && <span className="flex items-center gap-1"><Monitor size={10}/> Online</span>}
                  {tutor.mode === "offline" && <span className="flex items-center gap-1"><Home size={10}/> Home visits</span>}
                  {tutor.mode === "both"    && <span className="flex items-center gap-1"><Monitor size={10}/> Online & home</span>}
                  {tutor.location && <span className="flex items-center gap-1"><MapPin size={10}/>{tutor.location}</span>}
                  {tutor.total_sessions > 0 && <span><BookOpen size={10} className="inline mr-0.5"/>{tutor.total_sessions} sessions</span>}
                </div>

                {/* Ask parent CTA */}
                <div className="bg-[#FFF7F4] border border-[#FFD4C2] rounded-xl p-3 flex items-center gap-2 mt-auto">
                  <MessageCircle size={13} className="text-[#FF6B35] shrink-0"/>
                  <p className="text-[10px] text-[#FF6B35] font-semibold">
                    Ask your parent to book a session with {name.split(" ")[0]}!
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5">
        <div className="text-xs font-bold text-[#1A2035] mb-4">How It Works</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji: "🔍", title: "Browse Tutors", desc: "Find a tutor who teaches your subject" },
            { emoji: "👨‍👩‍👧", title: "Parent Books", desc: "Ask your parent to book on the Parent Portal" },
            { emoji: "📚", title: "Learn & Grow", desc: "Attend sessions and boost your grades!" },
          ].map(s => (
            <div key={s.title} className="text-center">
              <div className="text-2xl mb-2">{s.emoji}</div>
              <div className="text-xs font-bold text-[#1A2035] mb-1">{s.title}</div>
              <div className="text-[10px] text-[#7A869A] leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

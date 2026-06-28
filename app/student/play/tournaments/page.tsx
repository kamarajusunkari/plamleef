"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy, Users, Clock, Star, ChevronRight, Loader2,
  Search, Filter, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scope: string;
  format: string;
  banner_emoji: string;
  prize_xp_1st: number;
  prize_xp_2nd: number;
  prize_xp_3rd: number;
  starts_at: string;
  ends_at: string;
  max_participants: number;
  entry_xp: number;
  quiz_title: string;
  participant_count: number;
  i_joined: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  UPCOMING:  { bg: "#EFF6FF", color: "#3B82F6", label: "Upcoming" },
  ACTIVE:    { bg: "#ECFDF5", color: "#10B981", label: "● Live" },
  COMPLETED: { bg: "#F0F4FA", color: "#7A869A", label: "Ended" },
  CANCELLED: { bg: "#FEF2F2", color: "#EF4444", label: "Cancelled" },
};

export default function TournamentsPage() {
  const { user }    = useCurrentUser();
  const router      = useRouter();
  const [list,      setList]      = useState<Tournament[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<"all"|"joined"|"upcoming">("all");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*, quiz!tournaments_quiz_id_fkey(title)")
        .neq("status", "CANCELLED")
        .order("starts_at", { ascending: true });

      const tIds = (tData ?? []).map((t: any) => t.id);
      let countMap: Record<string, number> = {};
      let joinedSet = new Set<string>();

      if (tIds.length) {
        const { data: pData } = await supabase
          .from("tournament_participants")
          .select("tournament_id, student_id")
          .in("tournament_id", tIds);

        (pData ?? []).forEach((r: any) => {
          countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1;
          if (r.student_id === user?.studentId) joinedSet.add(r.tournament_id);
        });
      }

      setList(((tData ?? []) as any[]).map(t => ({
        ...t,
        quiz_title: (t.quiz as any)?.title ?? "Quiz",
        participant_count: countMap[t.id] ?? 0,
        i_joined: joinedSet.has(t.id),
      })));
      setLoading(false);
    }
    load();
  }, [user?.studentId]);

  const filtered = list.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.quiz_title.toLowerCase().includes(q);
    const matchTab =
      tab === "all"      ? true :
      tab === "joined"   ? t.i_joined :
      tab === "upcoming" ? t.status === "UPCOMING" : true;
    return matchSearch && matchTab;
  });

  function timeInfo(t: Tournament) {
    if (t.status === "ACTIVE") {
      const diff = new Date(t.ends_at).getTime() - Date.now();
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(h / 24);
      return `Ends in ${d > 0 ? `${d}d` : `${h}h`}`;
    }
    if (t.status === "UPCOMING") {
      return `Starts ${new Date(t.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    }
    return `Ended ${new Date(t.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">🏆 Tournaments</h1>
          <p className="text-sm text-[#7A869A]">Compete, win XP, climb the leaderboard</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl">
          {(["all","upcoming","joined"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${tab === t ? "bg-white text-[#1A2035] shadow-sm" : "text-[#7A869A]"}`}>
              {t === "all" ? `All (${list.length})` : t === "joined" ? `Joined (${list.filter(x=>x.i_joined).length})` : "Upcoming"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tournaments…"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#F59E0B]"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Trophy size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No tournaments found</p>
          <p className="text-xs text-[#7A869A] mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => {
            const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.UPCOMING;
            const isFull = t.max_participants && t.participant_count >= t.max_participants;
            return (
              <Link key={t.id} href={`/student/play/tournaments/${t.id}`}
                className="bg-white rounded-2xl border border-[#E8EDF5] p-5 flex gap-4 hover:shadow-md transition-shadow">
                {/* Emoji */}
                <div className="text-4xl shrink-0 mt-1">{t.banner_emoji}</div>

                <div className="flex-1 min-w-0">
                  {/* Status + scope */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                      {ss.label}
                    </span>
                    <span className="text-[9px] text-[#7A869A] font-semibold uppercase tracking-wider">
                      {t.scope === "CLASS" ? "Class" : t.scope === "SCHOOL" ? "School" : "Open"}
                    </span>
                    {t.i_joined && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">✓ Joined</span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-[#1A2035]">{t.title}</p>
                  {t.description && <p className="text-[10px] text-[#7A869A] mt-0.5 line-clamp-1">{t.description}</p>}
                  <p className="text-[10px] text-[#7A869A] mt-0.5">📋 {t.quiz_title}</p>

                  <div className="flex items-center gap-4 mt-2 text-[10px] text-[#7A869A] flex-wrap">
                    <span className="flex items-center gap-1"><Users size={10}/> {t.participant_count}{t.max_participants ? `/${t.max_participants}` : ""} players</span>
                    <span className="flex items-center gap-1"><Clock size={10}/> {timeInfo(t)}</span>
                    <span className="flex items-center gap-1 font-bold text-[#F59E0B]"><Star size={10}/> {t.prize_xp_1st} XP 🥇</span>
                    {t.entry_xp > 0 && <span className="text-[#EF4444]">⚡ {t.entry_xp} XP to enter</span>}
                    {isFull && <span className="text-[#EF4444] font-semibold">Full</span>}
                  </div>
                </div>

                <ChevronRight size={16} className="text-[#CBD5E1] shrink-0 mt-2"/>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

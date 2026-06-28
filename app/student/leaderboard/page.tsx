"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

interface LeaderboardEntry {
  rank: number;
  xp: number;
  games_played: number;
  games_won: number;
  accuracy_pct: number;
  student_records_id: string;
  name: string;
  initials: string;
  color: string;
  isMe: boolean;
}

function avatarColor(name: string): string {
  const colors = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function StudentLeaderboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");

  useEffect(() => {
    if (!user?.classId) return;
    let cancelled = false;

    async function fetchLeaderboard() {
      if (!user?.classId) return;
      setLoading(true);
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("leaderboards")
          .select(`
            rank,
            xp,
            games_played,
            games_won,
            accuracy_pct,
            student_records_id,
            student_records!inner (
              students!inner (
                users!inner ( name )
              )
            )
          `)
          .eq("class_id", user.classId)
          .order("rank", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const mapped: LeaderboardEntry[] = (data ?? []).map((row) => {
          const sr = Array.isArray(row.student_records) ? row.student_records[0] : row.student_records;
          const stu = sr ? (Array.isArray(sr.students) ? sr.students[0] : sr.students) : null;
          const usr = stu ? (Array.isArray(stu.users) ? stu.users[0] : stu.users) : null;
          const name = (usr as { name?: string } | null)?.name ?? "Student";
          const isMe = row.student_records_id === user!.studentRecordId;
          return {
            rank: row.rank as number,
            xp: row.xp as number,
            games_played: (row.games_played as number) ?? 0,
            games_won: (row.games_won as number) ?? 0,
            accuracy_pct: (row.accuracy_pct as number) ?? 0,
            student_records_id: row.student_records_id as string,
            name,
            initials: initials(name),
            color: avatarColor(name),
            isMe,
          };
        });

        setEntries(mapped);
        if (user.className) setClassName(user.className);
      } catch (err) {
        console.warn("Leaderboard fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [user?.classId, user?.studentRecordId, user?.className]);

  const isPageLoading = userLoading || loading;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Class Leaderboard 🏆</h1>
        <p className="text-sm text-[#7A869A]">{className ? `${className} rankings` : "Class rankings"} · Updated live</p>
      </div>

      {isPageLoading ? (
        <div className="space-y-3">
          <div className="h-48 bg-[#0A1628] rounded-2xl animate-pulse" />
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white rounded-xl border border-[#E8EDF5] animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#E8EDF5] text-center">
          <div className="text-3xl mb-3">🏆</div>
          <div className="text-sm font-semibold text-[#1A2035] mb-1">No rankings yet</div>
          <div className="text-xs text-[#7A869A]">Play some games to get on the leaderboard!</div>
        </div>
      ) : (
        <>
          {/* Podium — only render if we have at least 3 entries */}
          {top3.length >= 3 && (
            <div className="bg-gradient-to-b from-[#0A1628] to-[#1E3A5F] rounded-2xl p-8">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: top3[1].color }}>{top3[1].initials}</div>
                  <div className="text-white text-xs font-semibold text-center">{top3[1].name.split(" ")[0]}</div>
                  <div className="text-[#94A3B8] text-[10px]">{top3[1].xp.toLocaleString()} XP</div>
                  <div className="w-20 h-16 bg-[#94A3B8] rounded-t-xl flex items-center justify-center text-white font-bold">2nd</div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="text-2xl">👑</div>
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white border-4 border-[#FFB347]" style={{ background: top3[0].color }}>{top3[0].initials}</div>
                  <div className="text-white text-sm font-bold text-center">{top3[0].name.split(" ")[0]}</div>
                  <div className="text-[#FFB347] text-xs font-semibold">{top3[0].xp.toLocaleString()} XP</div>
                  <div className="w-20 h-24 bg-[#FFB347] rounded-t-xl flex items-center justify-center text-white font-bold text-lg">1st</div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: top3[2].color }}>{top3[2].initials}</div>
                  <div className="text-white text-xs font-semibold text-center">{top3[2].name.split(" ")[0]}</div>
                  <div className="text-[#94A3B8] text-[10px]">{top3[2].xp.toLocaleString()} XP</div>
                  <div className="w-20 h-10 bg-[#CD7F32] rounded-t-xl flex items-center justify-center text-white font-bold">3rd</div>
                </div>
              </div>
            </div>
          )}

          {/* Rankings table */}
          <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
            <div className="divide-y divide-[#F0F4FA]">
              {entries.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                  style={{ background: entry.isMe ? "#FFF7F4" : "transparent" }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.rank === 1 ? "bg-[#FFB347] text-white" : entry.rank === 2 ? "bg-[#94A3B8] text-white" : entry.rank === 3 ? "bg-[#CD7F32] text-white" : "bg-[#F0F4FA] text-[#7A869A]"}`}>
                    {entry.rank}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: entry.color }}>
                    {entry.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${entry.isMe ? "text-[#FF6B35]" : "text-[#1A2035]"}`}>
                      {entry.name} {entry.isMe && "⭐ (You)"}
                    </div>
                    <div className="text-[10px] text-[#7A869A]">
                      {entry.games_played} games · {Math.round(entry.accuracy_pct)}% accuracy
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-[10px] text-[#7A869A]">
                    <span>{entry.games_won}W / {entry.games_played - entry.games_won}L</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#8B5CF6]">{entry.xp.toLocaleString()}</div>
                    <div className="text-[10px] text-[#7A869A]">XP</div>
                  </div>
                  {entry.isMe && (
                    <Link href="/student/play" className="px-3 py-1.5 bg-[#FF6B35] text-white rounded-xl text-xs font-bold hover:bg-[#E55A28] transition-colors shrink-0">
                      Play
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const XP_BADGES = [
  { id: 1, name: "First Steps", desc: "Reach 250 XP", icon: "🌱", threshold: 250, rarity: "COMMON", xp: 0 },
  { id: 2, name: "Scholar", desc: "Reach 1000 XP", icon: "📚", threshold: 1000, rarity: "UNCOMMON", xp: 0 },
  { id: 3, name: "Champion", desc: "Reach 3000 XP", icon: "🏆", threshold: 3000, rarity: "RARE", xp: 0 },
  { id: 4, name: "Elite", desc: "Reach 5000 XP", icon: "⚡", threshold: 5000, rarity: "EPIC", xp: 0 },
  { id: 5, name: "Legend", desc: "Reach 8000 XP", icon: "👑", threshold: 8000, rarity: "LEGENDARY", xp: 0 },
  { id: 6, name: "Genius", desc: "Reach 10000 XP", icon: "🧠", threshold: 10000, rarity: "LEGENDARY", xp: 0 },
];

const RARITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  COMMON: { bg: "#F8FAFC", color: "#64748B", border: "#E8EDF5" },
  UNCOMMON: { bg: "#ECFDF5", color: "#10B981", border: "#A7F3D0" },
  RARE: { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  EPIC: { bg: "#F5F3FF", color: "#8B5CF6", border: "#DDD6FE" },
  LEGENDARY: { bg: "#FFFBEB", color: "#F59E0B", border: "#FDE68A" },
};

interface BadgeItem {
  id: number;
  name: string;
  desc: string;
  icon: string;
  rarity: string;
  earned: boolean;
  xp: number;
}

export default function BadgesPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [filter, setFilter] = useState("ALL");
  const [attemptCount, setAttemptCount] = useState(0);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  useEffect(() => {
    if (!user?.studentRecordId) return;
    const fetchAttempts = async () => {
      const { count } = await supabase
        .from("assignment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_records_id", user.studentRecordId);
      setAttemptCount(count ?? 0);
      setLoadingAttempts(false);
    };
    fetchAttempts();
  }, [user?.studentRecordId]);

  const totalXp = user?.totalXp ?? 0;

  // Build full badge list
  const allBadges: BadgeItem[] = [
    ...XP_BADGES.map(b => ({
      ...b,
      earned: totalXp >= b.threshold,
    })),
    {
      id: 10,
      name: "Assignment Streak",
      desc: "Complete 5 assignments",
      icon: "🔥",
      rarity: "UNCOMMON",
      earned: !loadingAttempts && attemptCount >= 5,
      xp: 0,
    },
    {
      id: 11,
      name: "Quiz Master",
      desc: "Complete 10 assignments",
      icon: "🎯",
      rarity: "RARE",
      earned: !loadingAttempts && attemptCount >= 10,
      xp: 0,
    },
  ];

  const earned = allBadges.filter(b => b.earned);
  const filtered = allBadges.filter(b => {
    if (filter === "ALL") return true;
    if (filter === "EARNED") return b.earned;
    if (filter === "LOCKED") return !b.earned;
    return b.rarity === filter;
  });

  if (!user) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">My Badges</h1>
        <p className="text-sm text-[#7A869A]">{earned.length} earned · {allBadges.length - earned.length} locked</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Earned", value: earned.length, icon: "🏅" },
          { label: "Total XP", value: totalXp.toLocaleString(), icon: "⚡" },
          { label: "Assignments Done", value: loadingAttempts ? "…" : attemptCount, icon: "📝" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] text-center">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "EARNED", "LOCKED", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: filter === f ? "#FF6B35" : "#F0F4FA", color: filter === f ? "white" : "#7A869A" }}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(badge => {
          const style = RARITY_STYLES[badge.rarity];
          return (
            <div
              key={badge.id}
              onClick={() =>
                badge.earned
                  ? toast(`${badge.name}: ${badge.desc}`)
                  : toast(`🔒 Locked: ${badge.desc}`)
              }
              className="bg-white rounded-2xl p-6 border-2 text-center cursor-pointer transition-all hover:shadow-card relative overflow-hidden"
              style={{ borderColor: badge.earned ? style.border : "#E8EDF5", opacity: badge.earned ? 1 : 0.6 }}
            >
              {!badge.earned && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <span className="text-2xl">🔒</span>
                </div>
              )}
              <div className="text-4xl mb-3">{badge.icon}</div>
              <div className="text-sm font-bold text-[#1A2035] mb-1">{badge.name}</div>
              <div className="text-[11px] text-[#7A869A] mb-2">{badge.desc}</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: style.bg, color: style.color }}
                >
                  {badge.rarity}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

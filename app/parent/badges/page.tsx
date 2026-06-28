"use client";
import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const BADGES = [
  { id: 1, name: "First Steps", desc: "Reach 250 XP",   icon: "🌱", threshold: 250 },
  { id: 2, name: "Scholar",     desc: "Reach 1000 XP",  icon: "📚", threshold: 1000 },
  { id: 3, name: "Champion",    desc: "Reach 3000 XP",  icon: "🏆", threshold: 3000 },
  { id: 4, name: "Elite",       desc: "Reach 5000 XP",  icon: "⚡", threshold: 5000 },
  { id: 5, name: "Legend",      desc: "Reach 8000 XP",  icon: "👑", threshold: 8000 },
  { id: 6, name: "Genius",      desc: "Reach 10000 XP", icon: "🧠", threshold: 10000 },
];

async function fetchChild(parentUserId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select(`id, user_id, school_id,
      user:user_id ( id, name, email ),
      student_records ( id, class_id, is_current, classes:class_id ( name, section ) ),
      student_xp ( total_xp )`)
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  return data;
}

export default function ParentBadgesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [childName, setChildName] = useState<string>("");
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading || !user) return;
    (async () => {
      setLoading(true);
      const child = await fetchChild(user.id);
      if (child) {
        const name = (child.user as { name?: string } | null)?.name ?? "Your child";
        setChildName(name);
        const xpArr = Array.isArray(child.student_xp) ? child.student_xp as { total_xp: number }[] : [];
        setTotalXp(xpArr[0]?.total_xp ?? 0);
      }
      setLoading(false);
    })();
  }, [user, userLoading]);

  const earnedCount = BADGES.filter((b) => totalXp >= b.threshold).length;

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Badges</h1>
        <p className="text-sm text-[#7A869A]">{childName} has earned {earnedCount} of {BADGES.length} badges</p>
      </div>

      {/* XP + progress bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#1A2035]">Badge Collection</span>
          <span className="text-sm font-bold text-[#10B981]">{earnedCount}/{BADGES.length}</span>
        </div>
        <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#10B981] to-[#3B82F6] rounded-full transition-all duration-700"
            style={{ width: `${(earnedCount / BADGES.length) * 100}%` }} />
        </div>
        <div className="mt-3 text-xs text-[#7A869A]">
          Total XP: <span className="font-bold text-[#FF6B35]">{totalXp.toLocaleString()}</span>
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {BADGES.map((badge) => {
          const earned = totalXp >= badge.threshold;
          return (
            <div
              key={badge.id}
              className="bg-white rounded-2xl p-5 border flex flex-col items-center text-center transition-all hover:shadow-md relative overflow-hidden"
              style={{
                borderColor: earned ? "#A7F3D0" : "#E8EDF5",
                opacity: earned ? 1 : 0.6,
              }}
            >
              {!earned && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-2xl">
                  <span className="text-2xl">🔒</span>
                </div>
              )}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-3 shrink-0"
                style={{ background: earned ? "#ECFDF5" : "#F0F4FA" }}>
                {badge.icon}
              </div>
              <div className="text-sm font-bold text-[#1A2035] mb-1">{badge.name}</div>
              <div className="text-xs text-[#7A869A] mb-2">{badge.desc}</div>
              {earned ? (
                <div className="text-xs font-semibold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full">✓ Earned</div>
              ) : (
                <div className="text-xs text-[#7A869A]">
                  Need {(badge.threshold - totalXp).toLocaleString()} more XP
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

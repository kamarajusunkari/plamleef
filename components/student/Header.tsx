"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Zap, Menu } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

// Deterministic color from string
function avatarColor(name: string): string {
  const colors = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface DailyChallenge {
  id: string;
  title: string;
  subject_id: string;
  count: number;
}

export function StudentHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, loading } = useCurrentUser();
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);

  useEffect(() => {
    async function fetchDailyChallenge() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("quiz")
          .select("id, title, subject_id, count")
          .eq("source", "DAILY")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setDailyChallenge(data);
      } catch {
        // silently ignore — daily challenge is optional
      }
    }
    fetchDailyChallenge();
  }, []);

  const xp = user?.totalXp ?? 0;
  const color = avatarColor(user?.name ?? "S");

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF5] flex items-center px-6 gap-4 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Menu size={18} className="text-[#7A869A]" />
      </button>

      {/* Daily challenge */}
      {dailyChallenge && (
        <Link
          href={`/student/quiz?title=${encodeURIComponent(dailyChallenge.title)}&questions=${dailyChallenge.count}&time=30&xp=50`}
          className="flex items-center gap-2 bg-[#FFF7F4] border border-[#FFD4C2] px-3 py-1.5 rounded-xl hover:bg-[#FFE9DC] transition-colors"
        >
          <Zap size={14} className="text-[#FF6B35]" />
          <div>
            <div className="text-xs font-semibold text-[#FF6B35]">Daily Challenge</div>
            <div className="text-[10px] text-[#7A869A]">{dailyChallenge.title} · +50 XP</div>
          </div>
          <span className="text-[10px] font-bold text-white bg-[#FF6B35] px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
      )}

      <div className="flex-1" />

      {/* XP display */}
      {!loading && user && (
        <div className="hidden md:flex items-center gap-2 bg-[#FFF7F4] px-3 py-1.5 rounded-xl">
          <span className="text-sm font-bold text-[#FF6B35]">⚡ {xp.toLocaleString()} XP</span>
          {user.className && <span className="text-xs text-[#7A869A]">{user.className}</span>}
        </div>
      )}

      {/* Bell — links to notifications page */}
      <Link href="/student/notifications" className="w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center relative hover:bg-[#E8EDF5] transition-colors">
        <Bell size={16} className="text-[#7A869A]" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B35]" />
      </Link>

      {/* Avatar */}
      <Link href="/student/settings">
        {loading ? (
          <div className="w-8 h-8 rounded-xl bg-[#F0F4FA] animate-pulse" />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: color }}>
            {user?.initials ?? "?"}
          </div>
        )}
      </Link>
    </header>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

interface ChildInfo {
  name: string;
  initials: string;
  className: string;
  totalXp: number;
  leaderboardRank: number | null;
}

export function ParentHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [showNotif, setShowNotif] = useState(false);
  const { user, loading } = useCurrentUser();
  const [child, setChild] = useState<ChildInfo | null>(null);

  useEffect(() => {
    if (!user || user.role !== "PARENT") return;
    const supabase = createClient();

    async function fetchChild() {
      const { data: studentRow } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("parent_user_id", user!.id)
        .maybeSingle();

      if (!studentRow) return;

      const [{ data: childUser }, { data: record }] = await Promise.all([
        supabase.from("users").select("name").eq("id", studentRow.user_id).single(),
        supabase
          .from("student_records")
          .select("id, class_id, classes(name, section)")
          .eq("student_id", studentRow.id)
          .eq("is_current", true)
          .maybeSingle(),
      ]);

      if (!childUser) return;

      const name = childUser.name ?? "Child";
      const initials = name.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      const cls = record?.classes as { name: string; section: string } | null;
      const recordId = record?.id ?? null;

      let totalXp = 0;
      let leaderboardRank: number | null = null;

      if (recordId) {
        const [{ data: xpRow }, { data: lbRow }] = await Promise.all([
          supabase.from("student_xp").select("total_xp").eq("student_records_id", recordId).maybeSingle(),
          supabase.from("leaderboards").select("rank").eq("student_records_id", recordId).maybeSingle(),
        ]);
        totalXp = xpRow?.total_xp ?? 0;
        leaderboardRank = lbRow?.rank ?? null;
      }

      setChild({
        name,
        initials,
        className: cls ? `${cls.name}-${cls.section}` : "—",
        totalXp,
        leaderboardRank,
      });
    }

    fetchChild();
  }, [user]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF5] flex items-center px-6 gap-4 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Menu size={18} className="text-[#7A869A]" />
      </button>

      {loading ? (
        <div className="h-8 w-40 bg-[#F0F4FA] rounded-xl animate-pulse" />
      ) : child ? (
        <div className="flex items-center gap-2 bg-[#ECFDF5] px-3 py-1.5 rounded-xl border border-[#A7F3D0]">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white bg-[#EC4899]">{child.initials}</div>
          <div className="text-xs font-semibold text-[#10B981]">{child.name}</div>
          <span className="text-[10px] text-[#7A869A]">· {child.className}</span>
        </div>
      ) : null}

      <div className="flex-1" />

      <div className="hidden md:block text-xs text-[#7A869A]">{today}</div>

      {child && (
        <div className="hidden md:flex items-center gap-2 bg-[#FFF7F4] px-3 py-1.5 rounded-xl">
          <span className="text-xs font-bold text-[#FF6B35]">⚡ {child.totalXp.toLocaleString()} XP</span>
          {child.leaderboardRank && <span className="text-xs text-[#7A869A]">· Rank #{child.leaderboardRank}</span>}
        </div>
      )}

      <div className="relative">
        <button onClick={() => setShowNotif(!showNotif)} className="w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center relative hover:bg-[#E8EDF5] transition-colors">
          <Bell size={16} className="text-[#7A869A]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981]" />
        </button>
        {showNotif && (
          <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-[#E8EDF5] z-50 p-4 animate-fadeIn">
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Notifications</div>
            {child ? (
              <div className="text-xs text-[#7A869A] py-4 text-center">No new notifications</div>
            ) : (
              <div className="text-xs text-[#7A869A] py-4 text-center">No notifications</div>
            )}
          </div>
        )}
      </div>

      <button onClick={() => toast("Profile settings")} className="flex items-center gap-2 hover:bg-[#F0F4FA] px-2 py-1 rounded-xl transition-colors">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-[#10B981]">
          {user?.initials ?? "P"}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-[#1A2035]">{user?.name ?? "Parent"}</div>
          <div className="text-[10px] text-[#7A869A]">{child ? `Parent of ${child.name}` : "Parent"}</div>
        </div>
        <ChevronDown size={12} className="text-[#7A869A] hidden md:block" />
      </button>
    </header>
  );
}

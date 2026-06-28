"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Search, Clock, ChevronDown, Menu } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export function TeacherHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [showNotif, setShowNotif] = useState(false);
  const { user } = useCurrentUser();
  const [openDoubtsCount, setOpenDoubtsCount] = useState(0);
  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setTodayDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    supabase
      .from("doubts")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.teacherId)
      .eq("status", "OPEN")
      .then(({ count }) => setOpenDoubtsCount(count ?? 0));
  }, [user?.teacherId]);

  const avatarColor = "#8B5CF6";
  const initials = user?.initials ?? "T";
  const displayName = user?.name ?? "Teacher";

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF5] flex items-center px-6 gap-4 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Menu size={18} className="text-[#7A869A]" />
      </button>

      {/* Today's date indicator */}
      {todayDate && (
        <div className="hidden md:flex items-center gap-2 bg-[#F0F4FA] px-3 py-1.5 rounded-xl">
          <Clock size={14} className="text-[#8B5CF6]" />
          <div className="text-xs font-medium text-[#1A2035]">{todayDate}</div>
        </div>
      )}

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#F0F4FA] rounded-xl px-3 h-9 w-48">
        <Search size={14} className="text-[#7A869A]" />
        <input placeholder="Search students..." className="bg-transparent text-xs text-[#1A2035] placeholder-[#94A3B8] outline-none flex-1" />
      </div>

      {/* Doubts badge */}
      {openDoubtsCount > 0 && (
        <Link href="/teacher/doubts" className="flex items-center gap-1.5 bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-[#FEE2E2] transition-colors">
          <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
          {openDoubtsCount} doubts pending
        </Link>
      )}

      {/* Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotif(!showNotif)}
          className="w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center relative hover:bg-[#E8EDF5] transition-colors"
        >
          <Bell size={16} className="text-[#7A869A]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444]" />
        </button>
        {showNotif && (
          <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-[#E8EDF5] z-50 p-4 animate-fadeIn">
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Notifications</div>
            {[
              { text: "A student asked a new doubt", time: "Just now", color: "#EF4444" },
              { text: "Assignment submissions updated", time: "1h ago", color: "#10B981" },
              { text: "New message from school admin", time: "2h ago", color: "#3B82F6" },
            ].map((n, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#F0F4FA] last:border-0">
                <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.color }} />
                <div>
                  <div className="text-xs text-[#1A2035]">{n.text}</div>
                  <div className="text-[10px] text-[#7A869A]">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <button
        onClick={() => toast("Profile settings coming soon")}
        className="flex items-center gap-2 hover:bg-[#F0F4FA] px-2 py-1 rounded-xl transition-colors"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: avatarColor }}>
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-[#1A2035]">{displayName}</div>
          <div className="text-[10px] text-[#7A869A]">Teacher</div>
        </div>
        <ChevronDown size={12} className="text-[#7A869A] hidden md:block" />
      </button>
    </header>
  );
}

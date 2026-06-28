"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Swords, Trophy, Star, HelpCircle,
  Calendar, Settings, ChevronLeft, ChevronRight, LogOut, Zap, BarChart2,
  Library, Layers, Bell, X, ShoppingBag, UserCheck, BookMarked,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "LEARN", items: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/student/dashboard" },
    { icon: BookMarked, label: "Quiz Library", href: "/student/quiz-library" },
    { icon: BookOpen, label: "Assignments", href: "/student/assignments" },
    { icon: BarChart2, label: "My Subjects", href: "/student/subjects" },
    { icon: Library, label: "Resources", href: "/student/resources" },
  ]},
  { label: "PLAY", items: [
    { icon: Swords, label: "Game Zone", href: "/student/play" },
    { icon: Trophy, label: "Leaderboard", href: "/student/leaderboard" },
    { icon: Star, label: "My Badges", href: "/student/badges" },
    { icon: Layers, label: "Challenges", href: "/student/extracurricular" },
  ]},
  { label: "MORE", items: [
    { icon: UserCheck, label: "Find Tutors", href: "/student/tutors" },
    { icon: HelpCircle, label: "Ask Doubt", href: "/student/doubts" },
    { icon: Calendar, label: "Attendance", href: "/student/attendance" },
    { icon: Bell, label: "Notifications", href: "/student/notifications" },
    { icon: Settings, label: "Settings", href: "/student/settings" },
  ]},
];

// XP thresholds per level (index = level - 1)
const XP_THRESHOLDS = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6500, 8000, 10000];
const LEVEL_NAMES = ["Rookie", "Explorer", "Scholar", "Achiever", "Champion", "Elite", "Master", "Legend", "Grandmaster", "Expert", "Prodigy", "Genius"];

function getNextLevelXp(level: number): number {
  return XP_THRESHOLDS[level] ?? 10000; // next threshold
}

function calcXpPct(totalXp: number, level: number): number {
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = getNextLevelXp(level);
  if (nextThreshold <= currentThreshold) return 100;
  return Math.min(((totalXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100);
}

// Deterministic color from string
function avatarColor(name: string): string {
  const colors = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function StudentSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useCurrentUser();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const xp = user?.totalXp ?? 0;
  const level = user?.level ?? 1;
  const levelName = LEVEL_NAMES[(level - 1)] ?? "Rookie";
  const xpPct = calcXpPct(xp, level);
  const xpToNext = getNextLevelXp(level) - xp;
  const color = avatarColor(user?.name ?? "S");

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col h-full transition-all duration-300 bg-[#0A1628] overflow-hidden lg:relative lg:z-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: collapsed ? 64 : 240 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">EduBattle</div>
              <div className="text-[#7A869A] text-[10px]">Student Portal</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden ml-auto text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* XP bar (expanded only) */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/10">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/10 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
                    {user?.initials ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{user?.name ?? "Student"}</div>
                    <div className="text-[10px] text-[#7A869A]">Level {level} · {levelName}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#7A869A] mb-1">
                  <span>{xp.toLocaleString()} XP</span>
                  <span>{xpToNext.toLocaleString()} next</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFB347] rounded-full transition-[width] duration-700" style={{ width: `${xpPct}%` }} />
                </div>
                {user?.className && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-[#7A869A]">Class {user.className}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {NAV.map(group => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="px-4 mb-1 text-[9px] font-bold text-[#475569] tracking-widest">{group.label}</div>
              )}
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150"
                    style={{ background: active ? "#FF6B35" : "transparent" }}
                  >
                    <Icon size={18} className="shrink-0" style={{ color: active ? "white" : "#94A3B8" }} />
                    {!collapsed && (
                      <span className="text-sm font-medium" style={{ color: active ? "white" : "#94A3B8" }}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <a href="https://store.edubattle.in" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-xl text-white font-semibold text-xs transition-all"
              style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
              <ShoppingBag size={14}/> 🛍 EduBattle Store
            </a>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#7A869A] hover:text-white hover:bg-white/5 transition-all">
            <LogOut size={16} />
            {!collapsed && <span className="text-xs">Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center h-10 border-t border-white/10 text-[#7A869A] hover:text-white hover:bg-white/5 transition-all">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}

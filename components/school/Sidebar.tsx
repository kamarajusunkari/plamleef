"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Layout, GraduationCap, Users, BookOpen,
  ClipboardList, CheckSquare, Calendar, Bell, Trophy, MessageCircle,
  Settings, ChevronLeft, ChevronRight, LogOut, Zap, BarChart2, X,
  Wrench, ShoppingBag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/school/dashboard" },
      { icon: Layout, label: "Classes", href: "/school/classes" },
      { icon: GraduationCap, label: "Teachers", href: "/school/teachers" },
      { icon: Users, label: "Students", href: "/school/students" },
    ],
  },
  {
    label: "ACADEMIC",
    items: [
      { icon: BookOpen, label: "Subjects", href: "/school/subjects" },
      { icon: ClipboardList, label: "Assignments", href: "/school/assignments" },
      { icon: CheckSquare, label: "Attendance", href: "/school/attendance" },
      { icon: Calendar, label: "Timetable", href: "/school/timetable" },
    ],
  },
  {
    label: "ENGAGE",
    items: [
      { icon: Bell, label: "Announcements", href: "/school/announcements" },
      { icon: Trophy, label: "Leaderboard", href: "/school/leaderboard" },
      { icon: MessageCircle, label: "Doubts", href: "/school/doubts" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { icon: BarChart2, label: "Reports", href: "/school/reports" },
    ],
  },
  {
    label: "SERVICES",
    items: [
      { icon: Wrench,       label: "Tech Services", href: "/school/services" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: Settings, label: "Settings", href: "/school/settings" },
    ],
  },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useCurrentUser();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [classCount, setClassCount] = useState<number | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    const saved = localStorage.getItem("sidebar");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!user?.schoolId) return;
    const supabase = createClient();
    const schoolId = user.schoolId;

    Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    ]).then(([studRes, classRes]) => {
      setStudentCount(studRes.count ?? 0);
      setClassCount(classRes.count ?? 0);
    });
  }, [user?.schoolId]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar", next ? "collapsed" : "expanded");
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 h-screen flex flex-col bg-[#0A1628] overflow-hidden transition-all duration-[250ms] lg:relative lg:inset-auto lg:z-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: collapsed ? 64 : 230 }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-white leading-none">
                Edu<span className="text-[#FF6B35]">Battle</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{user?.schoolName ?? "School"}</div>
              <div className="text-[9px] text-white/30">{user?.board ?? "CBSE"}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden ml-auto text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Admin profile */}
        {!collapsed && (
          <div className="px-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #FF6B35, #e55f2c)" }}
              >
                {user?.initials ?? "SA"}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-white truncate">{user?.name ?? "School Admin"}</div>
                <div className="text-[11px] text-white/50">School Administrator</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-[10px] text-white/40">Online</span>
                </div>
              </div>
            </div>
            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[#FF6B35] text-white text-[10px] font-medium">
              {todayLabel}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="text-[10px] text-white/30 uppercase font-semibold px-2 mb-1.5">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 transition-all duration-150 relative ${
                      isActive
                        ? "bg-[#FF6B35]/15 text-white border-l-[3px] border-[#FF6B35] pl-[9px]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      size={17}
                      className={`shrink-0 ${isActive ? "text-[#FF6B35]" : ""}`}
                    />
                    {!collapsed && (
                      <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        {!collapsed && (
          <div className="p-3 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-3 mb-3">
              <div className="text-[11px] font-semibold text-[#FF6B35] mb-1.5">School Stats</div>
              <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                <span>Students</span>
                <span className="text-white/70 font-medium">{studentCount ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>Classes</span>
                <span className="text-white/70 font-medium">{classCount ?? "—"}</span>
              </div>
            </div>
            {/* Store button */}
            <a href="https://store.edubattle.in" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-xl text-white font-semibold text-xs transition-all"
              style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
              <ShoppingBag size={14}/> 🛍 EduBattle Store
            </a>
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-all text-xs">
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[#7A869A] hover:text-[#FF6B35] transition-colors z-10 border border-[#E8EDF5]"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}

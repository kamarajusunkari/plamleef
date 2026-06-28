"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Layout, ClipboardList, BookOpen, FileText,
  MessageCircle, BarChart2, Settings, ChevronLeft, ChevronRight,
  LogOut, Zap, HelpCircle, X, ShoppingBag, GraduationCap, Trophy,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export function TeacherSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useCurrentUser();
  const [quizCount, setQuizCount] = useState(0);
  const [openDoubtsCount, setOpenDoubtsCount] = useState(0);

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    const teacherId = user.teacherId;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    supabase
      .from("quiz")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .then(({ count }) => setQuizCount(count ?? 0));

    supabase
      .from("doubts")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "OPEN")
      .then(({ count }) => setOpenDoubtsCount(count ?? 0));
  }, [user?.teacherId]);

  const NAV = [
    { label: "MAIN", items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/teacher/dashboard" },
      { icon: Layout, label: "My Classes", href: "/teacher/classes" },
      { icon: ClipboardList, label: "Assignments", href: "/teacher/assignments", badge: 0, badgeColor: "#FF6B35" },
    ]},
    { label: "CONTENT", items: [
      { icon: BookOpen, label: "Quiz Library", href: "/teacher/quizzes", badge: quizCount, badgeColor: "#10B981" },
      { icon: FileText, label: "Resources", href: "/teacher/resources" },
    ]},
    { label: "ENGAGE", items: [
      { icon: HelpCircle, label: "Doubts", href: "/teacher/doubts", badge: openDoubtsCount, badgeColor: "#EF4444" },
      { icon: MessageCircle, label: "Messages", href: "/teacher/messages" },
      { icon: Trophy, label: "Tournaments", href: "/teacher/tournaments", badge: 0, badgeColor: "#F59E0B" },
    ]},
    { label: "ACCOUNT", items: [
      { icon: BarChart2, label: "Reports", href: "/teacher/reports" },
      { icon: Settings, label: "Settings", href: "/teacher/settings" },
    ]},
    { label: "PERSONAL", items: [
      { icon: GraduationCap, label: "Tutor Profile", href: "/teacher/tutor", badge: 0, badgeColor: "#F59E0B", isTutor: true },
    ]},
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const avatarColor = "#8B5CF6";
  const initials = user?.initials ?? "T";
  const displayName = user?.name ?? "Teacher";

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
          <div className="w-8 h-8 bg-[#8B5CF6] rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">EduBattle</div>
              <div className="text-[#7A869A] text-[10px]">Teacher Portal</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden ml-auto text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

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
                const badge = (item as { badge?: number }).badge;
                const badgeColor = (item as { badgeColor?: string }).badgeColor;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150 group relative"
                    style={{
                      background: active
                        ? (item as { isTutor?: boolean }).isTutor ? "linear-gradient(135deg,#F59E0B,#FF6B35)" : "#8B5CF6"
                        : (item as { isTutor?: boolean }).isTutor ? "rgba(245,158,11,0.10)" : "transparent",
                    }}
                  >
                    <Icon size={18} className="shrink-0" style={{ color: active ? "white" : (item as { isTutor?: boolean }).isTutor ? "#F59E0B" : "#94A3B8" }} />
                    {!collapsed && (
                      <span className="text-sm font-medium flex-1" style={{ color: active ? "white" : (item as { isTutor?: boolean }).isTutor ? "#F59E0B" : "#94A3B8" }}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && (item as { isTutor?: boolean }).isTutor && !active && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-[#F59E0B]">NEW</span>
                    )}
                    {!collapsed && badge != null && badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: badgeColor }}>
                        {badge}
                      </span>
                    )}
                    {collapsed && badge != null && badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: badgeColor }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Profile */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <a href="https://store.edubattle.in" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-xl text-white font-semibold text-xs transition-all"
              style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
              <ShoppingBag size={14}/> 🛍 EduBattle Store
            </a>
          )}
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: avatarColor }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-[#7A869A]">Teacher</div>
              </div>
              <button onClick={handleSignOut} title="Sign Out" className="text-[#7A869A] hover:text-white transition-colors"><LogOut size={14} /></button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: avatarColor }}>
                {initials}
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-10 border-t border-white/10 text-[#7A869A] hover:text-white hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}

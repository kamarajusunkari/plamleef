"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, Swords,
  Star, MessageCircle, BarChart2, Settings, ChevronLeft, ChevronRight, LogOut, Zap, X, ShoppingBag, UserCheck,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "OVERVIEW", items: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/parent/dashboard" },
    { icon: BarChart2, label: "Reports", href: "/parent/reports" },
  ]},
  { label: "ACADEMICS", items: [
    { icon: BookOpen, label: "Subjects", href: "/parent/subjects" },
    { icon: ClipboardList, label: "Assignments", href: "/parent/assignments" },
    { icon: Calendar, label: "Attendance", href: "/parent/attendance" },
  ]},
  { label: "ACTIVITIES", items: [
    { icon: UserCheck, label: "Tutors", href: "/parent/tutors" },
    { icon: Swords, label: "Games", href: "/parent/games" },
    { icon: Star, label: "Badges", href: "/parent/badges" },
    { icon: MessageCircle, label: "Messages", href: "/parent/messages" },
  ]},
  { label: "ACCOUNT", items: [
    { icon: Settings, label: "Settings", href: "/parent/settings" },
  ]},
];

interface ChildInfo {
  name: string;
  initials: string;
  className: string;
  totalXp: number;
}

export function ParentSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useCurrentUser();
  const [child, setChild] = useState<ChildInfo | null>(null);

  useEffect(() => {
    if (!user || user.role !== "PARENT") return;
    const supabase = createClient();
    supabase
      .from("students")
      .select(`
        id,
        users!students_user_id_fkey(name),
        student_records!inner(
          id,
          is_current,
          classes(name, section),
          student_xp(total_xp)
        )
      `)
      .eq("parent_user_id", user.id)
      .eq("student_records.is_current", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const u = Array.isArray(data.users) ? data.users[0] : data.users as { name: string } | null;
        const rec = Array.isArray(data.student_records) ? data.student_records[0] : data.student_records as { classes?: { name: string; section: string } | null; student_xp?: { total_xp: number }[] | null } | null;
        const cls = rec?.classes as { name: string; section: string } | null;
        const xpArr = rec?.student_xp as { total_xp: number }[] | null;
        const name = u?.name ?? "Child";
        const initials = name.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        setChild({
          name,
          initials,
          className: cls ? `${cls.name}-${cls.section}` : "—",
          totalXp: xpArr?.[0]?.total_xp ?? 0,
        });
      });
  }, [user]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const parentName = user?.name ?? "Parent";
  const parentInitials = user?.initials ?? "P";

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
          <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">EduBattle</div>
              <div className="text-[#7A869A] text-[10px]">Parent Portal</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden ml-auto text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Child info */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-[9px] font-bold text-[#475569] uppercase tracking-wider mb-2">Monitoring</div>
            {loading ? (
              <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
            ) : child ? (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-[#EC4899]">
                  {child.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{child.name}</div>
                  <div className="text-[10px] text-[#7A869A]">{child.className} · {child.totalXp.toLocaleString()} XP</div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-[#7A869A]">No child linked</div>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {NAV.map(group => (
            <div key={group.label} className="mb-4">
              {!collapsed && <div className="px-4 mb-1 text-[9px] font-bold text-[#475569] tracking-widest">{group.label}</div>}
              {group.items.map(item => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150" style={{ background: active ? "#10B981" : "transparent" }}>
                    <Icon size={18} className="shrink-0" style={{ color: active ? "white" : "#94A3B8" }} />
                    {!collapsed && <span className="text-sm font-medium" style={{ color: active ? "white" : "#94A3B8" }}>{item.label}</span>}
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "#10B981" }}>
                {parentInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{parentName}</div>
                <div className="text-[10px] text-[#7A869A]">Parent</div>
              </div>
              <button onClick={handleSignOut} title="Sign Out" className="text-[#7A869A] hover:text-white transition-colors"><LogOut size={14} /></button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-[#10B981]">{parentInitials}</div>
            </div>
          )}
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center h-10 border-t border-white/10 text-[#7A869A] hover:text-white hover:bg-white/5 transition-all">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  LayoutDashboard, BookOpen, CheckSquare, School, Upload,
  BarChart2, Settings, ChevronLeft, ChevronRight, LogOut,
  Zap, X, Users, Clock, Tag, Wrench, UserCheck,
} from "lucide-react";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  userRole: string;
}

export function CmsSidebar({ mobileOpen, onClose, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingReview, setPendingReview] = useState(0);
  const [pendingTutors, setPendingTutors] = useState(0);

  const isAdmin = userRole === "CMS_ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();

    function fetchCounts() {
      supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("visibility", "PENDING_REVIEW")
        .then(({ count }) => setPendingReview(count ?? 0));

      supabase
        .from("tutor_profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")          // teachers who submitted for approval
        .then(({ count }) => setPendingTutors(count ?? 0));
    }

    fetchCounts();

    const ch1 = supabase
      .channel("sidebar-pending-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, fetchCounts)
      .subscribe();

    const ch2 = supabase
      .channel("sidebar-tutor-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "tutor_profiles" }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [isAdmin]);

  // Admin navigation
  const ADMIN_NAV = [
    { label: "OVERVIEW", items: [
      { icon: LayoutDashboard, label: "Dashboard",    href: "/cms/dashboard" },
      { icon: BarChart2,      label: "Coverage",      href: "/cms/coverage" },
    ]},
    { label: "CONTENT", items: [
      { icon: BookOpen,    label: "Library",      href: "/cms/library" },
      { icon: Tag,         label: "Topics",       href: "/cms/topics" },
      { icon: Clock,       label: "Review Queue", href: "/cms/review",  badge: pendingReview },
      { icon: Upload,      label: "Upload",       href: "/cms/upload" },
    ]},
    { label: "PLATFORM", items: [
      { icon: School,     label: "Schools",       href: "/cms/schools" },
      { icon: Users,      label: "Staff Accounts",href: "/cms/staff" },
      { icon: UserCheck,  label: "Tutors",        href: "/cms/tutors", badge: pendingTutors },
      { icon: Wrench,     label: "Services",      href: "/cms/services" },
      { icon: Settings,   label: "Settings",      href: "/cms/settings" },
    ]},
  ];

  // Staff navigation — no Schools, no Staff management, review page is read-only
  const STAFF_NAV = [
    { label: "MY WORK", items: [
      { icon: LayoutDashboard, label: "Dashboard",      href: "/cms/dashboard" },
      { icon: Upload,          label: "Upload Content",  href: "/cms/upload" },
      { icon: Clock,           label: "My Submissions",  href: "/cms/review", badge: 0 },
      { icon: BookOpen,        label: "All Resources",   href: "/cms/library" },
    ]},
    { label: "ACCOUNT", items: [
      { icon: Settings, label: "Settings", href: "/cms/settings" },
    ]},
  ];

  const NAV = isAdmin ? ADMIN_NAV : STAFF_NAV;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col h-full transition-all duration-300 overflow-hidden lg:relative lg:z-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          width: collapsed ? 64 : 240,
          background: isAdmin ? "#0A1628" : "#1E1B4B",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isAdmin ? "#FF6B35" : "#8B5CF6" }}>
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">EduBattle</div>
              <div className="text-[10px]" style={{ color: isAdmin ? "#FF6B35" : "#A78BFA" }}>
                {isAdmin ? "Super Admin" : "Content Staff"}
              </div>
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
                const active = pathname === item.href;
                const Icon = item.icon;
                const badge = (item as { badge?: number }).badge ?? 0;
                const accentColor = isAdmin ? "#FF6B35" : "#8B5CF6";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150 relative"
                    style={{ background: active ? accentColor : "transparent" }}
                  >
                    <Icon size={18} className="shrink-0" style={{ color: active ? "white" : "#94A3B8" }} />
                    {!collapsed && (
                      <span className="text-sm font-medium flex-1" style={{ color: active ? "white" : "#94A3B8" }}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Profile */}
        <div className="border-t border-white/10 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: isAdmin ? "#FF6B35" : "#8B5CF6" }}>
                {user?.initials ?? (isAdmin ? "SA" : "CS")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.name ?? "User"}</div>
                <div className="text-[10px] text-[#7A869A]">{isAdmin ? "Super Admin" : "Content Staff"}</div>
              </div>
              <button onClick={handleSignOut} title="Sign Out" className="text-[#7A869A] hover:text-white transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                style={{ background: isAdmin ? "#FF6B35" : "#8B5CF6" }}>
                {user?.initials ?? (isAdmin ? "SA" : "CS")}
              </div>
            </div>
          )}
        </div>

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

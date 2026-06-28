"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Wallet, Target, UserCheck,
  Settings, ChevronLeft, ChevronRight, LogOut, Zap, X,
  BookOpen, Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "OVERVIEW", items: [
    { icon: LayoutDashboard, label: "Dashboard",     href: "/aspirant/dashboard" },
    { icon: Wallet,          label: "My Credits",     href: "/aspirant/credits" },
  ]},
  { label: "PRACTICE", items: [
    { icon: Target,   label: "Practice Tests",  href: "/aspirant/tests" },
    { icon: BookOpen, label: "My Resources",    href: "/aspirant/resources" },
  ]},
  { label: "TUTOR", items: [
    { icon: UserCheck, label: "Tutor Profile",  href: "/aspirant/tutor" },
  ]},
  { label: "ACCOUNT", items: [
    { icon: Settings, label: "Settings",        href: "/aspirant/settings" },
  ]},
];

interface Props { mobileOpen: boolean; onClose: () => void; credits?: number; name?: string; }

export function AspirantSidebar({ mobileOpen, onClose, credits, name }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const initials = (n?: string) =>
    n ? n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "AS";

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col h-full transition-all duration-300 overflow-hidden lg:relative lg:z-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: collapsed ? 64 : 240, background: "#1A1200" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#F59E0B]">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">EduBattle</div>
                <div className="text-[#F59E0B] text-[10px]">Aspirant Platform</div>
              </div>
              <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </>
          )}
        </div>

        {/* Credits pill */}
        {!collapsed && credits !== undefined && (
          <Link href="/aspirant/credits"
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 transition-colors">
            <Star size={14} className="text-[#F59E0B]" />
            <span className="text-xs font-bold text-[#F59E0B]">{credits} Credits</span>
          </Link>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {NAV.map(group => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="px-4 mb-1 text-[9px] font-bold text-[#78716C] tracking-widest">{group.label}</div>
              )}
              {group.items.map(item => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150"
                    style={{ background: active ? "#F59E0B" : "transparent" }}>
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

        {/* Profile */}
        <div className="border-t border-white/10 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-[#F59E0B]">
                {initials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{name ?? "Aspirant"}</div>
                <div className="text-[10px] text-[#78716C]">Aspirant</div>
              </div>
              <button onClick={handleSignOut} title="Sign Out" className="text-[#78716C] hover:text-white transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-[#F59E0B]">
                {initials(name)}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center h-10 border-t border-white/10 text-[#78716C] hover:text-white hover:bg-white/5 transition-all">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}

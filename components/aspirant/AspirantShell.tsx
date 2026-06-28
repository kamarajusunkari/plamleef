"use client";
import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AspirantSidebar } from "./Sidebar";
import { Menu, Bell, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AspirantShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credits, setCredits]       = useState<number | undefined>();
  const [name, setName]             = useState<string | undefined>();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("aspirant_profiles").select("name, credit_balance").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data) { setCredits(data.credit_balance); setName(data.name); }
        });
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <AspirantSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} credits={credits} name={name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-[#E8EDF5] bg-white flex items-center gap-4 px-6 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-[#7A869A]">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 bg-[#F59E0B] rounded-lg flex items-center justify-center lg:hidden">
              <Zap size={14} className="text-white" />
            </div>
          </div>
          <Link href="/aspirant/credits"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs font-bold text-[#92400E] hover:bg-[#FEF9C3] transition-colors">
            ⭐ {credits ?? "—"} Credits
          </Link>
          <button className="relative text-[#7A869A] hover:text-[#1A2035] transition-colors">
            <Bell size={18} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{
        success: { duration: 3000, style: { background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" } },
        error:   { duration: 4000, style: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" } },
      }} />
    </div>
  );
}

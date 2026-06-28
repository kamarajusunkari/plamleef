"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, AlertCircle, Menu } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export function CmsHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useCurrentUser();
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalSchools, setTotalSchools]     = useState(0);
  const [pendingReview, setPendingReview]   = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("question").select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalQuestions(count ?? 0));
    supabase.from("schools").select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalSchools(count ?? 0));
    supabase.from("resources").select("id", { count: "exact", head: true })
      .eq("visibility", "PENDING_REVIEW")
      .then(({ count }) => setPendingReview(count ?? 0));
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF5] flex items-center px-6 gap-4 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Menu size={18} className="text-[#7A869A]" />
      </button>

      {pendingReview > 0 && (
        <Link href="/cms/review" className="flex items-center gap-2 bg-[#FEF2F2] px-3 py-1.5 rounded-xl border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors">
          <AlertCircle size={14} className="text-[#EF4444]" />
          <span className="text-xs font-semibold text-[#EF4444]">{pendingReview} items pending review</span>
        </Link>
      )}

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-4 text-xs text-[#7A869A]">
        <span className="font-semibold text-[#1A2035]">{totalQuestions.toLocaleString()}</span> questions
        <span>·</span>
        <span className="font-semibold text-[#1A2035]">{totalSchools}</span> schools
      </div>

      <button onClick={() => toast("No new notifications")} className="w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Bell size={16} className="text-[#7A869A]" />
      </button>

      <button onClick={() => toast("Admin profile")} className="flex items-center gap-2 hover:bg-[#F0F4FA] px-2 py-1 rounded-xl transition-colors">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-[#FF6B35]">
          {user?.initials ?? "CA"}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-[#1A2035]">{user?.name ?? "CMS Admin"}</div>
          <div className="text-[10px] text-[#7A869A]">Content Manager</div>
        </div>
        <ChevronDown size={12} className="text-[#7A869A] hidden md:block" />
      </button>
    </header>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { Bell, CheckSquare, Menu } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useCurrentUser();
  const [showNotif, setShowNotif] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.schoolId) return;
    const supabase = createClient();
    const schoolId = user.schoolId;
    const today = new Date().toISOString().split("T")[0];

    // Fetch recent announcements for notification badge
    supabase
      .from("announcements")
      .select("id, title, content, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setAnnouncements(data);
      });

    // Fetch today's attendance percentage
    Promise.all([
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today).eq("status", "PRESENT"),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today),
    ]).then(([presentRes, totalRes]) => {
      const present = presentRes.count ?? 0;
      const total = totalRes.count ?? 0;
      if (total > 0) setAttendancePct(Math.round((present / total) * 100));
    });
  }, [user?.schoolId]);

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  return (
    <header className="h-[60px] bg-white border-b border-[#E8EDF5] sticky top-0 z-40 flex items-center px-6 gap-4">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
        <Menu size={18} className="text-[#7A869A]" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#1A2035]">
          {greeting}, {firstName}! 👋
        </div>
        <div className="text-[11px] text-[#7A869A]">
          {dateLabel} · {user?.schoolName ?? "School"}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          School Active
        </div>

        {attendancePct !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFBEB] text-[#F59E0B] text-xs font-medium">
            <CheckSquare size={12} />
            {attendancePct}% Attendance Today
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F0F4FA] transition-colors text-[#7A869A]"
          >
            <Bell size={18} />
            {announcements.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center font-bold">
                {announcements.length}
              </span>
            )}
          </button>

          {showNotif && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#E8EDF5] shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-[#E8EDF5]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1A2035]">Recent Announcements</h3>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="p-4 text-xs text-[#7A869A] text-center">No announcements yet</div>
                  ) : (
                    announcements.map((n) => (
                      <button
                        key={n.id}
                        className="w-full text-left p-4 hover:bg-[#F0F4FA] border-b border-[#F0F4FA] last:border-0 transition-colors"
                        onClick={() => setShowNotif(false)}
                      >
                        <div className="text-xs font-semibold text-[#1A2035] mb-0.5">{n.title}</div>
                        <div className="text-[11px] text-[#7A869A] line-clamp-2">{n.content}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-1">
                          {new Date(n.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg, #FF6B35, #e55f2c)" }}
        >
          {user?.initials ?? "SA"}
        </div>
      </div>
    </header>
  );
}

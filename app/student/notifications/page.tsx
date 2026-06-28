"use client";
import React, { useState, useEffect } from "react";
import { CheckCheck, Bell } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  type: "DOUBT" | "ASSIGNMENT" | "XP";
  icon: string;
  title: string;
  body: string;
  time: string;
  sortDate: string;
  read: boolean;
}

const TYPE_STYLE: Record<string, { bg: string; border: string }> = {
  DOUBT: { bg: "#ECFDF5", border: "#A7F3D0" },
  ASSIGNMENT: { bg: "#FFFBEB", border: "#FDE68A" },
  XP: { bg: "#FFF7F4", border: "#FFD4C2" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function StudentNotificationsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.studentRecordId) return;

    const fetchAll = async () => {
      setLoading(true);
      const recordId = user.studentRecordId;

      const [doubtsRes, attemptsRes, xpLogsRes] = await Promise.all([
        supabase
          .from("doubts")
          .select("id, content, status, answered_at, subjects:subject_id(name)")
          .eq("student_records_id", recordId)
          .eq("status", "ANSWERED")
          .order("answered_at", { ascending: false })
          .limit(10),
        supabase
          .from("assignment_attempts")
          .select("id, score, xp_earned, created_at, assignment:assignment_id(title)")
          .eq("student_records_id", recordId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("xp_logs")
          .select("id, xp, source, created_at")
          .eq("student_records_id", recordId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: NotificationItem[] = [];

      // Doubts
      if (doubtsRes.data) {
        for (const d of doubtsRes.data as any[]) {
          const subjectName = Array.isArray(d.subjects)
            ? d.subjects[0]?.name ?? "a subject"
            : d.subjects?.name ?? "a subject";
          const dateStr = d.answered_at ?? new Date().toISOString();
          items.push({
            id: `doubt-${d.id}`,
            type: "DOUBT",
            icon: "💬",
            title: "Doubt Answered",
            body: `Your doubt about ${subjectName} was answered`,
            time: formatDate(dateStr),
            sortDate: dateStr,
            read: false,
          });
        }
      }

      // Assignment attempts
      if (attemptsRes.data) {
        for (const a of attemptsRes.data as any[]) {
          const title = (a.assignment as any)?.title ?? "an assignment";
          const score = a.score != null ? `${a.score}%` : "—";
          items.push({
            id: `attempt-${a.id}`,
            type: "ASSIGNMENT",
            icon: "📝",
            title: "Assignment Completed",
            body: `You completed "${title}" — score: ${score}`,
            time: formatDate(a.created_at),
            sortDate: a.created_at,
            read: false,
          });
        }
      }

      // XP logs
      if (xpLogsRes.data) {
        for (const x of xpLogsRes.data as any[]) {
          items.push({
            id: `xp-${x.id}`,
            type: "XP",
            icon: "⚡",
            title: "XP Earned",
            body: `+${x.xp} XP earned from ${x.source ?? "activity"}`,
            time: formatDate(x.created_at),
            sortDate: x.created_at,
            read: false,
          });
        }
      }

      // Sort all by date descending
      items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

      setNotifications(items);
      setLoading(false);
    };

    fetchAll();
  }, [user?.studentRecordId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Notifications</h1>
          <p className="text-sm text-[#7A869A]">{loading ? "Loading..." : `${unreadCount} unread`}</p>
        </div>
        {!loading && unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:underline">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
          <Bell size={40} className="text-[#CBD5E1] mx-auto mb-3" />
          <div className="text-sm text-[#7A869A]">No notifications yet</div>
          <div className="text-xs text-[#CBD5E1] mt-1">Complete assignments or ask doubts to see activity here</div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const s = TYPE_STYLE[n.type] ?? { bg: "#F8FAFC", border: "#E8EDF5" };
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm cursor-pointer"
                style={{ background: n.read ? "white" : s.bg, borderColor: n.read ? "#E8EDF5" : s.border }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: s.bg }}>
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-[#1A2035]">{n.title}</div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#FF6B35] shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-xs text-[#7A869A] mt-0.5 leading-relaxed">{n.body}</div>
                  <div className="text-[10px] text-[#CBD5E1] mt-1">{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, TrendingUp, BookOpen, Swords, AlertTriangle,
  Calendar, ChevronRight, Star, Flame, Trophy, MessageSquare,
  Clock, CheckCircle, XCircle, BarChart2
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(start);
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

interface ChildData {
  studentId: string;
  studentRecordId: string;
  classId: string;
  schoolId: string;
  name: string;
  initials: string;
  className: string;
  totalXp: number;
  level: number;
  rank: number | null;
  attendancePct: number | null;
  pendingAssignments: number;
  completedAssignments: number;
  totalAssignments: number;
  gamesWon: number | null;
  gamesPlayed: number | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  duedate: string;
  status: string;
  subject_name: string;
  attempted: boolean;
  score: number | null;
  xp_earned: number | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}

interface XpLogRow {
  id: string;
  xp: number;
  source: string;
  created_at: string;
}

function calcLevel(xp: number) {
  if (xp >= 10000) return 12;
  if (xp >= 8000) return 11;
  if (xp >= 6500) return 10;
  if (xp >= 5200) return 9;
  if (xp >= 4000) return 8;
  if (xp >= 3000) return 7;
  if (xp >= 2200) return 6;
  if (xp >= 1500) return 5;
  if (xp >= 1000) return 4;
  if (xp >= 600) return 3;
  if (xp >= 250) return 2;
  return 1;
}

function nextLevelXp(level: number) {
  const thresholds = [0, 0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6500, 8000, 10000];
  return thresholds[Math.min(level + 1, 12)] ?? 10000;
}

export default function ParentDashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [child, setChild] = useState<ChildData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [xpLogs, setXpLogs] = useState<XpLogRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const xp = useCountUp(child?.totalXp ?? 0);

  useEffect(() => {
    if (userLoading || !user || user.role !== "PARENT") return;
    const supabase = createClient();

    async function fetchAll() {
      setDataLoading(true);
      try {
        // 1. Find child
        const { data: studentRow } = await supabase
          .from("students")
          .select("id, user_id, school_id")
          .eq("parent_user_id", user!.id)
          .maybeSingle();

        if (!studentRow) { setDataLoading(false); return; }

        const [{ data: childUser }, { data: record }] = await Promise.all([
          supabase.from("users").select("name").eq("id", studentRow.user_id).single(),
          supabase
            .from("student_records")
            .select("id, class_id, classes(name, section)")
            .eq("student_id", studentRow.id)
            .eq("is_current", true)
            .maybeSingle(),
        ]);

        if (!childUser || !record) { setDataLoading(false); return; }

        const childName = childUser.name ?? "Child";
        const childInitials = childName.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        const cls = record.classes as unknown as { name: string; section: string } | null;
        const recordId = record.id;
        const classId = record.class_id;
        const schoolId = studentRow.school_id;

        // 2. Parallel data fetches
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

        const [
          { data: xpRow },
          { data: lbRow },
          { data: attendanceRows },
          { data: assignmentRows },
          { data: announcementRows },
          { data: xpLogRows },
        ] = await Promise.all([
          supabase.from("student_xp").select("total_xp").eq("student_records_id", recordId).maybeSingle(),
          supabase.from("leaderboards").select("rank, games_played, games_won").eq("student_records_id", recordId).maybeSingle(),
          supabase.from("attendance").select("status").eq("student_records_id", recordId).gte("date", firstOfMonth),
          supabase
            .from("assignment")
            .select("id, title, duedate, status, subjects(name)")
            .eq("class_id", classId)
            .order("duedate", { ascending: false })
            .limit(20),
          supabase
            .from("announcements")
            .select("id, title, content, created_at, is_pinned")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("xp_logs")
            .select("id, xp, source, created_at")
            .eq("student_records_id", recordId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        // 3. Build attendance stats
        const presentDays = attendanceRows?.filter(a => a.status === "PRESENT").length ?? 0;
        const totalDays = attendanceRows?.length ?? 0;
        const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

        // 4. Build assignment rows with attempt status
        let assignmentList: AssignmentRow[] = [];
        if (assignmentRows && assignmentRows.length > 0) {
          const assignmentIds = assignmentRows.map(a => a.id);
          const { data: attemptRows } = await supabase
            .from("assignment_attempts")
            .select("assignment_id, score, xp_earned")
            .eq("student_records_id", recordId)
            .in("assignment_id", assignmentIds);

          const attemptMap = new Map(attemptRows?.map(at => [at.assignment_id, at]) ?? []);
          assignmentList = assignmentRows.map(a => {
            const subj = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects as { name: string } | null;
            const attempt = attemptMap.get(a.id);
            const isDue = new Date(a.duedate) < now;
            let status = "PENDING";
            if (attempt) status = "COMPLETED";
            else if (isDue) status = "OVERDUE";
            return {
              id: a.id,
              title: a.title,
              duedate: a.duedate,
              status,
              subject_name: subj?.name ?? "—",
              attempted: !!attempt,
              score: attempt?.score ?? null,
              xp_earned: attempt?.xp_earned ?? null,
            };
          });
        }

        const totalXp = xpRow?.total_xp ?? 0;
        const level = calcLevel(totalXp);

        setChild({
          studentId: studentRow.id,
          studentRecordId: recordId,
          classId,
          schoolId,
          name: childName,
          initials: childInitials,
          className: cls ? `${cls.name}-${cls.section}` : "—",
          totalXp,
          level,
          rank: lbRow?.rank ?? null,
          attendancePct,
          pendingAssignments: assignmentList.filter(a => a.status === "PENDING").length,
          completedAssignments: assignmentList.filter(a => a.status === "COMPLETED").length,
          totalAssignments: assignmentList.length,
          gamesWon: lbRow?.games_won ?? null,
          gamesPlayed: lbRow?.games_played ?? null,
        });
        setAssignments(assignmentList);
        setAnnouncements(announcementRows ?? []);
        setXpLogs(xpLogRows ?? []);
      } finally {
        setDataLoading(false);
      }
    }

    fetchAll();
  }, [user, userLoading]);

  const isLoading = userLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-48 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />
            <div className="h-40 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />
          </div>
          <div className="h-80 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-4xl mb-4">👨‍👧</div>
        <div className="text-lg font-bold text-[#1A2035] mb-2">No child linked</div>
        <div className="text-sm text-[#7A869A]">Your account is not yet linked to a student. Please contact your school admin.</div>
      </div>
    );
  }

  const completedCount = child.completedAssignments;
  const totalAssignments = child.totalAssignments;
  const completionPct = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;
  const nlXp = nextLevelXp(child.level);

  const stats = [
    { label: "Total XP", value: xp.toLocaleString(), icon: "⚡", color: "#FFB347" },
    { label: "School Rank", value: child.rank != null ? `#${child.rank}` : "—", icon: "🏆", color: "#10B981" },
    { label: "Attendance", value: child.attendancePct != null ? `${child.attendancePct}%` : "—", icon: "📅", color: "#3B82F6" },
    { label: "Pending", value: child.pendingAssignments, icon: "📋", color: "#EF4444" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Hero */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #10B981 150%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #fff 0%, transparent 60%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 bg-[#EC4899]">
              {child.initials}
            </div>
            <div>
              <div className="text-xl font-bold">{child.name}</div>
              <div className="text-sm text-green-200">{child.className}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Level {child.level}</span>
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {stats.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center">
                <div className="text-base mb-0.5">{s.icon}</div>
                <div className="text-sm font-bold">{s.value}</div>
                <div className="text-[10px] text-green-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-4">
          <div className="flex justify-between text-xs text-green-200 mb-1">
            <span>Level {child.level} → Level {child.level + 1}</span>
            <span>{child.totalXp.toLocaleString()} / {nlXp.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (child.totalXp / nlXp) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">

          {/* Announcements */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-[#1A2035]">School Announcements</div>
            </div>
            {announcements.length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-6">No announcements</div>
            ) : (
              <div className="space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className={`flex items-start gap-3 p-3 rounded-xl border ${ann.is_pinned ? "bg-[#FFFBEB] border-[#FDE68A]" : "bg-[#F8FAFC] border-[#E8EDF5]"}`}>
                    <span className="text-base shrink-0">{ann.is_pinned ? "📌" : "📢"}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1A2035] truncate">{ann.title}</div>
                      <div className="text-[10px] text-[#7A869A] line-clamp-2 mt-0.5">{ann.content}</div>
                      <div className="text-[9px] text-[#CBD5E1] mt-1">{new Date(ann.created_at).toLocaleDateString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment tracker */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-[#1A2035]">Assignment Tracker</div>
              <Link href="/parent/assignments" className="text-xs text-[#10B981] font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {/* Progress summary */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7A869A]">Completion</span>
                  <span className="font-bold text-[#10B981]">{completedCount}/{totalAssignments}</span>
                </div>
                <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#10B981] transition-all duration-700" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#10B981]">{completionPct}%</div>
            </div>
            {assignments.length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-4">No assignments found</div>
            ) : (
              <div className="space-y-2">
                {assignments.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E8EDF5] hover:bg-[#F8FAFC] transition-colors">
                    <div className="shrink-0">
                      {a.status === "COMPLETED" ? <CheckCircle size={15} className="text-[#10B981]" />
                        : a.status === "OVERDUE" ? <XCircle size={15} className="text-[#EF4444]" />
                          : <Clock size={15} className="text-[#F59E0B]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1A2035] truncate">{a.title}</div>
                      <div className="text-[10px] text-[#7A869A]">{a.subject_name} · Due {a.duedate?.split("T")[0]}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: a.status === "COMPLETED" ? "#ECFDF5" : a.status === "OVERDUE" ? "#FEE2E2" : "#FFFBEB",
                        color: a.status === "COMPLETED" ? "#166534" : a.status === "OVERDUE" ? "#991B1B" : "#854D0E"
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent XP activity */}
          {xpLogs.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-[#1A2035]">Recent XP Activity</div>
                <Link href="/parent/reports" className="text-xs text-[#10B981] font-semibold flex items-center gap-1 hover:underline">
                  Full report <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {xpLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC]">
                    <span className="text-base">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#1A2035] truncate">{log.source}</div>
                      <div className="text-[10px] text-[#7A869A]">{new Date(log.created_at).toLocaleDateString("en-IN")}</div>
                    </div>
                    <span className="text-xs font-bold text-[#FF6B35]">+{log.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Trophy size={16} />, label: "School Rank", value: child.rank != null ? `#${child.rank}` : "—", color: "#10B981", bg: "#ECFDF5", href: "/parent/reports" },
              { icon: <Swords size={16} />, label: "Games Won", value: child.gamesWon != null ? `${child.gamesWon}/${child.gamesPlayed}` : "—", color: "#8B5CF6", bg: "#F5F3FF", href: "/parent/games" },
              { icon: <BarChart2 size={16} />, label: "Completed", value: `${completedCount}`, color: "#10B981", bg: "#ECFDF5", href: "/parent/assignments" },
              { icon: <Flame size={16} />, label: "Attendance", value: child.attendancePct != null ? `${child.attendancePct}%` : "—", color: "#FF6B35", bg: "#FFF7F4", href: "/parent/attendance" },
            ].map(s => (
              <Link key={s.label} href={s.href} className="bg-white rounded-xl p-3.5 border border-[#E8EDF5] hover:shadow-sm transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                <div className="text-base font-bold text-[#1A2035]">{s.value}</div>
                <div className="text-[10px] text-[#7A869A]">{s.label}</div>
              </Link>
            ))}
          </div>

          {/* Attendance this month */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-[#10B981]" />
              <span className="text-sm font-bold text-[#1A2035]">Attendance This Month</span>
            </div>
            {child.attendancePct != null ? (
              <>
                <div className="text-3xl font-bold text-[#10B981] mb-1">{child.attendancePct}%</div>
                <div className="h-2 bg-[#F0F4FA] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${child.attendancePct}%` }} />
                </div>
                <Link href="/parent/attendance" className="text-xs text-[#10B981] font-semibold flex items-center gap-1 hover:underline">
                  View calendar <ArrowRight size={12} />
                </Link>
              </>
            ) : (
              <div className="text-xs text-[#7A869A]">No attendance records this month</div>
            )}
          </div>

          {/* Message teacher */}
          <Link href="/parent/messages" className="bg-white rounded-2xl p-4 border border-[#E8EDF5] flex items-center gap-3 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <MessageSquare size={18} className="text-[#8B5CF6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1A2035]">Message a Teacher</div>
              <div className="text-[10px] text-[#7A869A]">Direct chat with {child.name.split(" ")[0]}&apos;s teachers</div>
            </div>
            <ChevronRight size={14} className="text-[#CBD5E1] group-hover:text-[#8B5CF6] transition-colors" />
          </Link>

          {/* Subjects link */}
          <Link href="/parent/subjects" className="bg-white rounded-2xl p-4 border border-[#E8EDF5] flex items-center gap-3 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen size={18} className="text-[#10B981]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1A2035]">View Subjects</div>
              <div className="text-[10px] text-[#7A869A]">All subjects for {child.className}</div>
            </div>
            <ChevronRight size={14} className="text-[#CBD5E1] group-hover:text-[#10B981] transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

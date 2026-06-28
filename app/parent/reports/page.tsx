"use client";
import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

async function fetchChild(parentUserId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select(`id, user_id, school_id,
      user:user_id ( id, name, email ),
      student_records ( id, class_id, is_current, classes:class_id ( name, section ) ),
      student_xp ( total_xp )`)
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  return data;
}

interface AssignmentAttempt {
  score: number;
  xp_earned: number;
  created_at: string;
  assignment: { title: string } | null;
}

interface XpLog {
  xp: number;
  source: string;
  created_at: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
}

function calcLevel(xp: number) {
  if (xp >= 10000) return 12;
  if (xp >= 8000)  return 11;
  if (xp >= 6500)  return 10;
  if (xp >= 5200)  return 9;
  if (xp >= 4000)  return 8;
  if (xp >= 3000)  return 7;
  if (xp >= 2200)  return 6;
  if (xp >= 1500)  return 5;
  if (xp >= 1000)  return 4;
  if (xp >= 600)   return 3;
  if (xp >= 250)   return 2;
  return 1;
}

export default function ParentReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [childName, setChildName] = useState<string>("");
  const [totalXp, setTotalXp] = useState(0);
  const [attempts, setAttempts] = useState<AssignmentAttempt[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary>({ present: 0, absent: 0, late: 0 });
  const [xpLogs, setXpLogs] = useState<XpLog[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const firstOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0] + "T00:00:00.000Z";

  useEffect(() => {
    if (userLoading || !user) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const child = await fetchChild(user.id);
      if (!child) { setLoading(false); return; }

      const name = (child.user as { name?: string } | null)?.name ?? "Your child";
      setChildName(name);

      const xpArr = Array.isArray(child.student_xp) ? child.student_xp as { total_xp: number }[] : [];
      const xp = xpArr[0]?.total_xp ?? 0;
      setTotalXp(xp);

      const records: { id: string; is_current: boolean }[] = Array.isArray(child.student_records)
        ? child.student_records as { id: string; is_current: boolean }[]
        : [];
      const currentRecord = records.find((r) => r.is_current);
      const childRecordId = currentRecord?.id ?? null;

      if (childRecordId) {
        // Recent attempts
        const { data: attData } = await supabase
          .from("assignment_attempts")
          .select("score, xp_earned, created_at, assignment:assignment_id(title)")
          .eq("student_records_id", childRecordId)
          .order("created_at", { ascending: false })
          .limit(10);
        setAttempts((attData as unknown as AssignmentAttempt[]) ?? []);

        // Attendance this month
        const { data: attRows } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_records_id", childRecordId)
          .gte("date", firstOfMonth)
          .lte("date", lastOfMonth);
        const rows = (attRows as { status: string }[]) ?? [];
        setAttendance({
          present: rows.filter((r) => r.status === "PRESENT").length,
          absent:  rows.filter((r) => r.status === "ABSENT").length,
          late:    rows.filter((r) => r.status === "LATE").length,
        });

        // XP logs last 7 days
        const { data: logsData } = await supabase
          .from("xp_logs")
          .select("xp, source, created_at")
          .eq("student_records_id", childRecordId)
          .gte("created_at", sevenDaysAgoStr)
          .order("created_at", { ascending: true });
        setXpLogs((logsData as XpLog[]) ?? []);
      }

      setLoading(false);
    })();
  }, [user, userLoading]);

  // Build daily XP map for chart
  const dailyXpMap = new Map<string, number>();
  for (const log of xpLogs) {
    const date = log.created_at.split("T")[0];
    dailyXpMap.set(date, (dailyXpMap.get(date) ?? 0) + log.xp);
  }
  // Build last 7 day labels
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
  const dailyXpData = last7Days.map((date) => ({ date, xp: dailyXpMap.get(date) ?? 0 }));
  const maxDailyXp = Math.max(...dailyXpData.map((d) => d.xp), 1);

  const level = calcLevel(totalXp);
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : null;
  const totalAttendance = attendance.present + attendance.absent + attendance.late;
  const attendancePct = totalAttendance > 0 ? Math.round(((attendance.present + attendance.late) / totalAttendance) * 100) : null;

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Reports</h1>
        <p className="text-sm text-[#7A869A]">Performance report for {childName}</p>
      </div>

      {/* Summary cards */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-bold text-[#1A2035]">Monthly Performance</div>
            <div className="text-xs text-[#7A869A]">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · EduBattle</div>
          </div>
          {avgScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ECFDF5] text-[#10B981] text-xs font-bold">
              <TrendingUp size={12} />
              {avgScore}% Avg Score
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total XP",     value: totalXp,                        color: "#FF6B35", bg: "#FFF7F4" },
            { label: "Level",        value: `Lv. ${level}`,                 color: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Avg Score",    value: avgScore !== null ? `${avgScore}%` : "—", color: "#3B82F6", bg: "#EFF6FF" },
            { label: "Attendance",   value: attendancePct !== null ? `${attendancePct}%` : "—", color: "#10B981", bg: "#ECFDF5" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: s.bg }}>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#7A869A]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* XP Progress */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-3">XP Progress — Level {level}</div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF7F4] flex items-center justify-center text-2xl font-bold text-[#FF6B35] shrink-0">
            {level}
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-[#7A869A] mb-1">
              <span>{totalXp.toLocaleString()} XP</span>
              <span>Level {level + 1} goal</span>
            </div>
            <div className="h-3 bg-[#F0F4FA] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] transition-all duration-700"
                style={{ width: `${Math.min((totalXp / 10000) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Assignment performance */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Recent Assignments</div>
        {attempts.length === 0 ? (
          <div className="text-sm text-[#7A869A] text-center py-6">No assignments attempted yet.</div>
        ) : (
          <div className="space-y-2">
            {attempts.map((a, i) => {
              const scoreColor = a.score >= 80 ? "#10B981" : a.score >= 60 ? "#F59E0B" : "#EF4444";
              const scoreBg    = a.score >= 80 ? "#ECFDF5" : a.score >= 60 ? "#FFFBEB" : "#FEF2F2";
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F0F4FA] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1A2035] truncate">
                      {a.assignment?.title ?? "Untitled"}
                    </div>
                    <div className="text-xs text-[#7A869A]">
                      {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" · "}+{a.xp_earned} XP
                    </div>
                  </div>
                  <div className="text-sm font-bold px-2.5 py-1 rounded-xl shrink-0" style={{ background: scoreBg, color: scoreColor }}>
                    {a.score}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance summary */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">
          Attendance — {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Present", value: attendance.present, color: "#10B981", bg: "#ECFDF5" },
            { label: "Absent",  value: attendance.absent,  color: "#EF4444", bg: "#FEF2F2" },
            { label: "Late",    value: attendance.late,    color: "#F59E0B", bg: "#FFFBEB" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        {attendancePct !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#7A869A] mb-1">
              <span>Attendance rate</span>
              <span className="font-bold text-[#10B981]">{attendancePct}%</span>
            </div>
            <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#10B981] transition-all duration-700" style={{ width: `${attendancePct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* XP trend chart */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">XP Earned — Last 7 Days</div>
        {dailyXpData.every((d) => d.xp === 0) ? (
          <div className="text-sm text-[#7A869A] text-center py-6">No XP activity in the last 7 days.</div>
        ) : (
          <div className="flex items-end gap-2 h-28">
            {dailyXpData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-[#7A869A]">{d.xp > 0 ? d.xp : ""}</div>
                <div
                  className="w-full rounded-t-lg bg-[#10B981] transition-all"
                  style={{ height: `${d.xp > 0 ? Math.max((d.xp / maxDailyXp) * 90, 4) : 2}px`, opacity: d.xp > 0 ? 1 : 0.2, background: d.xp > 0 ? "#10B981" : "#E8EDF5" }}
                />
                <div className="text-[9px] font-medium text-[#7A869A]">
                  {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

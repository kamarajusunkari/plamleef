"use client";
import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PRESENT: { bg: "#ECFDF5", color: "#10B981", label: "P" },
  ABSENT:  { bg: "#FEF2F2", color: "#EF4444", label: "A" },
  LATE:    { bg: "#FFFBEB", color: "#F59E0B", label: "L" },
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

interface AttendanceRecord {
  date: string;
  status: string;
}

export default function ParentAttendancePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [childName, setChildName] = useState<string>("");
  const [childRecordId, setChildRecordId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  useEffect(() => {
    if (userLoading || !user) return;
    (async () => {
      setLoading(true);
      const child = await fetchChild(user.id);
      if (!child) { setLoading(false); return; }

      const name = (child.user as { name?: string } | null)?.name ?? "Your child";
      setChildName(name);

      const records: { id: string; is_current: boolean }[] = Array.isArray(child.student_records)
        ? child.student_records as { id: string; is_current: boolean }[]
        : [];
      const currentRecord = records.find((r) => r.is_current);
      const recordId = currentRecord?.id ?? null;
      setChildRecordId(recordId);

      if (recordId) {
        const supabase = createClient();
        const { data } = await supabase
          .from("attendance")
          .select("date, status")
          .eq("student_records_id", recordId)
          .gte("date", firstOfMonth)
          .lte("date", lastOfMonth);
        setAttendance((data as AttendanceRecord[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user, userLoading]);

  const recordMap = new Map(attendance.map((a) => [a.date, a.status]));

  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const absentCount  = attendance.filter((a) => a.status === "ABSENT").length;
  const lateCount    = attendance.filter((a) => a.status === "LATE").length;
  const totalMarked  = presentCount + absentCount + lateCount;
  const percentage   = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!childRecordId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-[#7A869A]">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-sm">No child record found for your account.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Attendance</h1>
        <p className="text-sm text-[#7A869A]">{childName}&apos;s attendance — {monthLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Present",      value: presentCount,  color: "#10B981", bg: "#ECFDF5" },
          { label: "Absent",       value: absentCount,   color: "#EF4444", bg: "#FEF2F2" },
          { label: "Late",         value: lateCount,     color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Attendance %", value: `${percentage}%`, color: "#3B82F6", bg: "#EFF6FF" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance percentage bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#1A2035]">Monthly Attendance</span>
          <span className="text-sm font-bold text-[#10B981]">{percentage}%</span>
        </div>
        <div className="h-3 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#10B981] transition-all duration-700" style={{ width: `${percentage}%` }} />
        </div>
        <div className="flex justify-between text-xs text-[#7A869A] mt-1">
          <span>0%</span>
          <span className="text-[#F59E0B]">Minimum: 75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">{monthLabel}</div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-[#7A869A] py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const status = recordMap.get(dateStr);
            const style = status ? STATUS_STYLES[status] : { bg: "#F8FAFC", color: "#CBD5E1", label: "" };
            return (
              <div key={day} className="aspect-square rounded-xl flex flex-col items-center justify-center" style={{ background: style.bg }}>
                <div className="text-xs font-semibold" style={{ color: style.color }}>{day}</div>
                {style.label && <div className="text-[9px] font-bold" style={{ color: style.color }}>{style.label}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        {Object.entries(STATUS_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-[#7A869A]">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-[#7A869A]">
          <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: "#F8FAFC", color: "#CBD5E1" }}>—</span>
          No record
        </div>
      </div>

      {/* Notice */}
      {absentCount > 0 && (
        <div className="bg-[#FEF2F2] rounded-2xl p-4 border border-[#FECACA]">
          <div className="text-xs font-semibold text-[#EF4444]">⚠️ Attendance Notice</div>
          <div className="text-xs text-[#7A869A] mt-1">
            {childName} has been absent {absentCount} {absentCount === 1 ? "day" : "days"} this month.
            Please ensure absences are noted and submitted to the school office with a parent letter.
          </div>
        </div>
      )}

      {totalMarked === 0 && (
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5] text-center text-sm text-[#7A869A]">
          No attendance records found for {monthLabel}.
        </div>
      )}
    </div>
  );
}

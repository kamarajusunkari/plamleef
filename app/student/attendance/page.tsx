"use client";
import React, { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HOLIDAY";

interface AttendanceDay {
  date: number; // day of month
  status: AttendanceStatus | "FUTURE";
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PRESENT: { bg: "#ECFDF5", color: "#10B981", label: "P" },
  ABSENT:  { bg: "#FEF2F2", color: "#EF4444", label: "A" },
  LATE:    { bg: "#FFFBEB", color: "#F59E0B", label: "L" },
  HOLIDAY: { bg: "#F5F3FF", color: "#8B5CF6", label: "H" },
  FUTURE:  { bg: "#F8FAFC", color: "#CBD5E1", label: "" },
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentAttendancePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLabel, setMonthLabel] = useState("");
  const [startDay, setStartDay] = useState(0);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, percentage: 0 });

  useEffect(() => {
    if (!user?.studentRecordId) return;
    let cancelled = false;

    async function fetchAttendance() {
      if (!user?.studentRecordId) return;
      setLoading(true);
      try {
        const supabase = createClient();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        setMonthLabel(firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
        setStartDay(firstDay.getDay()); // 0 = Sunday

        const { data: rows } = await supabase
          .from("attendance")
          .select("date, status")
          .eq("student_records_id", user.studentRecordId)
          .gte("date", firstDay.toISOString().split("T")[0])
          .lte("date", lastDay.toISOString().split("T")[0]);

        if (cancelled) return;

        // Build a map: "YYYY-MM-DD" → status
        const statusMap = new Map<string, AttendanceStatus>();
        (rows ?? []).forEach((r) => {
          statusMap.set(r.date as string, r.status as AttendanceStatus);
        });

        const today = now.getDate();
        const daysInMonth = lastDay.getDate();
        const built: AttendanceDay[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const status = statusMap.get(dateStr);
          built.push({
            date: d,
            status: status ?? (d > today ? "FUTURE" : "FUTURE"),
          });
        }

        setDays(built);

        const present = built.filter((d) => d.status === "PRESENT").length;
        const absent = built.filter((d) => d.status === "ABSENT").length;
        const late = built.filter((d) => d.status === "LATE").length;
        const workingDays = present + absent + late;
        const percentage = workingDays > 0 ? Math.round(((present + late) / workingDays) * 100) : 0;
        setSummary({ present, absent, late, percentage });
      } catch (err) {
        console.warn("Attendance fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAttendance();
    return () => { cancelled = true; };
  }, [user?.studentRecordId]);

  const isPageLoading = userLoading || loading;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">My Attendance</h1>
        <p className="text-sm text-[#7A869A]">{monthLabel}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Present",    value: isPageLoading ? "…" : summary.present,    color: "#10B981", bg: "#ECFDF5" },
          { label: "Absent",     value: isPageLoading ? "…" : summary.absent,     color: "#EF4444", bg: "#FEF2F2" },
          { label: "Late",       value: isPageLoading ? "…" : summary.late,       color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Percentage", value: isPageLoading ? "…" : `${summary.percentage}%`, color: "#3B82F6", bg: "#EFF6FF" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-[#7A869A] py-1">{d}</div>
          ))}
        </div>

        {isPageLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[#F0F4FA] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for month start offset */}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map((day) => {
              const style = STATUS_STYLES[day.status];
              return (
                <div
                  key={day.date}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center"
                  style={{ background: style.bg }}
                >
                  <div className="text-xs font-semibold" style={{ color: style.color }}>{day.date}</div>
                  {style.label && (
                    <div className="text-[9px] font-bold" style={{ color: style.color }}>{style.label}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center flex-wrap">
        {Object.entries(STATUS_STYLES).filter(([k]) => k !== "FUTURE").map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-[#7A869A]">
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label || "—"}
            </span>
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      {!isPageLoading && days.filter((d) => d.status !== "FUTURE").length === 0 && (
        <div className="text-center py-4 text-sm text-[#7A869A]">No attendance records for this month yet.</div>
      )}
    </div>
  );
}

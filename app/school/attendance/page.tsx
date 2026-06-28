"use client";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { AttendanceRow } from "@/components/school/AttendanceRow";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceState = Record<string, { status: AttendanceStatus; note: string }>;

interface ClassRow {
  id: string;
  name: string;
  section: string;
}

interface StudentRecord {
  id: string;
  student: {
    users: { name: string } | null;
  } | null;
}

const today = new Date().toISOString().split("T")[0];
const todayLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function AttendancePage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [classes, setClasses]               = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [studentRecords, setStudentRecords]  = useState<StudentRecord[]>([]);
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [saving, setSaving]                  = useState(false);
  const [loadingClasses, setLoadingClasses]  = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load classes
  useEffect(() => {
    if (userLoading || !user?.schoolId) return;
    (async () => {
      setLoadingClasses(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("school_id", user.schoolId!)
        .order("name");
      const rows = (data as ClassRow[]) ?? [];
      setClasses(rows);
      if (rows.length > 0) setSelectedClassId(rows[0].id);
      setLoadingClasses(false);
    })();
  }, [user, userLoading]);

  // Load students + today's attendance when class changes
  const loadStudents = useCallback(async (classId: string) => {
    setLoadingStudents(true);
    const supabase = createClient();

    const { data: records } = await supabase
      .from("student_records")
      .select("id, student:student_id(users:user_id(name))")
      .eq("class_id", classId)
      .eq("is_current", true);

    const rows = (records as unknown as StudentRecord[]) ?? [];
    setStudentRecords(rows);

    const { data: attRows } = await supabase
      .from("attendance")
      .select("student_records_id, status")
      .eq("class_id", classId)
      .eq("date", today);

    const attMap = new Map((attRows as { student_records_id: string; status: string }[] ?? []).map(
      (a) => [a.student_records_id, a.status]
    ));

    const init: AttendanceState = {};
    for (const r of rows) {
      const status = attMap.get(r.id) ?? "present";
      init[r.id] = { status: status.toLowerCase() as AttendanceStatus, note: "" };
    }
    setAttendanceState(init);
    setLoadingStudents(false);
  }, []);

  useEffect(() => {
    if (selectedClassId) loadStudents(selectedClassId);
  }, [selectedClassId, loadStudents]);

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setAttendanceState((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));

  const setNote = (studentId: string, note: string) =>
    setAttendanceState((prev) => ({ ...prev, [studentId]: { ...prev[studentId], note } }));

  const markAllPresent = () =>
    setAttendanceState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => { next[id] = { ...next[id], status: "present" }; });
      return next;
    });

  const saveAttendance = async () => {
    if (!selectedClassId || !user?.schoolId) return;
    setSaving(true);
    const supabase = createClient();

    const rows = Object.entries(attendanceState).map(([studentRecordId, val]) => ({
      school_id:          user.schoolId!,
      student_records_id: studentRecordId,
      class_id:           selectedClassId,
      date:               today,
      status:             val.status.toUpperCase(),
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_records_id,date" });

    setSaving(false);
    if (error) {
      toast.error("Failed to save attendance");
    } else {
      toast.success("Attendance saved for today");
    }
  };

  const attCounts = Object.values(attendanceState).reduce(
    (acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const getStudentName = (sr: StudentRecord) => {
    const s = sr.student;
    if (!s) return "Unknown";
    const u = Array.isArray(s.users) ? s.users[0] : s.users;
    return (u as { name?: string } | null)?.name ?? "Unknown";
  };

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const AVATAR_COLORS = ["#10B981","#3B82F6","#8B5CF6","#F59E0B","#EC4899","#FF6B35"];

  if (userLoading || loadingClasses) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Attendance"
        subtitle={`Today: ${todayLabel}`}
        actions={
          <Button variant="ghost" onClick={() => toast("Export coming soon")}>Export Report</Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Present", count: attCounts["present"] || 0, color: "#10B981", bg: "#ECFDF5", icon: "✅" },
          { label: "Absent",  count: attCounts["absent"]  || 0, color: "#EF4444", bg: "#FEF2F2", icon: "❌" },
          { label: "Late",    count: attCounts["late"]    || 0, color: "#F59E0B", bg: "#FFFBEB", icon: "⏰" },
          { label: "Excused", count: attCounts["excused"] || 0, color: "#94A3B8", bg: "#F1F5F9", icon: "📋" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Class selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClassId(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedClassId === c.id ? "bg-[#FF6B35] text-white" : "bg-white border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"
            }`}
          >
            {c.name}-{c.section}
          </button>
        ))}
      </div>

      {/* Date display */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-semibold text-[#1A2035]">{todayLabel}</span>
        <span className="text-xs text-[#7A869A]">(Today)</span>
      </div>

      {/* Mark Attendance */}
      <Card>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {[
            { label: "Present", count: attCounts["present"] || 0, color: "#10B981" },
            { label: "Absent",  count: attCounts["absent"]  || 0, color: "#EF4444" },
            { label: "Late",    count: attCounts["late"]    || 0, color: "#F59E0B" },
            { label: "Excused", count: attCounts["excused"] || 0, color: "#94A3B8" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[#7A869A]">{s.label}:</span>
              <span className="font-bold text-[#1A2035]">{s.count}</span>
            </div>
          ))}
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button size="sm" variant="success" onClick={markAllPresent}>✓ Mark All Present</Button>
            <Button size="sm" variant="primary" onClick={saveAttendance} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : studentRecords.length === 0 ? (
          <div className="text-center text-sm text-[#7A869A] py-8">
            {selectedClass
              ? `No students found in ${selectedClass.name}-${selectedClass.section}.`
              : "Select a class to mark attendance."}
          </div>
        ) : (
          studentRecords.map((sr, idx) => {
            const name = getStudentName(sr);
            return (
              <AttendanceRow
                key={sr.id}
                studentId={sr.id}
                name={name}
                initials={getInitials(name)}
                color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                status={attendanceState[sr.id]?.status ?? "present"}
                note={attendanceState[sr.id]?.note ?? ""}
                onStatusChange={setStatus}
                onNoteChange={setNote}
              />
            );
          })
        )}
      </Card>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Users, CheckSquare, ClipboardList, Trophy, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumb } from "@/components/school/Breadcrumb";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Avatar } from "@/components/school/Avatar";
import { Badge } from "@/components/school/Badge";
import { StatsCard } from "@/components/school/StatsCard";
import { ProgressBar } from "@/components/school/ProgressBar";
import { AttendanceRow } from "@/components/school/AttendanceRow";
import { LineChart } from "@/components/school/LineChart";
import { getScoreBadgeClass, getModeBadgeClass } from "@/lib/utils";

const TABS = ["Overview", "Students", "Subjects & Teachers", "Assignments", "Attendance", "Performance", "Timetable"];

const AVATAR_COLORS = [
  "#3B82F6", "#EC4899", "#FF6B35", "#10B981", "#8B5CF6",
  "#F59E0B", "#0EA5E9", "#EF4444", "#14B8A6", "#6366F1",
];

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceState = Record<string, { status: AttendanceStatus; note: string }>;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function xpToLevel(xp: number): { level: number; levelName: string } {
  if (xp >= 5000) return { level: 5, levelName: "Master" };
  if (xp >= 3000) return { level: 4, levelName: "Expert" };
  if (xp >= 1500) return { level: 3, levelName: "Advanced" };
  if (xp >= 500) return { level: 2, levelName: "Learner" };
  return { level: 1, levelName: "Beginner" };
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "overview";

  const activeTab = TABS.findIndex(
    (t) => t.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-") === tabParam
  );
  const currentTab = activeTab >= 0 ? activeTab : 0;

  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState<{ id: string; name: string; section: string; school_id: string } | null>(null);
  const [students, setStudents] = useState<{
    id: string; studentId: string; name: string; email: string;
    initials: string; color: string; xp: number; level: number; levelName: string;
  }[]>([]);
  const [assignments, setAssignments] = useState<{
    id: string; title: string; mode: string; created_at: string; due_date: string | null;
    quiz: { title: string; subject: { name: string } | null } | null;
    submittedCount: number; totalCount: number; avgScore: number;
  }[]>([]);
  const [classSubjects, setClassSubjects] = useState<{
    id: string; subject_id: string; teacher_id: string | null;
    subjectName: string; teacherName: string;
  }[]>([]);
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);
      try {
        // Class info
        const { data: clsData } = await supabase
          .from("classes")
          .select("id, name, section, school_id")
          .eq("id", classId)
          .single();
        setCls(clsData);

        // Students in class
        const { data: records } = await supabase
          .from("student_records")
          .select(
            "id, student_id, students(id, user_id, users:user_id(name, email)), student_xp(total_xp)"
          )
          .eq("class_id", classId)
          .eq("is_current", true);

        const mappedStudents = (records || []).map((r: any, i: number) => {
          const user = r.students?.users;
          const name = user?.name ?? "Unknown";
          const email = user?.email ?? "";
          const xp = Array.isArray(r.student_xp)
            ? (r.student_xp[0]?.total_xp ?? 0)
            : (r.student_xp?.total_xp ?? 0);
          const { level, levelName } = xpToLevel(xp);
          return {
            id: r.id,
            studentId: r.student_id,
            name,
            email,
            initials: getInitials(name),
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
            xp,
            level,
            levelName,
          };
        });
        // Sort by XP descending
        mappedStudents.sort((a, b) => b.xp - a.xp);
        setStudents(mappedStudents);

        // Assignments for class
        const { data: assignmentsData } = await supabase
          .from("assignment")
          .select(
            "id, title, mode, created_at, due_date, quiz:quiz_id(title, subject:subject_id(name)), assignment_attempts(id, score, submitted_at)"
          )
          .eq("class_id", classId)
          .order("created_at", { ascending: false });

        const mappedAssignments = (assignmentsData || []).map((a: any) => {
          const attempts = a.assignment_attempts || [];
          const submittedCount = attempts.length;
          const avgScore =
            submittedCount > 0
              ? Math.round(attempts.reduce((s: number, x: any) => s + (x.score ?? 0), 0) / submittedCount)
              : 0;
          return {
            id: a.id,
            title: a.title,
            mode: a.mode,
            created_at: a.created_at,
            due_date: a.due_date,
            quiz: a.quiz,
            submittedCount,
            totalCount: mappedStudents.length,
            avgScore,
          };
        });
        setAssignments(mappedAssignments);

        // Subjects & teachers
        const { data: csData } = await supabase
          .from("class_subjects")
          .select("id, subject_id, teacher_id, subjects(name), teachers(id, users:user_id(name))")
          .eq("class_id", classId);

        setClassSubjects(
          (csData || []).map((cs: any) => ({
            id: cs.id,
            subject_id: cs.subject_id,
            teacher_id: cs.teacher_id,
            subjectName: cs.subjects?.name ?? "Unknown Subject",
            teacherName: cs.teachers?.users?.name ?? "Unassigned",
          }))
        );

        // Attendance for today
        const { data: todayAttendance } = await supabase
          .from("attendance")
          .select("id, student_id, status, note")
          .eq("class_id", classId)
          .eq("date", today);

        const initAtt: AttendanceState = {};
        // Pre-fill everyone with "present" as default
        (records || []).forEach((r: any) => {
          initAtt[r.student_id] = { status: "present", note: "" };
        });
        // Override with saved attendance
        (todayAttendance || []).forEach((row: any) => {
          initAtt[row.student_id] = {
            status: row.status as AttendanceStatus,
            note: row.note ?? "",
          };
        });
        setAttendanceState(initAtt);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };
  const setNote = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note },
    }));
  };
  const markAllPresent = () => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], status: "present" };
      });
      return next;
    });
  };

  const saveAttendance = async () => {
    const supabase = createClient();
    setSavingAttendance(true);
    try {
      const rows = Object.entries(attendanceState).map(([student_id, val]) => ({
        class_id: classId,
        student_id,
        date: today,
        status: val.status,
        note: val.note,
      }));
      const { error } = await supabase.from("attendance").upsert(rows, {
        onConflict: "class_id,student_id,date",
      });
      if (error) throw error;
      toast.success("Attendance saved");
    } catch (err: any) {
      toast.error("Failed to save attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const navigateTo = (tab: string) => {
    router.push(`/school/classes/${classId}?tab=${tab}`);
  };

  const attCounts = Object.values(attendanceState).reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalStudents = students.length;
  const avgXp =
    totalStudents > 0
      ? Math.round(students.reduce((s, st) => s + st.xp, 0) / totalStudents)
      : 0;
  const presentCount = attCounts["present"] || 0;
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const activeAssignments = assignments.filter(
    (a) => !a.due_date || a.due_date >= today
  );

  const SUBJECT_COLORS = [
    "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899",
    "#0EA5E9", "#EF4444", "#14B8A6",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  if (!cls) {
    return <div className="p-8 text-center text-[#7A869A]">Class not found</div>;
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumb
        items={[
          { label: "Classes", href: "/school/classes" },
          { label: `${cls.name} — ${cls.section}` },
        ]}
      />

      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 bg-[#FF6B35]">
            {cls.name.replace(/Grade /i, "")}{cls.section}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#1A2035]">
                {cls.name} — Section {cls.section}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">CBSE</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">2025-26</span>
            </div>
            <div className="text-sm text-[#7A869A]">
              {totalStudents} students · {classSubjects.length} subjects
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => router.push(`/school/assignments?class=${classId}`)}
            >
              Assign Quiz
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push(`/school/announcements?target=${classId}`)}
            >
              Announce
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigateTo("attendance")}>
              Attendance
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((tab, i) => {
          const tabKey = tab.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
          return (
            <button
              key={tab}
              onClick={() => navigateTo(tabKey)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                currentTab === i
                  ? "bg-[#FF6B35] text-white"
                  : "text-[#7A869A] hover:bg-[#F0F4FA]"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab 0: Overview */}
      {currentTab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatsCard
              label="Students"
              value={totalStudents}
              icon={<Users size={18} />}
              bgColor="#EFF6FF"
              iconColor="#3B82F6"
            />
            <StatsCard
              label="Avg XP"
              value={avgXp.toLocaleString()}
              icon={<Trophy size={18} />}
              bgColor="#FFF7F4"
              iconColor="#FF6B35"
            />
            <StatsCard
              label="Attendance Today"
              value={`${attendancePct}%`}
              icon={<CheckSquare size={18} />}
              bgColor="#FFFBEB"
              iconColor="#F59E0B"
            />
            <StatsCard
              label="Active Assignments"
              value={activeAssignments.length}
              icon={<ClipboardList size={18} />}
              bgColor="#ECFDF5"
              iconColor="#10B981"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <div className="text-sm font-semibold text-[#1A2035] mb-4">XP Trend (8 Weeks)</div>
              <LineChart
                data={[0, 0, 0, 0, 0, 0, 0, avgXp].map((v, i, arr) =>
                  i === arr.length - 1 ? v : Math.round((avgXp / arr.length) * (i + 1))
                )}
                labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
                avgLine={avgXp * 0.75}
              />
            </Card>
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-4">Top Students</div>
              <div className="flex items-end justify-center gap-4 py-2">
                {students.slice(0, 3).map((s, i) => (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className="text-sm">{i === 0 ? "👑" : i === 1 ? "🥈" : "🥉"}</div>
                    <Avatar initials={s.initials} color={s.color} size={36} />
                    <div className="text-[10px] font-semibold text-[#1A2035] text-center">
                      {s.name.split(" ")[0]}
                    </div>
                    <div className="text-[9px] text-[#FFB347]">{s.xp.toLocaleString()} XP</div>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="text-xs text-[#7A869A]">No students yet</div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Active Assignments</div>
            {activeAssignments.length === 0 ? (
              <div className="text-center text-sm text-[#7A869A] py-6">No active assignments</div>
            ) : (
              <div className="space-y-3">
                {activeAssignments.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getModeBadgeClass(a.mode)}`}
                    >
                      {a.mode}
                    </span>
                    <span className="text-xs font-medium text-[#1A2035] flex-1">{a.title}</span>
                    <ProgressBar value={a.submittedCount} max={a.totalCount} height={6} className="w-24" />
                    <span className="text-[10px] text-[#7A869A]">
                      {a.submittedCount}/{a.totalCount}
                    </span>
                    <Link href={`/school/assignments/${a.id}`}>
                      <Button size="sm" variant="ghost">View Results</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 1: Students */}
      {currentTab === 1 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1A2035]">Students ({students.length})</h3>
          </div>
          {students.length === 0 ? (
            <div className="text-center text-sm text-[#7A869A] py-8">No students enrolled</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F4FA]">
                  {["#", "Student", "XP / Level", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr
                    key={s.id}
                    className="border-b border-[#F0F4FA] last:border-0 hover:bg-[#F8FAFC] cursor-pointer"
                    onClick={() => router.push(`/school/students/${s.studentId}`)}
                  >
                    <td className="py-2.5 pr-3 text-xs text-[#7A869A]">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Avatar initials={s.initials} color={s.color} size={32} />
                        <div>
                          <div className="text-xs font-medium text-[#1A2035]">{s.name}</div>
                          <div className="text-[10px] text-[#7A869A]">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="w-16 h-1.5 bg-[#F0F4FA] rounded-full mb-1">
                        <div
                          className="h-full bg-[#FF6B35] rounded-full"
                          style={{ width: `${Math.min((s.xp / 5000) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#7A869A]">
                        Lv.{s.level} {s.levelName} · {s.xp.toLocaleString()} XP
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toast.success(`Notification sent to ${s.name}`)}
                      >
                        Notify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tab 2: Subjects & Teachers */}
      {currentTab === 2 && (
        <div className="grid grid-cols-3 gap-4">
          {classSubjects.length === 0 ? (
            <div className="col-span-3 text-center text-sm text-[#7A869A] py-8">
              No subjects assigned to this class
            </div>
          ) : (
            classSubjects.map((cs, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              const teacherInitials = getInitials(cs.teacherName);
              return (
                <Card key={cs.id}>
                  <div className="h-1 rounded-full mb-3" style={{ backgroundColor: color }} />
                  <div className="text-sm font-semibold text-[#1A2035] mb-1">{cs.subjectName}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar initials={teacherInitials} color={color} size={28} />
                    <span className="text-xs text-[#7A869A]">{cs.teacherName}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 justify-center text-[10px]"
                      onClick={() => router.push(`/school/assignments?class=${classId}`)}
                    >
                      Assign Quiz
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
          <Card
            className="flex items-center justify-center cursor-pointer hover:bg-[#F8FAFC]"
            onClick={() => toast("Add subject modal coming")}
          >
            <div className="text-center text-[#7A869A]">
              <div className="text-2xl mb-2">+</div>
              <div className="text-xs">Add Subject</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Assignments */}
      {currentTab === 3 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1A2035]">Assignments</h3>
            <div className="flex gap-1">
              {["All", "Active", "Overdue", "Closed"].map((f) => (
                <button
                  key={f}
                  className="px-3 py-1 text-xs rounded-full border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="text-center text-sm text-[#7A869A] py-8">
                No assignments for this class
              </div>
            ) : (
              assignments.map((a) => {
                const isOverdue = !!a.due_date && a.due_date < today;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isOverdue ? "bg-[#FEF2F2] border-[#EF4444]/30" : "border-[#E8EDF5]"
                    }`}
                  >
                    <div
                      className="w-1 h-12 rounded-full"
                      style={{
                        backgroundColor: isOverdue
                          ? "#EF4444"
                          : a.mode === "GAME"
                          ? "#FF6B35"
                          : "#3B82F6",
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getModeBadgeClass(a.mode)}`}
                        >
                          {a.mode}
                        </span>
                        <span className="text-xs font-medium text-[#1A2035]">{a.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={a.submittedCount}
                          max={a.totalCount}
                          height={5}
                          className="w-32"
                        />
                        <span className="text-[10px] text-[#7A869A]">
                          {a.submittedCount}/{a.totalCount}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(a.avgScore)}`}
                    >
                      {a.avgScore}%
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/school/assignments/${a.id}`}>
                        <Button size="sm" variant="ghost">View Results</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toast.success(
                            `Reminder sent to ${a.totalCount - a.submittedCount} students`
                          )
                        }
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Attendance */}
      {currentTab === 4 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[#1A2035]">
                Attendance — {new Date(today).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">Monthly Summary</Button>
                <Button size="sm" variant="ghost">History</Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              {[
                { label: "Present", count: attCounts["present"] || 0, color: "#10B981" },
                { label: "Absent", count: attCounts["absent"] || 0, color: "#EF4444" },
                { label: "Late", count: attCounts["late"] || 0, color: "#F59E0B" },
                { label: "Excused", count: attCounts["excused"] || 0, color: "#94A3B8" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[#7A869A]">{s.label}:</span>
                  <span className="font-bold text-[#1A2035]">{s.count}</span>
                </div>
              ))}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="success" onClick={markAllPresent}>
                  ✓ Mark All Present
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const reset: AttendanceState = {};
                    students.forEach((s) => {
                      reset[s.studentId] = { status: "present", note: "" };
                    });
                    setAttendanceState(reset);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div>
              {students.length === 0 && (
                <div className="text-center text-sm text-[#7A869A] py-8">
                  No students enrolled in this class
                </div>
              )}
              {students.map((s) => (
                <AttendanceRow
                  key={s.studentId}
                  studentId={s.studentId}
                  name={s.name}
                  initials={s.initials}
                  color={s.color}
                  status={attendanceState[s.studentId]?.status ?? "present"}
                  note={attendanceState[s.studentId]?.note ?? ""}
                  onStatusChange={setStatus}
                  onNoteChange={setNote}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Performance */}
      {currentTab === 5 && (
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">XP Trend (8 Weeks)</div>
            <LineChart
              data={Array.from({ length: 8 }, (_, i) =>
                Math.round((avgXp / 8) * (i + 1))
              )}
              labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
              avgLine={avgXp * 0.75}
              height={160}
            />
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-4">Subject Mastery</div>
              <div className="space-y-3">
                {classSubjects.length === 0 ? (
                  <div className="text-xs text-[#7A869A]">No subjects assigned</div>
                ) : (
                  classSubjects.map((cs, i) => {
                    const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                    return (
                      <div key={cs.id} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-[#7A869A] truncate">{cs.subjectName}</div>
                        <ProgressBar value={75} height={6} className="flex-1" color={color} />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-[#10B981] bg-[#ECFDF5]">
                          75%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-4">Score Distribution</div>
              <div className="space-y-2">
                {((): { label: string; count: number }[] => {
                  const buckets = [
                    { label: "90-100%", count: 0 },
                    { label: "80-89%", count: 0 },
                    { label: "70-79%", count: 0 },
                    { label: "60-69%", count: 0 },
                    { label: "Below 60%", count: 0 },
                  ];
                  // Derive score distribution from assignment avg scores
                  assignments.forEach((a) => {
                    if (a.avgScore >= 90) buckets[0].count++;
                    else if (a.avgScore >= 80) buckets[1].count++;
                    else if (a.avgScore >= 70) buckets[2].count++;
                    else if (a.avgScore >= 60) buckets[3].count++;
                    else buckets[4].count++;
                  });
                  return buckets;
                })().map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-16 text-[10px] text-[#7A869A]">{label}</div>
                    <div className="flex-1 h-5 bg-[#F0F4FA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF6B35] rounded-full flex items-center px-2"
                        style={{
                          width: `${assignments.length > 0 ? (count / assignments.length) * 100 : 0}%`,
                        }}
                      >
                        {count > 0 && (
                          <span className="text-white text-[9px] font-bold">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 6: Timetable */}
      {currentTab === 6 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#1A2035]">
              Timetable — {cls.name} {cls.section}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toast("Edit mode coming soon")}>
                Edit Timetable
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toast("PDF downloading...")}>
                Print PDF
              </Button>
            </div>
          </div>
          {classSubjects.length === 0 ? (
            <div className="text-center text-sm text-[#7A869A] py-12">
              Timetable coming soon. Add subjects to this class to get started.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-[#7A869A] mb-2">Subjects assigned to this class:</div>
              <div className="grid grid-cols-2 gap-3">
                {classSubjects.map((cs, i) => {
                  const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                  return (
                    <div
                      key={cs.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EDF5]"
                    >
                      <div
                        className="w-2 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-[#1A2035]">{cs.subjectName}</div>
                        <div className="text-xs text-[#7A869A]">{cs.teacherName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[#F8FAFC] border border-[#E8EDF5] text-xs text-[#7A869A] text-center">
                Full timetable scheduling coming soon
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

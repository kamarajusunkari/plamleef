"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, ClipboardList, HelpCircle, BookOpen, Cpu, Zap,
  Clock, ChevronRight, Play, CheckCircle, Star, CalendarDays,
  GraduationCap, Shield, ArrowRight,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

function StatCard({ label, value, sub, icon, color, bg, href }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; bg: string; href?: string;
}) {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === "number" ? value : null;

  useEffect(() => {
    if (!numVal) return;
    let start = 0;
    const end = numVal;
    const timer = setInterval(() => {
      start += Math.ceil(end / 20);
      if (start >= end) { setDisplay(end); clearInterval(timer); } else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [numVal]);

  const content = (
    <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-card transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {href && <ChevronRight size={14} className="text-[#7A869A]" />}
      </div>
      <div className="text-2xl font-bold text-[#1A2035]">{numVal !== null ? display : value}</div>
      <div className="text-xs font-medium text-[#7A869A] mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#94A3B8] mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

type ClassRow = {
  classId: string;
  name: string;
  section: string;
  subjectName: string;
  studentCount: number;
  color: string;
};

type AssignmentRow = {
  id: string;
  title: string;
  className: string;
  section: string;
  duedate: string;
  status: string;
};

type DoubtRow = {
  id: string;
  content: string;
  subjectName: string;
  studentName: string;
  studentInitials: string;
};

// ─── Timetable types ─────────────────────────────────────────────────────────
type TimetablePeriod = {
  period: number;
  subjectName: string;
  className: string;
  classSection: string;
};

type DaySchedule = {
  day: string;
  dayLabel: string;
  isToday: boolean;
  periods: TimetablePeriod[];
};

const DAYS_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type TDay = typeof DAYS_ORDER[number];
const DAY_LABELS: Record<TDay, string> = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
  THU: "Thursday", FRI: "Friday", SAT: "Saturday",
};
const DAY_SHORT: Record<TDay, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed",
  THU: "Thu", FRI: "Fri", SAT: "Sat",
};
const PERIOD_TIMES: Record<number, string> = {
  1: "8:00",  2: "8:45",  3: "9:30",  4: "10:15",
  5: "11:15", 6: "12:00", 7: "12:45", 8: "13:30",
};
// Map JS getDay() (0=Sun) to our Day keys
const JS_DAY_MAP: Record<number, TDay | null> = {
  0: null, 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT",
};

const CLASS_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#FF6B35", "#F59E0B", "#EF4444"];

// ─── MyTimetableSection (defined OUTSIDE main export) ────────────────────────
function MyTimetableSection({ teacherId }: { teacherId: string }) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  const todayDay = JS_DAY_MAP[new Date().getDay()];

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("timetable")
        .select("day, period, subject_id, subjects(name), class_id, classes(name, section)")
        .eq("teacher_id", teacherId)
        .order("period", { ascending: true });

      if (error) {
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.message?.includes("schema cache")) {
          setTableExists(false);
        }
        setLoading(false);
        return;
      }

      setTableExists(true);

      // Group by day
      const byDay = new Map<TDay, TimetablePeriod[]>();
      for (const row of (data ?? [])) {
        const day = row.day as TDay;
        if (!DAYS_ORDER.includes(day)) continue;
        const sub = Array.isArray(row.subjects) ? row.subjects[0] : (row.subjects as { name?: string } | null);
        const cls = Array.isArray(row.classes) ? row.classes[0] : (row.classes as { name?: string; section?: string } | null);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push({
          period: row.period,
          subjectName: sub?.name ?? "",
          className: cls?.name ?? "",
          classSection: cls?.section ?? "",
        });
      }

      const built: DaySchedule[] = DAYS_ORDER
        .filter((d) => byDay.has(d))
        .map((d) => ({
          day: d,
          dayLabel: DAY_LABELS[d],
          isToday: todayDay === d,
          periods: (byDay.get(d) ?? []).sort((a, b) => a.period - b.period).slice(0, 6),
        }));

      setSchedule(built);
      setLoading(false);
    })();
  }, [teacherId, todayDay]);

  if (!tableExists) return null; // Silently hide if table doesn't exist yet

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-[#FF6B35]" />
          <span className="text-sm font-semibold text-[#1A2035]">My Timetable This Week</span>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (schedule.length === 0) return null; // Nothing to show

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[#FF6B35]" />
          <span className="text-sm font-semibold text-[#1A2035]">My Timetable This Week</span>
        </div>
        <span className="text-xs text-[#7A869A]">
          {todayDay ? DAY_LABELS[todayDay] : new Date().toLocaleDateString("en-IN", { weekday: "long" })}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {schedule.map((daySchedule) => (
          <div
            key={daySchedule.day}
            className={`rounded-xl border p-3 transition-all ${
              daySchedule.isToday
                ? "border-[#FF6B35] bg-[#FFF7F4] shadow-sm"
                : "border-[#E8EDF5] bg-[#F8FAFC]"
            }`}
          >
            {/* Day header */}
            <div className={`text-xs font-bold mb-2 flex items-center justify-between ${daySchedule.isToday ? "text-[#FF6B35]" : "text-[#7A869A]"}`}>
              <span>{DAY_SHORT[daySchedule.day as TDay]}</span>
              {daySchedule.isToday && (
                <span className="text-[9px] bg-[#FF6B35] text-white px-1.5 py-0.5 rounded-full font-semibold">Today</span>
              )}
            </div>

            {/* Periods */}
            <div className="space-y-1.5">
              {daySchedule.periods.map((p) => (
                <div key={p.period} className="flex items-start gap-2">
                  <div className="shrink-0 text-[10px] text-[#7A869A] w-10 pt-px">
                    <div className="font-semibold text-[#1A2035] leading-none">P{p.period}</div>
                    <div className="leading-none mt-0.5">{PERIOD_TIMES[p.period]}</div>
                  </div>
                  <div className="flex-1 min-w-0 bg-white rounded-lg px-2 py-1 border border-[#E8EDF5]">
                    <div className="text-[10px] font-semibold text-[#1A2035] truncate leading-tight">{p.subjectName}</div>
                    <div className="text-[9px] text-[#7A869A] leading-tight">{p.className}{p.classSection ? `-${p.classSection}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [doubts, setDoubts] = useState<DoubtRow[]>([]);
  const [stats, setStats] = useState({ quizzesThisWeek: 0, openDoubts: 0, classCount: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    const teacherId = user.teacherId;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    async function fetchAll() {
      setLoading(true);

      // Fetch teacher's class_subjects -> classes
      const { data: classSubjects } = await supabase
        .from("class_subjects")
        .select("class_id, subjects(name), classes(id, name, section)")
        .eq("teacher_id", teacherId);

      const classRows: ClassRow[] = [];
      if (classSubjects) {
        let colorIdx = 0;
        for (const cs of classSubjects) {
          const cls = Array.isArray(cs.classes) ? cs.classes[0] : cs.classes as { id?: string; name?: string; section?: string } | null;
          const sub = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects as { name?: string } | null;
          if (!cls?.id) continue;
          const { count } = await supabase
            .from("student_records")
            .select("id", { count: "exact", head: true })
            .eq("class_id", cs.class_id)
            .eq("is_current", true);
          classRows.push({
            classId: cls.id,
            name: cls.name ?? "",
            section: cls.section ?? "",
            subjectName: sub?.name ?? "",
            studentCount: count ?? 0,
            color: CLASS_COLORS[colorIdx++ % CLASS_COLORS.length],
          });
        }
      }
      setClasses(classRows);

      // Fetch recent 5 assignments
      const { data: assignmentData } = await supabase
        .from("assignment")
        .select("id, title, duedate, status, classes(name, section)")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (assignmentData) {
        setAssignments(assignmentData.map(a => {
          const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes as { name?: string; section?: string } | null;
          return {
            id: a.id,
            title: a.title,
            className: cls?.name ?? "",
            section: cls?.section ?? "",
            duedate: a.duedate,
            status: a.status,
          };
        }));
      }

      // Fetch open doubts
      const { data: doubtData } = await supabase
        .from("doubts")
        .select("id, content, subjects(name), student_records_id, student_records(students(users(name)))")
        .eq("teacher_id", teacherId)
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(5);

      if (doubtData) {
        setDoubts(doubtData.map(d => {
          const sub = Array.isArray(d.subjects) ? d.subjects[0] : d.subjects as { name?: string } | null;
          const rec = Array.isArray(d.student_records) ? d.student_records[0] : d.student_records as Record<string, unknown> | null;
          const stu = rec ? (Array.isArray((rec as { students?: unknown }).students) ? ((rec as { students?: unknown[] }).students as Record<string, unknown>[])?.[0] : (rec as { students?: Record<string, unknown> }).students) : null;
          const usr = stu ? (Array.isArray((stu as { users?: unknown }).users) ? ((stu as { users?: unknown[] }).users as Record<string, unknown>[])?.[0] : (stu as { users?: Record<string, unknown> }).users) : null;
          const studentName = (usr as { name?: string } | null)?.name ?? "Student";
          const initials = studentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
          return {
            id: d.id,
            content: d.content,
            subjectName: sub?.name ?? "",
            studentName,
            studentInitials: initials,
          };
        }));
      }

      // Stats
      const [{ count: quizCount }, { count: doubtCount }] = await Promise.all([
        supabase.from("quiz").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("doubts").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "OPEN"),
      ]);

      const totalStudents = classRows.reduce((sum, c) => sum + c.studentCount, 0);
      setStats({
        quizzesThisWeek: quizCount ?? 0,
        openDoubts: doubtCount ?? 0,
        classCount: classRows.length,
        totalStudents,
      });

      setLoading(false);
    }

    fetchAll();
  }, [user?.teacherId]);

  const firstName = user?.name?.split(" ")[0] ?? "Teacher";

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Good morning, {firstName}! 👋</h1>
          <p className="text-sm text-[#7A869A]">You have {stats.openDoubts} pending doubts and {assignments.length} recent assignments</p>
        </div>
        <Link href="/teacher/quizzes" className="flex items-center gap-2 bg-[#8B5CF6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
          <Zap size={16} />
          Create Quiz
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} sub={`across ${stats.classCount} classes`} icon={<Users size={18} />} color="#3B82F6" bg="#EFF6FF" href="/teacher/classes" />
        <StatCard label="Open Doubts" value={stats.openDoubts} sub="needs your reply" icon={<HelpCircle size={18} />} color="#EF4444" bg="#FEF2F2" href="/teacher/doubts" />
        <StatCard label="My Classes" value={stats.classCount} icon={<ClipboardList size={18} />} color="#FF6B35" bg="#FFF7F4" href="/teacher/classes" />
        <StatCard label="Quizzes This Week" value={stats.quizzesThisWeek} icon={<BookOpen size={18} />} color="#10B981" bg="#ECFDF5" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent assignments */}
        <div className="col-span-1 bg-white rounded-2xl p-5 border border-[#E8EDF5]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#1A2035]">Recent Assignments</div>
            <Clock size={14} className="text-[#7A869A]" />
          </div>
          {assignments.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#7A869A]">No assignments yet</div>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => {
                const isActive = a.status === "ACTIVE";
                const isOverdue = a.status === "OVERDUE";
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                    style={{
                      background: isActive ? "#F5F3FF" : isOverdue ? "#FEF2F2" : "#F8FAFC",
                      border: isActive ? "1px solid #DDD6FE" : "1px solid transparent",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${isOverdue ? "text-[#EF4444]" : "text-[#1A2035]"}`}>{a.title}</div>
                      <div className="text-[10px] text-[#7A869A]">{a.className}{a.section ? `-${a.section}` : ""} · Due {a.duedate ? new Date(a.duedate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}</div>
                    </div>
                    {isActive && <span className="text-[10px] font-bold text-[#8B5CF6] bg-[#EDE9FE] px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                    {a.status === "COMPLETED" && <CheckCircle size={12} className="text-[#10B981] shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My classes */}
        <div className="col-span-2 bg-white rounded-2xl p-5 border border-[#E8EDF5]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#1A2035]">My Classes</div>
            <Link href="/teacher/classes" className="text-xs text-[#8B5CF6] hover:underline">View all →</Link>
          </div>
          {classes.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#7A869A]">No classes assigned yet</div>
          ) : (
            <div className="space-y-3">
              {classes.map(cls => (
                <div key={cls.classId} className="flex items-center gap-4 p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F0F4FA] transition-colors">
                  <div className="w-12 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: cls.color }}>
                    {cls.name.replace(/grade\s*/i, "")}{cls.section ? `-${cls.section}` : ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1A2035]">{cls.name}{cls.section ? ` - ${cls.section}` : ""} · {cls.subjectName}</div>
                    <div className="text-[10px] text-[#7A869A]">{cls.studentCount} students</div>
                  </div>
                  <Link href="/teacher/classes" className="p-1.5 rounded-lg bg-white border border-[#E8EDF5] hover:bg-[#F0F4FA] transition-colors">
                    <Play size={12} className="text-[#8B5CF6]" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Timetable This Week */}
      {user?.teacherId && <MyTimetableSection teacherId={user.id} />}

      {/* Pending doubts */}
      {doubts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5] border-l-4 border-l-[#EF4444]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1A2035]">Pending Doubts</span>
              <span className="w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">{doubts.length}</span>
            </div>
            <Link href="/teacher/doubts" className="text-xs text-[#8B5CF6] hover:underline">Answer all →</Link>
          </div>
          <div className="space-y-3">
            {doubts.map((d, i) => {
              const color = CLASS_COLORS[i % CLASS_COLORS.length];
              return (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#FEF2F2]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
                    {d.studentInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#1A2035]">{d.studentName}</div>
                    <div className="text-[10px] text-[#7A869A]">{d.subjectName}</div>
                    <div className="text-xs text-[#1A2035] mt-1 line-clamp-2">{d.content}</div>
                  </div>
                  <Link href="/teacher/doubts" className="px-3 py-1.5 bg-[#8B5CF6] text-white text-xs font-semibold rounded-lg hover:bg-[#7C3AED] transition-colors shrink-0">
                    Answer
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tutor CTA Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-[#FDE68A]" style={{ background: "linear-gradient(135deg,#FFFBEB 0%,#FFF7ED 100%)" }}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
          <GraduationCap size={96} className="text-[#F59E0B]" />
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-[#1A2035]">Earn extra income — Register as a Tutor</span>
                <span className="text-[10px] font-bold bg-[#F59E0B] text-white px-1.5 py-0.5 rounded-full">PERSONAL</span>
              </div>
              <p className="text-xs text-[#7A869A] max-w-md">Connect directly with students outside school hours. Set your own schedule, subjects &amp; rate. Your tutor profile is completely private from your school admin.</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-[10px] text-[#10B981] font-medium">
                  <Shield size={10} /> Not visible to school admin
                </div>
                <div className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                <div className="text-[10px] text-[#7A869A]">Set up in 2 minutes</div>
              </div>
            </div>
          </div>
          <Link
            href="/teacher/tutor"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shrink-0 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}
          >
            Set up Profile <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* AI usage */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-[#8B5CF6]" />
            <span className="text-sm font-semibold text-[#1A2035]">AI Quizzes This Week</span>
          </div>
          <span className="text-xs text-[#7A869A]">{stats.quizzesThisWeek} created</span>
        </div>
        <div className="h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#8B5CF6] transition-[width] duration-700" style={{ width: `${Math.min((stats.quizzesThisWeek / 10) * 100, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#7A869A]">
            {stats.quizzesThisWeek === 0 ? "No quizzes yet this week" : `${stats.quizzesThisWeek} quiz${stats.quizzesThisWeek > 1 ? "zes" : ""} this week`}
          </span>
          <Link href="/teacher/quizzes" className="text-xs text-[#8B5CF6] font-semibold hover:underline flex items-center gap-1">
            <Star size={10} /> Generate AI Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}

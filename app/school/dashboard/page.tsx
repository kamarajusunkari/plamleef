"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, GraduationCap, Layout, CheckSquare, ClipboardList,
  Star, MessageCircle, TrendingUp,
  Calendar, BarChart2, Trophy, Settings, Bell, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { StatsCard } from "@/components/school/StatsCard";
import { Card } from "@/components/school/Card";
import { DonutChart } from "@/components/school/DonutChart";
import { Avatar } from "@/components/school/Avatar";
import { Button } from "@/components/school/Button";
import { getScoreBadgeClass } from "@/lib/utils";

const QUICK_ACTIONS = [
  { icon: Users, label: "Add Student", href: "/school/students" },
  { icon: GraduationCap, label: "Add Teacher", href: "/school/teachers" },
  { icon: Bell, label: "Announce", href: "/school/announcements" },
  { icon: Calendar, label: "Timetable", href: "/school/timetable" },
  { icon: CheckSquare, label: "Attendance", href: "/school/attendance" },
  { icon: BarChart2, label: "Reports", href: "/school/reports" },
  { icon: Trophy, label: "Leaderboard", href: "/school/leaderboard" },
  { icon: MessageCircle, label: "Doubts", href: "/school/doubts" },
  { icon: Settings, label: "Settings", href: "/school/settings" },
];

interface ClassRow { id: string; name: string; section: string; studentCount: number; }
interface TeacherRow { id: string; name: string; initials: string; }
interface AnnouncementRow { id: string; title: string; content: string; audience: string; created_at: string; }

const CLASS_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#FF6B35", "#06B6D4", "#EC4899"];

function colorForIndex(i: number) { return CLASS_COLORS[i % CLASS_COLORS.length]; }
function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, activeAssignments: 0, presentToday: 0, absentToday: 0, totalAttendanceToday: 0 });
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;
    const supabase = createClient();
    const schoolId = user.schoolId;
    const today = new Date().toISOString().split("T")[0];

    async function fetchAll() {
      setLoading(true);
      try {
        const [
          studRes, teachRes, classRes, classListRes, teachListRes, annRes,
          presentRes, absentRes, totalAttRes,
        ] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("classes").select("id, name, section").eq("school_id", schoolId).limit(10),
          supabase.from("teachers").select("id, users(name)").eq("school_id", schoolId).limit(5),
          supabase.from("announcements").select("id, title, content, audience, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(5),
          supabase.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today).eq("status", "PRESENT"),
          supabase.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today).eq("status", "ABSENT"),
          supabase.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today),
        ]);

        const classIds = classListRes.data?.map((c) => c.id) ?? [];
        let activeAssignments = 0;
        if (classIds.length > 0) {
          const { count } = await supabase.from("assignment").select("id", { count: "exact", head: true }).in("class_id", classIds).eq("status", "ACTIVE");
          activeAssignments = count ?? 0;
        }

        setStats({
          students: studRes.count ?? 0,
          teachers: teachRes.count ?? 0,
          classes: classRes.count ?? 0,
          activeAssignments,
          presentToday: presentRes.count ?? 0,
          absentToday: absentRes.count ?? 0,
          totalAttendanceToday: totalAttRes.count ?? 0,
        });

        // Build classes with student count
        const classRows: ClassRow[] = await Promise.all(
          (classListRes.data ?? []).map(async (cls) => {
            const { count } = await supabase.from("student_records").select("id", { count: "exact", head: true }).eq("class_id", cls.id).eq("is_current", true);
            return { id: cls.id, name: cls.name, section: cls.section, studentCount: count ?? 0 };
          })
        );
        setClasses(classRows);

        const teachRows: TeacherRow[] = (teachListRes.data ?? []).map((t) => {
          const u = Array.isArray(t.users) ? t.users[0] : (t.users as { name?: string } | null);
          const name = u?.name ?? "Teacher";
          return { id: t.id, name, initials: initialsOf(name) };
        });
        setTeachers(teachRows);

        setAnnouncements(annRes.data ?? []);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user?.schoolId]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const attendancePct = stats.totalAttendanceToday > 0
    ? Math.round((stats.presentToday / stats.totalAttendanceToday) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Row 1: Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatsCard
          label="Total Students"
          value={stats.students}
          subtext=""
          icon={<Users size={18} />}
          bgColor="#EFF6FF"
          iconColor="#3B82F6"
          link="/school/students"
        />
        <StatsCard
          label="Total Teachers"
          value={stats.teachers}
          subtext=""
          icon={<GraduationCap size={18} />}
          bgColor="#ECFDF5"
          iconColor="#10B981"
          link="/school/teachers"
        />
        <StatsCard
          label="Total Classes"
          value={stats.classes}
          subtext=""
          icon={<Layout size={18} />}
          bgColor="#F5F3FF"
          iconColor="#8B5CF6"
          link="/school/classes"
        />
        <StatsCard
          label="Today's Attendance"
          value={stats.totalAttendanceToday > 0 ? `${attendancePct}%` : "—"}
          subtext={stats.totalAttendanceToday > 0 ? `${stats.presentToday} present · ${stats.absentToday} absent` : "No data today"}
          icon={<CheckSquare size={18} />}
          bgColor={attendancePct >= 90 ? "#ECFDF5" : "#FFFBEB"}
          iconColor={attendancePct >= 90 ? "#10B981" : "#F59E0B"}
          link="/school/attendance"
        />
        <StatsCard
          label="Active Assignments"
          value={stats.activeAssignments}
          subtext=""
          icon={<ClipboardList size={18} />}
          bgColor="#FFF7F4"
          iconColor="#FF6B35"
          link="/school/assignments"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left col-span-3 */}
        <div className="col-span-3 space-y-4">
          {/* Recent Announcements */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A2035]">Recent Announcements</span>
              </div>
              <Link href="/school/announcements" className="text-xs text-[#FF6B35] hover:underline">View All</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-6">No announcements yet</div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <Link
                    key={ann.id}
                    href="/school/announcements"
                    className="flex items-start gap-3 hover:bg-[#F8FAFC] rounded-xl p-2 -mx-2 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#FF6B35]/10">
                      <Bell size={16} className="text-[#FF6B35]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#1A2035] truncate">{ann.title}</div>
                      <div className="text-[10px] text-[#7A869A] truncate">{ann.content}</div>
                      <div className="text-[10px] text-[#94A3B8]">{new Date(ann.created_at).toLocaleDateString("en-IN")}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6] shrink-0">{ann.audience}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[#F0F4FA]">
              <Link href="/school/announcements?modal=create" className="text-xs text-[#FF6B35] hover:underline">
                + Create Announcement
              </Link>
            </div>
          </Card>

          {/* Classes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#1A2035]">Classes Overview</div>
              </div>
              <Link href="/school/classes" className="text-xs text-[#FF6B35] hover:underline">
                View All Classes
              </Link>
            </div>
            {classes.length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-6">No classes yet</div>
            ) : (
              <div className="space-y-2.5">
                {classes.map((cls, i) => (
                  <Link key={cls.id} href={`/school/classes/${cls.id}`} className="flex items-center gap-3 group hover:bg-[#F8FAFC] rounded-xl p-1.5 -mx-1.5 transition-colors">
                    <div
                      className="w-12 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: colorForIndex(i) }}
                    >
                      {cls.name.replace("Grade ", "")}{cls.section}
                    </div>
                    <div className="flex-1 text-xs text-[#1A2035] font-medium">{cls.name} — {cls.section}</div>
                    <div className="text-[10px] text-[#7A869A]">{cls.studentCount} students</div>
                    <span className="text-[10px] text-[#7A869A] opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right col-span-2 */}
        <div className="col-span-2 space-y-4">
          {/* Attendance Donut */}
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Today&apos;s Attendance</div>
            {stats.totalAttendanceToday === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-8">No attendance data for today</div>
            ) : (
              <div className="flex flex-col items-center">
                <DonutChart
                  segments={[
                    { value: stats.presentToday, color: "#10B981", label: "Present" },
                    { value: stats.absentToday, color: "#EF4444", label: "Absent" },
                    { value: Math.max(0, stats.totalAttendanceToday - stats.presentToday - stats.absentToday), color: "#94A3B8", label: "Other" },
                  ]}
                  total={stats.totalAttendanceToday}
                  centerLabel={String(stats.presentToday)}
                  centerSub={`/${stats.totalAttendanceToday}`}
                  size={130}
                />
                <div className="mt-4 space-y-1.5 w-full">
                  {[
                    { color: "#10B981", label: "Present", count: stats.presentToday },
                    { color: "#EF4444", label: "Absent", count: stats.absentToday },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[#7A869A]">{item.label}</span>
                      </div>
                      <span className="font-medium text-[#1A2035]">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[#F0F4FA]">
              <Link href="/school/attendance" className="text-xs text-[#FF6B35] hover:underline">
                View Full Attendance →
              </Link>
            </div>
          </Card>

          {/* Teachers */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#1A2035]">Teachers</span>
              <Link href="/school/teachers" className="text-xs text-[#FF6B35] hover:underline">View All</Link>
            </div>
            {teachers.length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-4">No teachers yet</div>
            ) : (
              <div className="space-y-2">
                {teachers.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Avatar initials={t.initials} color={colorForIndex(i + 2)} size={32} />
                    <div className="text-xs font-medium text-[#1A2035] truncate">{t.name}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Quick Actions</div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} href={action.href}>
                    <div className="bg-white border border-[#E8EDF5] rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-[#F0F4FA] cursor-pointer transition-colors text-center">
                      <Icon size={18} className="text-[#7A869A]" />
                      <span className="text-[10px] text-[#7A869A] leading-tight">{action.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-[#FF6B35]" />
            <span className="text-sm font-semibold text-[#1A2035]">School Summary</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Total Students", value: stats.students },
              { label: "Total Teachers", value: stats.teachers },
              { label: "Total Classes", value: stats.classes },
              { label: "Active Assignments", value: stats.activeAssignments },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-[#7A869A]">{item.label}</span>
                <span className="font-semibold text-[#1A2035]">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-3">Attendance Today</div>
          {stats.totalAttendanceToday === 0 ? (
            <div className="text-xs text-[#7A869A] py-4 text-center">No attendance marked today</div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-[#1A2035]">{attendancePct}%</div>
              <div className="text-xs text-[#7A869A]">{stats.presentToday} present out of {stats.totalAttendanceToday}</div>
            </div>
          )}
          <Link href="/school/attendance" className="text-xs text-[#FF6B35] hover:underline mt-3 block">View Details →</Link>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-3">Announcements</div>
          {announcements.length === 0 ? (
            <div className="text-xs text-[#7A869A] py-4 text-center">No announcements yet</div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-[#1A2035]">{announcements.length}</div>
              <div className="text-xs text-[#7A869A]">recent announcements</div>
              <div className="text-xs font-medium text-[#1A2035] truncate">{announcements[0]?.title}</div>
            </div>
          )}
          <Link href="/school/announcements" className="text-xs text-[#FF6B35] hover:underline mt-3 block">View All →</Link>
        </Card>
      </div>
    </div>
  );
}

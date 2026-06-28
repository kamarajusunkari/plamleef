"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumb } from "@/components/school/Breadcrumb";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Avatar } from "@/components/school/Avatar";
import { ProgressBar } from "@/components/school/ProgressBar";
import { StatsCard } from "@/components/school/StatsCard";
import { LineChart } from "@/components/school/LineChart";
import { getScoreBadgeClass, getModeBadgeClass } from "@/lib/utils";
import Link from "next/link";

const TABS = ["Overview", "My Classes", "Quizzes", "Performance"];

function nameToColor(name: string): string {
  const colors = ["#FF6B35", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function calcInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface TeacherData {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  quizCount: number;
}

interface ClassRow {
  classId: string;
  name: string;
  section: string;
  subjects: string[];
}

interface AssignmentRow {
  id: string;
  title: string;
  mode: string;
  created_at: string | null;
  quizTitle: string;
}

export default function TeacherDetailPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (!teacherId) return;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Fetch teacher with user info
      const { data: teacherRec } = await supabase
        .from("teachers")
        .select("id, school_id, user_id, users:user_id(name, email)")
        .eq("id", teacherId)
        .single();

      if (!teacherRec) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const u = Array.isArray(teacherRec.users) ? teacherRec.users[0] : (teacherRec.users as any);
      const name: string = u?.name ?? "Unknown";
      const email: string = u?.email ?? "";

      // Fetch quiz count, class_subjects, assignments in parallel
      const [quizRes, classSubjectsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("quiz")
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", teacherId),
        supabase
          .from("class_subjects")
          .select("class_id, subject_id, subjects(name), classes(id, name, section)")
          .eq("teacher_id", teacherId),
        supabase
          .from("assignment")
          .select("id, title, mode, created_at, quiz:quiz_id(title)")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Build unique classes from class_subjects
      const classMap = new Map<string, ClassRow>();
      const subjectSet = new Set<string>();

      if (classSubjectsRes.data) {
        for (const cs of classSubjectsRes.data as any[]) {
          const cls = Array.isArray(cs.classes) ? cs.classes[0] : cs.classes;
          const sub = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects;
          const subName: string = sub?.name ?? "";
          if (subName) subjectSet.add(subName);

          if (cls) {
            const existing = classMap.get(cs.class_id);
            if (existing) {
              if (subName && !existing.subjects.includes(subName)) {
                existing.subjects.push(subName);
              }
            } else {
              classMap.set(cs.class_id, {
                classId: cs.class_id,
                name: cls.name ?? "—",
                section: cls.section ?? "",
                subjects: subName ? [subName] : [],
              });
            }
          }
        }
      }

      // Build assignments list
      const assignmentRows: AssignmentRow[] = (assignmentsRes.data ?? []).map((a: any) => {
        const quiz = Array.isArray(a.quiz) ? a.quiz[0] : a.quiz;
        return {
          id: a.id,
          title: a.title ?? "Untitled",
          mode: a.mode ?? "HOMEWORK",
          created_at: a.created_at,
          quizTitle: quiz?.title ?? "—",
        };
      });

      setTeacher({
        id: teacherRec.id,
        name,
        email,
        initials: calcInitials(name),
        color: nameToColor(name),
        quizCount: quizRes.count ?? 0,
      });
      setClasses(Array.from(classMap.values()));
      setSubjects(Array.from(subjectSet));
      setAssignments(assignmentRows);
      setLoading(false);
    }

    fetchData();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  if (notFound || !teacher) {
    return <div className="p-8 text-center text-[#7A869A]">Teacher not found</div>;
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumb items={[{ label: "Teachers", href: "/school/teachers" }, { label: teacher.name }]} />

      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <Avatar initials={teacher.initials} color={teacher.color} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#1A2035]">{teacher.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">Teacher</span>
            </div>
            <div className="text-sm text-[#7A869A] mb-2">{teacher.email}</div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              {[
                { label: "Quizzes", value: teacher.quizCount },
                { label: "Classes", value: classes.length },
                { label: "Subjects", value: subjects.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#F8FAFC] rounded-xl p-2 text-center">
                  <div className="text-sm font-bold text-[#1A2035]">{stat.value}</div>
                  <div className="text-[10px] text-[#7A869A]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="primary" onClick={() => toast(`Messaging ${teacher.name}`)}>
              Message Teacher
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast("Edit profile modal")}>
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard label="Quizzes Created" value={teacher.quizCount} icon={<span>📋</span>} bgColor="#EFF6FF" iconColor="#3B82F6" />
            <StatsCard label="Classes" value={classes.length} icon={<span>👥</span>} bgColor="#ECFDF5" iconColor="#10B981" />
            <StatsCard label="Assignments" value={assignments.length} icon={<span>🎯</span>} bgColor="#FFF7F4" iconColor="#FF6B35" />
          </div>
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Score Trend (Placeholder)</div>
            <LineChart
              data={[70, 72, 74, 73, 76, 78, 79, 80]}
              labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
            />
          </Card>
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Subjects Taught</div>
            {subjects.length === 0 ? (
              <div className="text-sm text-[#7A869A]">No subjects assigned yet</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-[#FFF7F4] text-[#FF6B35] text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 1 && (
        <div className="grid grid-cols-3 gap-4">
          {classes.length === 0 ? (
            <div className="col-span-3 text-center text-sm text-[#7A869A] py-8">No classes assigned yet</div>
          ) : (
            classes.map((cls) => {
              const clsColor = nameToColor(cls.name + cls.section);
              const label = cls.name.replace("Grade ", "") + cls.section;
              return (
                <Card key={cls.classId} hover onClick={() => router.push(`/school/classes/${cls.classId}`)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: clsColor }}
                    >
                      {label}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1A2035]">
                        {cls.name} — {cls.section}
                      </div>
                      {cls.subjects.length > 0 && (
                        <div className="text-xs text-[#7A869A]">{cls.subjects.join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={0} height={6} showLabel />
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 2 && (
        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-4">Assignments by {teacher.name}</div>
          {assignments.length === 0 ? (
            <div className="text-center text-sm text-[#7A869A] py-8">No assignments found</div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EDF5]">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getModeBadgeClass(a.mode)}`}>
                    {a.mode}
                  </span>
                  <span className="text-xs font-medium text-[#1A2035] flex-1">{a.title}</span>
                  <span className="text-xs text-[#7A869A]">{a.quizTitle}</span>
                  <span className="text-xs text-[#7A869A]">{formatDate(a.created_at)}</span>
                  <Link href={`/school/assignments/${a.id}`}>
                    <Button size="sm" variant="ghost">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 3 && (
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Performance by Class</div>
            {classes.length === 0 ? (
              <div className="text-sm text-[#7A869A] text-center py-8">No classes to display</div>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div key={cls.classId} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-[#7A869A]">
                      {cls.name}-{cls.section}
                    </div>
                    <ProgressBar value={0} height={8} className="flex-1" />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(0)}`}>
                      —
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">8-Week Improvement (Placeholder)</div>
            <LineChart
              data={[70, 72, 74, 73, 76, 78, 79, 80]}
              labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

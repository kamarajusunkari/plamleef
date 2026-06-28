"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Users, ClipboardList, Play, BarChart2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const CLASS_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#FF6B35", "#F59E0B", "#EF4444"];

type ClassCard = {
  classId: string;
  name: string;
  section: string;
  subjectName: string;
  subjectId: string;
  studentCount: number;
  openDoubts: number;
  color: string;
};

type StudentRow = {
  id: string;
  name: string;
  initials: string;
  totalXp: number;
};

export default function TeacherClassesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassCard | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    const teacherId = user.teacherId;

    async function fetchClasses() {
      setLoadingClasses(true);
      const { data: classSubjects } = await supabase
        .from("class_subjects")
        .select("class_id, subject_id, subjects(name), classes(id, name, section)")
        .eq("teacher_id", teacherId);

      if (!classSubjects) { setLoadingClasses(false); return; }

      const rows: ClassCard[] = [];
      let colorIdx = 0;
      for (const cs of classSubjects) {
        const cls = Array.isArray(cs.classes) ? cs.classes[0] : cs.classes as { id?: string; name?: string; section?: string } | null;
        const sub = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects as { name?: string } | null;
        if (!cls?.id) continue;

        const [{ count: studentCount }, { count: doubtCount }] = await Promise.all([
          supabase.from("student_records").select("id", { count: "exact", head: true }).eq("class_id", cs.class_id).eq("is_current", true),
          supabase.from("doubts").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "OPEN"),
        ]);

        rows.push({
          classId: cls.id,
          name: cls.name ?? "",
          section: cls.section ?? "",
          subjectName: sub?.name ?? "",
          subjectId: cs.subject_id,
          studentCount: studentCount ?? 0,
          openDoubts: doubtCount ?? 0,
          color: CLASS_COLORS[colorIdx++ % CLASS_COLORS.length],
        });
      }
      setClasses(rows);
      if (rows.length > 0) setSelectedClass(rows[0]);
      setLoadingClasses(false);
    }

    fetchClasses();
  }, [user?.teacherId]);

  useEffect(() => {
    if (!selectedClass) return;
    const supabase = createClient();

    async function fetchStudents() {
      setLoadingStudents(true);
      const { data: records } = await supabase
        .from("student_records")
        .select("id, students(users(name)), student_xp(total_xp)")
        .eq("class_id", selectedClass!.classId)
        .eq("is_current", true);

      if (!records) { setLoadingStudents(false); return; }

      const rows: StudentRow[] = records.map(r => {
        const stu = Array.isArray(r.students) ? r.students[0] : r.students as Record<string, unknown> | null;
        const usr = stu ? (Array.isArray((stu as { users?: unknown }).users) ? ((stu as { users?: unknown[] }).users as Record<string, unknown>[])?.[0] : (stu as { users?: Record<string, unknown> }).users) : null;
        const name = (usr as { name?: string } | null)?.name ?? "Student";
        const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        const xpRow = Array.isArray(r.student_xp) ? r.student_xp[0] : r.student_xp as { total_xp?: number } | null;
        return {
          id: r.id,
          name,
          initials,
          totalXp: xpRow?.total_xp ?? 0,
        };
      });
      setStudents(rows);
      setLoadingStudents(false);
    }

    fetchStudents();
  }, [selectedClass]);

  if (userLoading || loadingClasses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Classes</h1>
          <p className="text-sm text-[#7A869A]">No classes assigned yet</p>
        </div>
        <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
          <Users size={40} className="text-[#E8EDF5] mx-auto mb-3" />
          <p className="text-sm text-[#7A869A]">You have no classes assigned. Contact the school admin.</p>
        </div>
      </div>
    );
  }

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Classes</h1>
          <p className="text-sm text-[#7A869A]">Managing {classes.length} classes · {totalStudents} students</p>
        </div>
        <Link href="/teacher/assignments/new" className="flex items-center gap-2 bg-[#8B5CF6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
          <ClipboardList size={16} /> New Assignment
        </Link>
      </div>

      {/* Class cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div
            key={cls.classId}
            onClick={() => setSelectedClass(cls)}
            className="bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-card"
            style={{ borderColor: selectedClass?.classId === cls.classId ? cls.color : "#E8EDF5" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: cls.color }}>
                {cls.name.replace(/grade\s*/i, "")}{cls.section ? `-${cls.section}` : ""}
              </div>
              <div>
                <div className="text-sm font-bold text-[#1A2035]">{cls.name}{cls.section ? ` - ${cls.section}` : ""}</div>
                <div className="text-xs text-[#7A869A]">{cls.subjectName}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-[#1A2035]">{cls.studentCount}</div>
                <div className="text-[9px] text-[#7A869A]">Students</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#EF4444]">{cls.openDoubts}</div>
                <div className="text-[9px] text-[#7A869A]">Open Doubts</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected class detail */}
      {selectedClass && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#E8EDF5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: selectedClass.color }}>
                {selectedClass.name.replace(/grade\s*/i, "")}{selectedClass.section ? `-${selectedClass.section}` : ""}
              </div>
              <div>
                <div className="text-sm font-bold text-[#1A2035]">{selectedClass.name}{selectedClass.section ? ` - ${selectedClass.section}` : ""} · {selectedClass.subjectName}</div>
                <div className="text-xs text-[#7A869A]">{selectedClass.studentCount} students</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/teacher/assignments/new" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] text-white rounded-xl text-xs font-semibold">
                <Play size={12} /> Assign Quiz
              </Link>
              <Link href="/teacher/reports" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F4FA] text-[#7A869A] rounded-xl text-xs font-semibold">
                <BarChart2 size={12} /> Report
              </Link>
            </div>
          </div>

          {/* Student list */}
          <div className="divide-y divide-[#F0F4FA]">
            <div className="grid grid-cols-12 px-5 py-2.5 bg-[#F8FAFC] text-[10px] font-semibold text-[#7A869A] uppercase tracking-wider">
              <div className="col-span-6">Student</div>
              <div className="col-span-3 text-center">XP</div>
              <div className="col-span-3 text-center">Status</div>
            </div>
            {loadingStudents ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 rounded-full border-4 border-[#8B5CF6] border-t-transparent animate-spin" />
              </div>
            ) : students.length > 0 ? students.map((student, i) => (
              <div key={student.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-[#F8FAFC] transition-colors">
                <div className="col-span-6 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: CLASS_COLORS[i % CLASS_COLORS.length] }}>
                    {student.initials}
                  </div>
                  <div className="text-xs font-medium text-[#1A2035]">{student.name}</div>
                </div>
                <div className="col-span-3 text-center text-xs font-semibold text-[#8B5CF6]">{student.totalXp.toLocaleString()}</div>
                <div className="col-span-3 text-center">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">Active</span>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-sm text-[#7A869A]">No students found for this class.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

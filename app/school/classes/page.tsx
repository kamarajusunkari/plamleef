"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, CheckSquare, BookOpen, UserCheck, Eye, Loader2,
  ChevronRight, X, Plus, BookMarked, Edit2, Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PageHeader } from "@/components/school/PageHeader";
import { StatsCard } from "@/components/school/StatsCard";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Modal } from "@/components/school/Modal";
import { FilterPills } from "@/components/school/FilterPills";
import { SearchInput } from "@/components/school/SearchInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Grade 6", value: "6" },
  { label: "Grade 7", value: "7" },
  { label: "Grade 8", value: "8" },
  { label: "Grade 9", value: "9" },
  { label: "Grade 10", value: "10" },
  { label: "Grade 11", value: "11" },
  { label: "Grade 12", value: "12" },
];

const CLASS_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EF4444", "#FF6B35", "#06B6D4", "#EC4899",
];
function colorForIndex(i: number) { return CLASS_COLORS[i % CLASS_COLORS.length]; }

function gradeFromName(name: string): number {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeacherOption {
  id: string;        // teachers.id
  userId: string;    // users.id
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassSubjectRow {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;   // teachers.id
  teacherName: string;
}

interface ClassDetail {
  id: string;
  name: string;
  section: string;
  grade: number;
  classTeacherId: string | null;   // teachers.id
  classTeacherUserId: string | null;
  classTeacherName: string;
  studentCount: number;
  subjects: ClassSubjectRow[];
  color: string;
}

// ─── AddClassModal (MODULE-LEVEL) ─────────────────────────────────────────────

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  teachers: TeacherOption[];
  onCreated: (cls: ClassDetail) => void;
}

function AddClassModal({ isOpen, onClose, schoolId, teachers, onCreated }: AddClassModalProps) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setName(""); setSection(""); setTeacherId(""); setErrors({});
    onClose();
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Grade name is required";
    if (!section.trim()) errs.section = "Section is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        name: name.trim(),
        section: section.trim().toUpperCase(),
      };
      if (teacherId) {
        // find userId for the chosen teacher
        const chosen = teachers.find((t) => t.id === teacherId);
        if (chosen) payload.class_teacher_id = chosen.userId;
      }

      const { data, error } = await supabase
        .from("classes")
        .insert(payload)
        .select("id, name, section, class_teacher_id")
        .single();

      if (error) throw error;

      // If teacher assigned, upsert teachers.class_id or just keep reference
      const chosenTeacher = teachers.find((t) => t.id === teacherId);
      const newClass: ClassDetail = {
        id: data.id,
        name: data.name,
        section: data.section,
        grade: gradeFromName(data.name),
        classTeacherId: teacherId || null,
        classTeacherUserId: chosenTeacher?.userId ?? null,
        classTeacherName: chosenTeacher?.name ?? "—",
        studentCount: 0,
        subjects: [],
        color: CLASS_COLORS[0],
      };
      toast.success(`${data.name}-${data.section} created!`);
      onCreated(newClass);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create class";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Class">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Grade Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grade 8"
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.name ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
          />
          {errors.name && <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Section *</label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
            maxLength={3}
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.section ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
          />
          {errors.section && <p className="text-xs text-[#EF4444] mt-1">{errors.section}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Class Teacher (optional)</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
          >
            <option value="">— No teacher assigned —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {saving ? "Creating…" : "Create Class"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── AssignTeacherModal (MODULE-LEVEL) ────────────────────────────────────────

interface AssignTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ClassDetail;
  teachers: TeacherOption[];
  onAssigned: (classId: string, teacher: TeacherOption | null) => void;
}

function AssignTeacherModal({ isOpen, onClose, cls, teachers, onAssigned }: AssignTeacherModalProps) {
  const [teacherId, setTeacherId] = useState(cls.classTeacherId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTeacherId(cls.classTeacherId ?? "");
  }, [cls.classTeacherId, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const chosen = teachers.find((t) => t.id === teacherId);
      const { error } = await supabase
        .from("classes")
        .update({ class_teacher_id: chosen?.id ?? null })
        .eq("id", cls.id);

      if (error) throw error;
      toast.success("Class teacher updated");
      onAssigned(cls.id, chosen ?? null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Class Teacher — ${cls.name}-${cls.section}`}>
      <div className="space-y-4">
        <p className="text-xs text-[#7A869A]">Select the teacher responsible for this class.</p>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
        >
          <option value="">— Remove class teacher —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── AssignSubjectModal (MODULE-LEVEL) ────────────────────────────────────────

interface AssignSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ClassDetail;
  schoolId: string;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  onAssigned: (classId: string, row: ClassSubjectRow) => void;
}

function AssignSubjectModal({ isOpen, onClose, cls, schoolId, subjects, teachers, onAssigned }: AssignSubjectModalProps) {
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = () => { setSubjectId(""); setTeacherId(""); onClose(); };

  const handleSave = async () => {
    if (!subjectId) { toast.error("Pick a subject"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const chosenTeacher = teachers.find((t) => t.id === teacherId);
      const { data: existing } = await supabase
        .from("class_subjects")
        .select("id")
        .eq("class_id", cls.id)
        .eq("subject_id", subjectId)
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from("class_subjects")
          .update({ teacher_id: chosenTeacher?.id ?? null })
          .eq("id", existing.id)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("class_subjects")
          .insert({
            class_id: cls.id,
            subject_id: subjectId,
            school_id: schoolId,
            teacher_id: chosenTeacher?.id ?? null,
          })
          .select("id")
          .single();
      }
      const { data, error } = result;

      if (error) throw error;

      const sub = subjects.find((s) => s.id === subjectId);
      const newRow: ClassSubjectRow = {
        id: data.id,
        subjectId,
        subjectName: sub?.name ?? subjectId,
        teacherId: chosenTeacher?.id ?? null,
        teacherName: chosenTeacher?.name ?? "—",
      };
      toast.success(`${sub?.name ?? "Subject"} assigned`);
      onAssigned(cls.id, newRow);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const unassigned = subjects.filter(
    (s) => !cls.subjects.some((cs) => cs.subjectId === s.id)
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Assign Subject — ${cls.name}-${cls.section}`}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Subject *</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
          >
            <option value="">— Select subject —</option>
            {unassigned.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {unassigned.length === 0 && (
              <option disabled>All subjects assigned</option>
            )}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Teacher (optional)</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
          >
            <option value="">— No teacher assigned —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || unassigned.length === 0}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Assign
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── ClassDetailPanel (MODULE-LEVEL) ─────────────────────────────────────────

interface ClassDetailPanelProps {
  cls: ClassDetail;
  teachers: TeacherOption[];
  subjects: SubjectOption[];
  schoolId: string;
  onClose: () => void;
  onTeacherAssigned: (classId: string, teacher: TeacherOption | null) => void;
  onSubjectAssigned: (classId: string, row: ClassSubjectRow) => void;
  onSubjectRemoved: (classId: string, subjectId: string) => void;
}

function ClassDetailPanel({
  cls, teachers, subjects, schoolId,
  onClose, onTeacherAssigned, onSubjectAssigned, onSubjectRemoved,
}: ClassDetailPanelProps) {
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string; email: string; xp: number }[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    setStudentsLoading(true);
    setStudents([]);

    supabase
      .from("student_records")
      .select("id, student_id, students(user_id, users!students_user_id_fkey(name, email)), student_xp(total_xp)")
      .eq("class_id", cls.id)
      .eq("is_current", true)
      .then(({ data }) => {
        if (!data) { setStudentsLoading(false); return; }
        const rows = data.map((r: Record<string, unknown>) => {
          const stu = r.students as Record<string, unknown> | null;
          const usr = stu?.users as Record<string, unknown> | null;
          const xpArr = r.student_xp as Array<{ total_xp: number }> | null;
          return {
            id: r.id as string,
            name: (usr?.name as string) ?? "—",
            email: (usr?.email as string) ?? "—",
            xp: xpArr?.[0]?.total_xp ?? 0,
          };
        });
        setStudents(rows);
        setStudentsLoading(false);
      });
  }, [cls.id]);

  const handleRemoveSubject = async (cs: ClassSubjectRow) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("class_subjects")
      .delete()
      .eq("id", cs.id);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success(`${cs.subjectName} removed`);
    onSubjectRemoved(cls.id, cs.subjectId);
  };

  const filteredStudents = students.filter((s) =>
    !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[520px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F0F4FA] flex items-start justify-between" style={{ borderTopColor: cls.color, borderTopWidth: 4 }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0" style={{ backgroundColor: cls.color }}>
              {cls.name.replace("Grade ", "")}{cls.section}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2035]">{cls.name} — Section {cls.section}</h2>
              <p className="text-xs text-[#7A869A]">{cls.studentCount} students · {cls.subjects.length} subjects</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F0F4FA] text-[#7A869A]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Class Teacher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">Class Teacher</h3>
              <button
                onClick={() => setShowTeacherModal(true)}
                className="text-xs text-[#FF6B35] hover:underline flex items-center gap-1"
              >
                <Edit2 size={11} /> {cls.classTeacherId ? "Change" : "Assign"}
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
              <div className="w-9 h-9 rounded-full bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] font-bold text-sm">
                {cls.classTeacherName !== "—" ? cls.classTeacherName[0].toUpperCase() : "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A2035]">{cls.classTeacherName}</p>
                <p className="text-[11px] text-[#7A869A]">{cls.classTeacherId ? "Class Teacher" : "No teacher assigned"}</p>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">
                Subjects ({cls.subjects.length})
              </h3>
              <button
                onClick={() => setShowSubjectModal(true)}
                className="text-xs text-[#FF6B35] hover:underline flex items-center gap-1"
              >
                <Plus size={11} /> Assign Subject
              </button>
            </div>

            {cls.subjects.length === 0 ? (
              <div className="text-center py-6 bg-[#F8FAFC] rounded-xl">
                <BookOpen size={24} className="mx-auto text-[#C5D0E0] mb-2" />
                <p className="text-xs text-[#7A869A]">No subjects assigned yet</p>
                <button onClick={() => setShowSubjectModal(true)} className="text-xs text-[#FF6B35] mt-1 hover:underline">Assign first subject</button>
              </div>
            ) : (
              <div className="space-y-2">
                {cls.subjects.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl group">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                        <BookMarked size={13} className="text-[#8B5CF6]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A2035]">{cs.subjectName}</p>
                        <p className="text-[11px] text-[#7A869A]">{cs.teacherName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(cs)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#FEF2F2] text-[#EF4444] transition-opacity"
                      title="Remove subject"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Students */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">
                Students ({students.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="text-xs text-[#FF6B35] hover:underline flex items-center gap-1"
                >
                  <Plus size={11} /> Add
                </button>
                <Link href="/school/students" className="text-xs text-[#7A869A] hover:underline">Manage →</Link>
              </div>
            </div>

            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5D0E0]" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
              />
            </div>

            {studentsLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#FF6B35]" /></div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-6 bg-[#F8FAFC] rounded-xl">
                <Users size={24} className="mx-auto text-[#C5D0E0] mb-2" />
                <p className="text-xs text-[#7A869A]">{studentSearch ? "No match" : "No students enrolled"}</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 hover:bg-[#F8FAFC] rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] text-[11px] font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1A2035] truncate">{s.name}</p>
                      <p className="text-[10px] text-[#7A869A] truncate">{s.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-[#FF6B35] shrink-0">{s.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F4FA]">
          <Link href={`/school/students?classId=${cls.id}`}>
            <Button variant="primary" className="w-full justify-center">
              <Users size={14} className="mr-1.5" /> View Full Student List
            </Button>
          </Link>
        </div>
      </div>

      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddStudentModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <AddStudentToClassForm
              cls={cls}
              schoolId={schoolId}
              onClose={() => setShowAddStudentModal(false)}
              onCreated={(s) => {
                setStudents(prev => [...prev, s]);
                setShowAddStudentModal(false);
              }}
            />
          </div>
        </div>
      )}

      <AssignTeacherModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        cls={cls}
        teachers={teachers}
        onAssigned={onTeacherAssigned}
      />

      <AssignSubjectModal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        cls={cls}
        schoolId={schoolId}
        subjects={subjects}
        teachers={teachers}
        onAssigned={onSubjectAssigned}
      />
    </>
  );
}

// ─── AddStudentToClassForm — inline form inside modal ────────────────────────

interface AddStudentToClassFormProps {
  cls: ClassDetail;
  schoolId: string;
  onClose: () => void;
  onCreated: (s: { id: string; name: string; email: string; xp: number }) => void;
}

function AddStudentToClassForm({ cls, schoolId, onClose, onCreated }: AddStudentToClassFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Student@2025");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password.trim()) e.password = "Password is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), name: name.trim(), role: "STUDENT", schoolId, classId: cls.id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create student");

      toast.success(`✓ ${name.trim()} added — password: ${password}`);
      onCreated({
        id: data.studentRecordId ?? data.studentId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        xp: 0,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-[#1A2035]">Add Student to {cls.name}-{cls.section}</h2>
        <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[#7A869A] block mb-1">Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aarav Sharma"
            className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-[#7A869A] block mb-1">Email *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="student@school.com" type="email"
            className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div className="p-3 bg-[#FFF7ED] rounded-xl">
          <p className="text-xs text-[#FF6B35] font-medium">Class: {cls.name} — Section {cls.section}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#7A869A] block mb-1">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Student@2025"
            className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]" />
          <p className="text-[10px] text-[#7A869A] mt-1">Student logs in with this email + password</p>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? "Creating…" : "Add Student"}
        </button>
      </div>
    </>
  );
}

// ─── ClassCard (MODULE-LEVEL) ─────────────────────────────────────────────────

interface ClassCardProps {
  cls: ClassDetail;
  index: number;
  onSelect: (cls: ClassDetail) => void;
}

function ClassCard({ cls, onSelect }: ClassCardProps) {
  return (
    <Card hover className="p-0 overflow-hidden cursor-pointer" onClick={() => onSelect(cls)}>
      <div className="h-1.5 w-full" style={{ backgroundColor: cls.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: cls.color }}
            >
              {cls.name.replace("Grade ", "")}{cls.section}
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A2035]">{cls.name} — Section {cls.section}</div>
              <div className="text-[11px] text-[#7A869A] flex items-center gap-1">
                <UserCheck size={10} />
                {cls.classTeacherName}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-[#C5D0E0] mt-1" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
            <p className="text-base font-bold text-[#1A2035]">{cls.studentCount}</p>
            <p className="text-[10px] text-[#7A869A]">Students</p>
          </div>
          <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
            <p className="text-base font-bold text-[#1A2035]">{cls.subjects.length}</p>
            <p className="text-[10px] text-[#7A869A]">Subjects</p>
          </div>
          <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
            <p className="text-base font-bold text-[#1A2035]">{cls.grade}</p>
            <p className="text-[10px] text-[#7A869A]">Grade</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
          {cls.subjects.slice(0, 4).map((s) => (
            <span key={s.id} className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-full font-medium">
              {s.subjectName}
            </span>
          ))}
          {cls.subjects.length > 4 && (
            <span className="text-[10px] bg-[#F0F4FA] text-[#7A869A] px-2 py-0.5 rounded-full">+{cls.subjects.length - 4}</span>
          )}
        </div>

        <Button variant="primary" size="sm" className="w-full justify-center" onClick={(e) => { e.stopPropagation(); onSelect(cls); }}>
          <Eye size={12} className="mr-1" /> View Details
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("grade");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);

  const schoolId = user?.schoolId ?? "";

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const supabase = createClient();

    // Fetch teachers
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("id, user_id, users(name)")
      .eq("school_id", schoolId);

    const teacherList: TeacherOption[] = (teacherData ?? []).map((t: Record<string, unknown>) => {
      const usr = t.users as { name?: string } | null;
      return { id: t.id as string, userId: t.user_id as string, name: usr?.name ?? "Unknown" };
    });
    setTeachers(teacherList);

    // Fetch subjects
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId);
    setSubjects((subjectData ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));

    // Fetch classes with class_subjects
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, section, class_teacher_id, class_subjects(id, subject_id, teacher_id, subjects(name))")
      .eq("school_id", schoolId)
      .order("name");

    if (!classData) { setLoading(false); return; }

    const rows: ClassDetail[] = await Promise.all(
      classData.map(async (cls: Record<string, unknown>, i: number) => {
        const { count } = await supabase
          .from("student_records")
          .select("id", { count: "exact", head: true })
          .eq("class_id", cls.id as string)
          .eq("is_current", true);

        // Resolve class teacher
        const ctUserId = cls.class_teacher_id as string | null;
        const matchedTeacher = teacherList.find((t) => t.userId === ctUserId);

        // Build subjects list
        const csArr = (cls.class_subjects as Array<Record<string, unknown>>) ?? [];
        const classSubs: ClassSubjectRow[] = csArr.map((cs) => {
          const sub = cs.subjects as { name?: string } | null;
          const csTeacherId = cs.teacher_id as string | null;
          const csTeacher = teacherList.find((t) => t.userId === csTeacherId);
          return {
            id: cs.id as string,
            subjectId: cs.subject_id as string,
            subjectName: sub?.name ?? "Unknown",
            teacherId: csTeacher?.id ?? null,
            teacherName: csTeacher?.name ?? "—",
          };
        });

        return {
          id: cls.id as string,
          name: cls.name as string,
          section: cls.section as string,
          grade: gradeFromName(cls.name as string),
          classTeacherId: matchedTeacher?.id ?? null,
          classTeacherUserId: ctUserId,
          classTeacherName: matchedTeacher?.name ?? "—",
          studentCount: count ?? 0,
          subjects: classSubs,
          color: colorForIndex(i),
        };
      })
    );

    setClasses(rows);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreated = (cls: ClassDetail) => {
    setClasses((prev) => [...prev, { ...cls, color: colorForIndex(prev.length) }]);
  };

  const handleTeacherAssigned = (classId: string, teacher: TeacherOption | null) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? { ...c, classTeacherId: teacher?.id ?? null, classTeacherUserId: teacher?.userId ?? null, classTeacherName: teacher?.name ?? "—" }
          : c
      )
    );
    setSelectedClass((prev) =>
      prev?.id === classId && teacher !== undefined
        ? { ...prev, classTeacherId: teacher?.id ?? null, classTeacherUserId: teacher?.userId ?? null, classTeacherName: teacher?.name ?? "—" }
        : prev
    );
  };

  const handleSubjectAssigned = (classId: string, row: ClassSubjectRow) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== classId) return c;
        const existing = c.subjects.findIndex((s) => s.subjectId === row.subjectId);
        const newSubs = existing >= 0
          ? c.subjects.map((s, i) => (i === existing ? row : s))
          : [...c.subjects, row];
        return { ...c, subjects: newSubs };
      })
    );
    setSelectedClass((prev) => {
      if (!prev || prev.id !== classId) return prev;
      const existing = prev.subjects.findIndex((s) => s.subjectId === row.subjectId);
      const newSubs = existing >= 0
        ? prev.subjects.map((s, i) => (i === existing ? row : s))
        : [...prev.subjects, row];
      return { ...prev, subjects: newSubs };
    });
  };

  const handleSubjectRemoved = (classId: string, subjectId: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, subjects: c.subjects.filter((s) => s.subjectId !== subjectId) } : c
      )
    );
    setSelectedClass((prev) =>
      prev?.id === classId ? { ...prev, subjects: prev.subjects.filter((s) => s.subjectId !== subjectId) } : prev
    );
  };

  // ── Filter & sort ──────────────────────────────────────────────────────────

  const filtered = classes
    .filter((c) => {
      if (gradeFilter !== "all" && String(c.grade) !== gradeFilter) return false;
      if (search && !`${c.name} ${c.section}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "grade") return a.grade - b.grade || a.section.localeCompare(b.section);
      if (sortBy === "students") return b.studentCount - a.studentCount;
      if (sortBy === "subjects") return b.subjects.length - a.subjects.length;
      return 0;
    });

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);
  const totalSubjectAssignments = classes.reduce((s, c) => s + c.subjects.length, 0);
  const classesWithTeacher = classes.filter((c) => c.classTeacherId).length;

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} classes · ${totalStudents} students`}
        actions={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} className="mr-1" /> Add Class
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Classes" value={classes.length} icon={<CheckSquare size={18} />} bgColor="#EFF6FF" iconColor="#3B82F6" />
        <StatsCard label="Total Students" value={totalStudents} icon={<Users size={18} />} bgColor="#ECFDF5" iconColor="#10B981" />
        <StatsCard label="Subject Assignments" value={totalSubjectAssignments} icon={<BookOpen size={18} />} bgColor="#EDE9FE" iconColor="#8B5CF6" />
        <StatsCard label="Classes with Teacher" value={classesWithTeacher} icon={<UserCheck size={18} />} bgColor="#FFF7F4" iconColor="#FF6B35" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <FilterPills options={GRADE_OPTIONS} value={gradeFilter} onChange={setGradeFilter} />
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-[#E8EDF5] rounded-xl px-3 py-2 bg-white text-[#1A2035] focus:outline-none focus:border-[#FF6B35]"
          >
            <option value="grade">Sort: Grade</option>
            <option value="students">Sort: Students</option>
            <option value="subjects">Sort: Subjects</option>
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search classes…" className="w-48" />
          <div className="flex border border-[#E8EDF5] rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-xs ${viewMode === "grid" ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"}`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-xs ${viewMode === "list" ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"}`}
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12 mb-6">
          <CheckSquare size={32} className="mx-auto text-[#C5D0E0] mb-3" />
          <p className="text-sm font-medium text-[#1A2035] mb-1">No classes found</p>
          <p className="text-xs text-[#7A869A] mb-4">
            {search || gradeFilter !== "all" ? "Try adjusting filters" : "Add your first class to get started"}
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={13} className="mr-1" /> Add First Class
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {filtered.map((cls, i) => (
            <ClassCard key={cls.id} cls={cls} index={i} onSelect={setSelectedClass} />
          ))}
        </div>
      ) : (
        <Card className="mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F4FA]">
                {["Class", "Class Teacher", "Students", "Subjects", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls) => (
                <tr key={cls.id} className="border-b border-[#F0F4FA] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: cls.color }}>
                        {cls.name.replace("Grade ", "")}{cls.section}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A2035]">{cls.name} — {cls.section}</p>
                        <p className="text-[11px] text-[#7A869A]">Grade {cls.grade}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs ${cls.classTeacherId ? "text-[#1A2035]" : "text-[#C5D0E0] italic"}`}>
                      {cls.classTeacherName}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm font-semibold text-[#1A2035]">{cls.studentCount}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {cls.subjects.slice(0, 3).map((s) => (
                        <span key={s.id} className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] px-1.5 py-0.5 rounded-full">{s.subjectName}</span>
                      ))}
                      {cls.subjects.length > 3 && (
                        <span className="text-[10px] text-[#7A869A]">+{cls.subjects.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedClass(cls)}>
                      <Eye size={12} className="mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Bar chart */}
      {filtered.length > 0 && (
        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-4">Student Distribution by Class</div>
          <div className="space-y-2">
            {[...filtered].sort((a, b) => b.studentCount - a.studentCount).map((cls) => {
              const max = Math.max(...filtered.map((c) => c.studentCount), 1);
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className="w-full flex items-center gap-3 hover:bg-[#F8FAFC] rounded-xl p-1.5 -mx-1.5 transition-colors text-left"
                >
                  <div className="w-20 text-[10px] font-medium text-[#7A869A] shrink-0">
                    {cls.name.replace("Grade ", "Gr.")}-{cls.section}
                  </div>
                  <div className="flex-1 h-5 bg-[#F0F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 transition-all duration-700"
                      style={{
                        width: `${(cls.studentCount / max) * 100}%`,
                        backgroundColor: cls.color,
                        minWidth: cls.studentCount > 0 ? "2rem" : 0,
                      }}
                    >
                      <span className="text-white text-[9px] font-bold">{cls.studentCount}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddClassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        schoolId={schoolId}
        teachers={teachers}
        onCreated={handleCreated}
      />

      {/* Detail panel */}
      {selectedClass && (
        <ClassDetailPanel
          cls={selectedClass}
          teachers={teachers}
          subjects={subjects}
          schoolId={schoolId}
          onClose={() => setSelectedClass(null)}
          onTeacherAssigned={handleTeacherAssigned}
          onSubjectAssigned={handleSubjectAssigned}
          onSubjectRemoved={handleSubjectRemoved}
        />
      )}
    </div>
  );
}

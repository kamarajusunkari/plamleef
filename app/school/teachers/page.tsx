"use client";
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users, ChevronDown, ChevronUp, Plus, X,
  Loader2, BookOpen, GraduationCap, MessageCircle, SortAsc, SortDesc,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PageHeader } from "@/components/school/PageHeader";
import { StatsCard } from "@/components/school/StatsCard";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Modal } from "@/components/school/Modal";
import { SearchInput } from "@/components/school/SearchInput";
import { Avatar } from "@/components/school/Avatar";

// ─── helpers ────────────────────────────────────────────────────────────────
const TEACHER_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EF4444", "#FF6B35", "#06B6D4", "#EC4899",
];
function colorFor(i: number) { return TEACHER_COLORS[i % TEACHER_COLORS.length]; }
function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── types ───────────────────────────────────────────────────────────────────
interface SubjectOption {
  id: string;
  name: string;
}
interface ClassOption {
  id: string;
  name: string;
  section: string;
}
interface TeacherSubject {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  classSection: string;
}
interface TeacherRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  classCount: number;
  subjects: TeacherSubject[];
}

// ─── AddTeacherModal (defined OUTSIDE default export) ────────────────────────
interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  subjects: SubjectOption[];
  classes: ClassOption[];
  onCreated: () => void;
}

function AddTeacherModal({ isOpen, onClose, schoolId, subjects, classes, onCreated }: AddTeacherModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Teacher@2025");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setName(""); setEmail(""); setPassword("Teacher@2025");
      setSelectedSubjectIds([]); setSelectedClassIds([]);
      setErrors({});
    }
  }, [isOpen]);

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email";
    if (!password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      // 1. Create user via API
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), role: "TEACHER", schoolId, password }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "Failed to create teacher");
        setSaving(false);
        return;
      }
      const teacherId: string = json.teacherId;

      // 2. Insert class_subjects for each selected class × subject combination
      if (selectedClassIds.length > 0 && selectedSubjectIds.length > 0) {
        const supabase = createClient();
        const rows = selectedClassIds.flatMap((classId) =>
          selectedSubjectIds.map((subjectId) => ({
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherId,
            school_id: schoolId,
          }))
        );
        const { error: csErr } = await supabase.from("class_subjects").upsert(rows, {
          onConflict: "class_id,subject_id",
          ignoreDuplicates: false,
        });
        if (csErr) {
          toast.error("Teacher created but failed to assign subjects: " + csErr.message);
        }
      }

      toast.success(`Teacher ${name.trim()} added successfully`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error("Unexpected error: " + String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Teacher" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Full Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mrs. Priya Sharma"
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] transition-colors ${errors.name ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
          />
          {errors.name && <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Email *</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu"
            type="email"
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] transition-colors ${errors.email ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
          />
          {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-1 block">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Teacher@2025"
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] transition-colors ${errors.password ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
          />
          {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password}</p>}
          <p className="text-[10px] text-[#7A869A] mt-1">Default: Teacher@2025 — teacher should change on first login</p>
        </div>

        {/* Subjects */}
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-2 block">
            Subjects <span className="text-[#7A869A] font-normal">(optional)</span>
          </label>
          {subjects.length === 0 ? (
            <p className="text-xs text-[#7A869A]">No subjects found for this school.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => {
                const checked = selectedSubjectIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs ${
                      checked
                        ? "border-[#FF6B35] bg-[#FFF7F4] text-[#FF6B35] font-medium"
                        : "border-[#E8EDF5] text-[#7A869A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubject(s.id)}
                      className="hidden"
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#FF6B35] border-[#FF6B35]" : "border-[#CBD5E1]"}`}>
                      {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                    </span>
                    {s.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Classes */}
        <div>
          <label className="text-xs font-medium text-[#1A2035] mb-2 block">
            Assign Classes <span className="text-[#7A869A] font-normal">(optional)</span>
          </label>
          {classes.length === 0 ? (
            <p className="text-xs text-[#7A869A]">No classes found for this school.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {classes.map((c) => {
                const checked = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs ${
                      checked
                        ? "border-[#FF6B35] bg-[#FFF7F4] text-[#FF6B35] font-medium"
                        : "border-[#E8EDF5] text-[#7A869A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClass(c.id)}
                      className="hidden"
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#FF6B35] border-[#FF6B35]" : "border-[#CBD5E1]"}`}>
                      {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                    </span>
                    {c.name}-{c.section}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Note if both selected */}
        {selectedSubjectIds.length > 0 && selectedClassIds.length > 0 && (
          <div className="bg-[#FFF7F4] border border-[#FFD8C8] rounded-xl p-3 text-xs text-[#FF6B35]">
            This teacher will be assigned to teach {selectedSubjectIds.length} subject{selectedSubjectIds.length > 1 ? "s" : ""} across {selectedClassIds.length} class{selectedClassIds.length > 1 ? "es" : ""} ({selectedSubjectIds.length * selectedClassIds.length} total assignments).
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t border-[#F0F4FA] mt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Add Teacher
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TeacherDetailPanel (defined OUTSIDE default export) ────────────────────
interface TeacherDetailPanelProps {
  teacher: TeacherRow;
  allClasses: ClassOption[];
  allSubjects: SubjectOption[];
  schoolId: string;
  onRefresh: () => void;
}

function TeacherDetailPanel({ teacher, allClasses, allSubjects, schoolId, onRefresh }: TeacherDetailPanelProps) {
  const [assigning, setAssigning] = useState(false);
  const [newClassId, setNewClassId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [saving, setSaving] = useState(false);

  // unique classes this teacher teaches
  const uniqueClasses = Array.from(
    new Map(teacher.subjects.map((s) => [s.classId, { id: s.classId, name: s.className, section: s.classSection }])).values()
  );
  const uniqueSubjects = Array.from(
    new Map(teacher.subjects.map((s) => [s.subjectId, { id: s.subjectId, name: s.subjectName }])).values()
  );

  async function handleAssign() {
    if (!newClassId || !newSubjectId) { toast.error("Select both a class and subject"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("class_subjects").upsert({
        class_id: newClassId,
        subject_id: newSubjectId,
        teacher_id: teacher.id,
        school_id: schoolId,
      }, { onConflict: "class_id,subject_id" });
      if (error) { toast.error(error.message); } else {
        toast.success("Assignment added");
        setNewClassId(""); setNewSubjectId("");
        setAssigning(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign(classId: string, subjectId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("class_subjects")
      .delete()
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("teacher_id", teacher.id);
    if (error) { toast.error(error.message); } else {
      toast.success("Unassigned");
      onRefresh();
    }
  }

  return (
    <div className="border-t border-[#F0F4FA] mt-0 bg-[#F8FAFC] rounded-b-2xl px-5 py-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Classes column */}
        <div>
          <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wide mb-2 flex items-center gap-1">
            <GraduationCap size={12} /> Classes Teaching
          </div>
          {uniqueClasses.length === 0 ? (
            <p className="text-xs text-[#7A869A]">No classes assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {uniqueClasses.map((c) => (
                <span key={c.id} className="px-2 py-1 rounded-lg bg-white border border-[#E8EDF5] text-xs text-[#1A2035] font-medium">
                  {c.name}-{c.section}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Subjects column */}
        <div>
          <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wide mb-2 flex items-center gap-1">
            <BookOpen size={12} /> Subjects
          </div>
          {uniqueSubjects.length === 0 ? (
            <p className="text-xs text-[#7A869A]">No subjects assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {uniqueSubjects.map((s) => (
                <span key={s.id} className="px-2 py-1 rounded-lg bg-[#FFF7F4] border border-[#FFD8C8] text-xs text-[#FF6B35] font-medium">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-assignment list with unassign */}
      {teacher.subjects.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wide mb-2">All Assignments</div>
          <div className="space-y-1.5">
            {teacher.subjects.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-[#E8EDF5] rounded-xl px-3 py-2">
                <span className="text-xs text-[#1A2035]">
                  <span className="font-medium">{s.className}-{s.classSection}</span>
                  <span className="text-[#7A869A] mx-1">·</span>
                  {s.subjectName}
                </span>
                <button
                  onClick={() => handleUnassign(s.classId, s.subjectId)}
                  className="p-1 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                  title="Unassign"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign new */}
      <div className="mt-4">
        {!assigning ? (
          <button
            onClick={() => setAssigning(true)}
            className="flex items-center gap-1.5 text-xs text-[#FF6B35] font-medium hover:underline"
          >
            <Plus size={14} /> Assign Class + Subject
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
            >
              <option value="">Select Class</option>
              {allClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
              ))}
            </select>
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white"
            >
              <option value="">Select Subject</option>
              {allSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button size="sm" variant="primary" onClick={handleAssign} loading={saving}>Assign</Button>
            <Button size="sm" variant="ghost" onClick={() => setAssigning(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TeachersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "classes">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    const supabase = createClient();
    const schoolId = user.schoolId;
    setLoading(true);

    try {
      // Fetch subjects & classes in parallel
      const [{ data: subjectData }, { data: classData }, { data: teacherData }] = await Promise.all([
        supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
        supabase.from("classes").select("id, name, section").eq("school_id", schoolId).order("name"),
        supabase.from("teachers").select("id, user_id, users(name, email)").eq("school_id", schoolId),
      ]);

      setSubjects((subjectData as SubjectOption[]) ?? []);
      setClasses((classData as ClassOption[]) ?? []);

      if (!teacherData) { setLoading(false); return; }

      // For each teacher, fetch their class_subjects
      const rows: TeacherRow[] = await Promise.all(
        teacherData.map(async (t, i) => {
          const u = Array.isArray(t.users) ? t.users[0] : (t.users as { name?: string; email?: string } | null);
          const name = u?.name ?? "Teacher";
          const email = u?.email ?? "";

          const { data: csData } = await supabase
            .from("class_subjects")
            .select("subject_id, subjects(name), class_id, classes(name, section)")
            .eq("teacher_id", t.id)
            .eq("school_id", schoolId);

          const teacherSubjects: TeacherSubject[] = (csData ?? []).map((cs) => {
            const sub = Array.isArray(cs.subjects) ? cs.subjects[0] : (cs.subjects as { name?: string } | null);
            const cls = Array.isArray(cs.classes) ? cs.classes[0] : (cs.classes as { name?: string; section?: string } | null);
            return {
              subjectId: cs.subject_id,
              subjectName: sub?.name ?? "",
              classId: cs.class_id,
              className: cls?.name ?? "",
              classSection: cls?.section ?? "",
            };
          });

          const uniqueClassIds = new Set(teacherSubjects.map((s) => s.classId));

          return {
            id: t.id,
            userId: t.user_id,
            name,
            email,
            initials: initialsOf(name),
            color: colorFor(i),
            classCount: uniqueClassIds.size,
            subjects: teacherSubjects,
          };
        })
      );

      setTeachers(rows);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (!userLoading && user?.schoolId) fetchData();
  }, [user?.schoolId, userLoading, fetchData]);

  // Filter & sort
  const filtered = teachers
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else cmp = a.classCount - b.classCount;
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: "name" | "classes") {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: "name" | "classes" }) {
    if (sortBy !== field) return <SortAsc size={12} className="text-[#CBD5E1]" />;
    return sortDir === "asc"
      ? <SortAsc size={12} className="text-[#FF6B35]" />
      : <SortDesc size={12} className="text-[#FF6B35]" />;
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const totalAssignments = teachers.reduce((s, t) => s + t.subjects.length, 0);

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} teacher${teachers.length !== 1 ? "s" : ""} in your school`}
        actions={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Teacher
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard
          label="Total Teachers"
          value={teachers.length}
          icon={<Users size={18} />}
          bgColor="#EFF6FF"
          iconColor="#3B82F6"
        />
        <StatsCard
          label="Class Assignments"
          value={totalAssignments}
          icon={<BookOpen size={18} />}
          bgColor="#FFF7F4"
          iconColor="#FF6B35"
        />
        <StatsCard
          label="Avg Classes/Teacher"
          value={teachers.length ? Math.round(teachers.reduce((s, t) => s + t.classCount, 0) / teachers.length) : 0}
          icon={<GraduationCap size={18} />}
          bgColor="#F5F3FF"
          iconColor="#8B5CF6"
        />
      </div>

      {/* Search & sort */}
      <div className="flex items-center gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="w-72" />
        <div className="flex items-center gap-1 ml-auto text-xs text-[#7A869A]">
          <span>Sort:</span>
          <button
            onClick={() => toggleSort("name")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${sortBy === "name" ? "bg-[#FFF7F4] text-[#FF6B35]" : "hover:bg-[#F0F4FA]"}`}
          >
            Name <SortIcon field="name" />
          </button>
          <button
            onClick={() => toggleSort("classes")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${sortBy === "classes" ? "bg-[#FFF7F4] text-[#FF6B35]" : "hover:bg-[#F0F4FA]"}`}
          >
            Classes <SortIcon field="classes" />
          </button>
        </div>
      </div>

      {/* Teacher list */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <Users size={32} className="text-[#CBD5E1] mx-auto mb-3" />
          <div className="text-sm text-[#7A869A]">
            {search ? "No teachers match your search" : "No teachers yet"}
          </div>
          {!search && (
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowAddModal(true)}>
              Add First Teacher
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const isExpanded = expandedId === t.id;
            const uniqueSubjectNames = Array.from(new Set(t.subjects.map((s) => s.subjectName))).filter(Boolean);

            return (
              <div key={t.id} className="bg-white border border-[#E8EDF5] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                {/* Row header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#FAFBFC] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <Avatar initials={t.initials} color={t.color} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A2035]">{t.name}</div>
                    <div className="text-xs text-[#7A869A] truncate">{t.email || "No email"}</div>
                  </div>

                  {/* Subjects chips */}
                  <div className="hidden md:flex items-center gap-1.5 flex-1 flex-wrap">
                    {uniqueSubjectNames.slice(0, 3).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFF7F4] text-[#FF6B35] border border-[#FFD8C8]">
                        {s}
                      </span>
                    ))}
                    {uniqueSubjectNames.length > 3 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F4FA] text-[#7A869A]">
                        +{uniqueSubjectNames.length - 3}
                      </span>
                    )}
                    {uniqueSubjectNames.length === 0 && (
                      <span className="text-xs text-[#CBD5E1] italic">No subjects</span>
                    )}
                  </div>

                  {/* Class count */}
                  <div className="text-center shrink-0 w-20">
                    <div className="text-lg font-bold text-[#1A2035]">{t.classCount}</div>
                    <div className="text-[10px] text-[#7A869A]">class{t.classCount !== 1 ? "es" : ""}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-2 rounded-xl text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
                      onClick={() => toast(`Messaging ${t.name}...`)}
                      title="Message"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>

                  {/* Expand icon */}
                  <div className="shrink-0 text-[#7A869A]">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Detail panel */}
                {isExpanded && (
                  <TeacherDetailPanel
                    teacher={t}
                    allClasses={classes}
                    allSubjects={subjects}
                    schoolId={user!.schoolId!}
                    onRefresh={fetchData}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        schoolId={user?.schoolId ?? ""}
        subjects={subjects}
        classes={classes}
        onCreated={fetchData}
      />
    </div>
  );
}

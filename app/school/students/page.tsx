"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Search, Plus, X, Loader2, Users, Star, CheckCircle, Upload,
  ChevronLeft, ChevronRight, ChevronDown, ArrowUpDown, Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/school/PageHeader";
import { StatsCard } from "@/components/school/StatsCard";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Avatar } from "@/components/school/Avatar";

const PAGE_SIZE = 12;
const STUDENT_COLORS = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#FF6B35","#06B6D4","#EC4899"];
function colorFor(i: number) { return STUDENT_COLORS[i % STUDENT_COLORS.length]; }
function initials(name: string) { return name.split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase(); }

interface StudentRow {
  id: string; userId: string; name: string; email: string;
  initials: string; color: string;
  classId: string | null; className: string;
  totalXp: number; studentRecordId: string | null;
}
interface ClassOption { id: string; name: string; section: string; }

/* ── AddStudentModal — OUTSIDE parent to prevent cursor jump ─────────────── */
interface AddStudentModalProps {
  isOpen: boolean; onClose: () => void;
  schoolId: string; classes: ClassOption[];
  onCreated: (s: StudentRow) => void;
}
function AddStudentModal({ isOpen, onClose, schoolId, classes, onCreated }: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("");
  const [password, setPassword] = useState("Student@2025");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!classId) e.classId = "Please select a class";
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
        body: JSON.stringify({ email: email.toLowerCase().trim(), name: name.trim(), role: "STUDENT", schoolId, classId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create student");

      const cls = classes.find(c => c.id === classId);
      onCreated({
        id: data.studentId,
        userId: data.userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        initials: initials(name.trim()),
        color: colorFor(Math.random() * 8 | 0),
        classId,
        className: cls ? `${cls.name}-${cls.section}` : "—",
        totalXp: 0,
        studentRecordId: data.studentRecordId ?? null,
      });
      toast.success(`✓ ${name.trim()} added — password: ${password}`);
      setName(""); setEmail(""); setClassId(""); setPassword("Student@2025"); setErrors({});
      onClose();
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#1A2035]">Add New Student</h2>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aarav Sharma"
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Email *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="student@school.com" type="email"
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Class *</label>
            <div className="relative">
              <select value={classId} onChange={e => setClassId(e.target.value)}
                className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] appearance-none">
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
            </div>
            {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Student@2025"
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35]"/>
            <p className="text-[10px] text-[#7A869A] mt-1">Student logs in with this email + password</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {saving ? "Creating…" : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MoveClassModal — OUTSIDE parent ────────────────────────────────────── */
interface MoveClassModalProps {
  isOpen: boolean; onClose: () => void;
  student: StudentRow | null; classes: ClassOption[];
  onMoved: (studentId: string, newClassId: string, className: string) => void;
}
function MoveClassModal({ isOpen, onClose, student, classes, onMoved }: MoveClassModalProps) {
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setClassId(student?.classId ?? ""); }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSave = async () => {
    if (!classId || classId === student.classId) { onClose(); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      if (student.studentRecordId) {
        await supabase.from("student_records").update({ class_id: classId }).eq("id", student.studentRecordId).throwOnError();
      } else {
        const { data: sr } = await supabase.from("student_records").insert({ student_id: student.id, class_id: classId, is_current: true }).select("id").single();
        if (sr) await supabase.from("student_xp").insert({ student_records_id: sr.id, total_xp: 0 });
      }
      const cls = classes.find(c => c.id === classId);
      onMoved(student.id, classId, cls ? `${cls.name}-${cls.section}` : "—");
      toast.success(`${student.name} moved to ${cls?.name}-${cls?.section}`);
      onClose();
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1A2035]">Move {student.name}</h2>
          <button onClick={onClose}><X size={18} className="text-[#7A869A]"/></button>
        </div>
        <label className="text-xs font-semibold text-[#7A869A] block mb-1">New Class</label>
        <div className="relative mb-4">
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] appearance-none">
            <option value="">— Select class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <button onClick={handleSave} disabled={saving || !classId}
            className="flex-1 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1">
            {saving ? <Loader2 size={13} className="animate-spin"/> : null}
            {saving ? "Moving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── BulkImportModal ─────────────────────────────────────────────────────── */
interface ParsedStudent { name: string; email: string; valid: boolean; error?: string; }
interface BulkImportModalProps {
  isOpen: boolean; onClose: () => void;
  schoolId: string; classes: ClassOption[];
  onComplete: () => void;
}
function BulkImportModal({ isOpen, onClose, schoolId, classes, onComplete }: BulkImportModalProps) {
  const [classId, setClassId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParsedStudent[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{current: number; total: number} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const parseCsv = (text: string): ParsedStudent[] => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const result: ParsedStudent[] = [];
    const startIdx = /^name/i.test(lines[0].split(",")[0]?.trim() ?? "") ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      const name = parts[0] ?? "";
      const email = parts[1] ?? "";
      const entry: ParsedStudent = { name, email, valid: true };
      if (!name) { entry.valid = false; entry.error = "Name is required"; }
      else if (!email) { entry.valid = false; entry.error = "Email is required"; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { entry.valid = false; entry.error = "Invalid email"; }
      result.push(entry);
    }
    return result;
  };

  const handlePreview = () => {
    const e: Record<string, string> = {};
    if (!classId) e.classId = "Please select a class";
    if (!csvText.trim()) e.csv = "Please enter student data";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    const parsed = parseCsv(csvText);
    setPreview(parsed);
    if (parsed.length === 0) { toast.error("No valid student data found"); setPreview(null); }
  };

  const handleSubmit = async () => {
    if (!preview || preview.length === 0) return;
    const invalid = preview.filter(p => !p.valid);
    if (invalid.length > 0) { toast.error(`${invalid.length} entries have errors. Fix them first.`); return; }
    setSaving(true);
    setProgress({ current: 0, total: preview.length });
    const results = { success: 0, fail: 0 };
    for (let i = 0; i < preview.length; i++) {
      const s = preview[i];
      setProgress({ current: i + 1, total: preview.length });
      try {
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: s.email.toLowerCase().trim(), name: s.name.trim(), role: "STUDENT", schoolId, classId, password: "Student@2025" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        results.success++;
      } catch { results.fail++; }
    }
    setSaving(false);
    setProgress(null);
    if (results.fail === 0) {
      toast.success(`✓ ${results.success} students imported successfully`);
      setClassId(""); setCsvText(""); setPreview(null); setErrors({});
      onClose();
      onComplete();
    } else {
      toast.error(`${results.success} succeeded, ${results.fail} failed`);
    }
  };

  const validCount = preview ? preview.filter(p => p.valid).length : 0;
  const invalidCount = preview ? preview.length - validCount : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="text-base font-bold text-[#1A2035]">Bulk Import Students</h2>
          <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035]"><X size={18}/></button>
        </div>
        <div className="space-y-3 shrink-0">
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Class *</label>
            <div className="relative">
              <select value={classId} onChange={e => setClassId(e.target.value)}
                className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] appearance-none">
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
            </div>
            {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] block mb-1">Student Data (CSV) *</label>
            <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setPreview(null); }}
              placeholder={"name,email\nAarav Sharma, aarav@school.com\nPriya Patel, priya@school.com"}
              rows={5}
              className="w-full px-3 py-2 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] resize-none font-mono"/>
            <p className="text-[10px] text-[#7A869A] mt-1">One student per line. Format: <code className="bg-[#F0F4FA] px-1 rounded">name,email</code></p>
            {errors.csv && <p className="text-xs text-red-500 mt-1">{errors.csv}</p>}
          </div>
        </div>
        {preview && (
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#7A869A]">
                Preview ({validCount} valid{invalidCount > 0 ? `, ${invalidCount} with errors` : ""})
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0F4FA]">
                  <th className="text-left font-bold text-[#7A869A] uppercase tracking-wider px-2 py-1.5">#</th>
                  <th className="text-left font-bold text-[#7A869A] uppercase tracking-wider px-2 py-1.5">Name</th>
                  <th className="text-left font-bold text-[#7A869A] uppercase tracking-wider px-2 py-1.5">Email</th>
                  <th className="text-left font-bold text-[#7A869A] uppercase tracking-wider px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {preview.map((s, i) => (
                  <tr key={i} className={s.valid ? "" : "bg-red-50"}>
                    <td className="px-2 py-1.5 text-[#7A869A]">{i + 1}</td>
                    <td className="px-2 py-1.5 text-[#1A2035] font-medium">{s.name || "—"}</td>
                    <td className="px-2 py-1.5 text-[#1A2035]">{s.email || "—"}</td>
                    <td className="px-2 py-1.5">
                      {s.valid ? <span className="text-green-600 font-medium">✓ Valid</span>
                        : <span className="text-red-500">{s.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2 mt-4 shrink-0 border-t border-[#F0F4FA] pt-4">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          {!preview ? (
            <button onClick={handlePreview} disabled={saving}
              className="flex-1 py-2 bg-[#3B82F6] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1">
              Preview
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving || validCount === 0}
              className="flex-1 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1">
              {saving ? (
                <><Loader2 size={14} className="animate-spin"/> Importing {progress?.current}/{progress?.total}…</>
              ) : (
                <><Plus size={14}/> Import {validCount} Student{validCount !== 1 ? "s" : ""}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function StudentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name"|"xp">("name");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StudentRow | null>(null);
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    const supabase = createClient();
    const schoolId = user.schoolId;
    try {
      const [classesRes, studentsRes] = await Promise.all([
        supabase.from("classes").select("id, name, section").eq("school_id", schoolId).order("name"),
        supabase.from("students").select("id, user_id, users!students_user_id_fkey(name, email)").eq("school_id", schoolId),
      ]);
      setClasses(classesRes.data ?? []);
      const rawStudents = studentsRes.data ?? [];

      const rows: StudentRow[] = await Promise.all(
        rawStudents.map(async (s, i) => {
          const u = Array.isArray(s.users) ? s.users[0] : (s.users as { name?: string; email?: string } | null);
          const name = u?.name ?? "Student";

          const { data: record } = await supabase.from("student_records")
            .select("id, class_id, classes(name, section)")
            .eq("student_id", s.id).eq("is_current", true).maybeSingle();

          let classId: string | null = null;
          let className = "—";
          let totalXp = 0;
          let studentRecordId: string | null = null;

          if (record) {
            studentRecordId = record.id;
            classId = record.class_id;
            const cls = Array.isArray(record.classes) ? record.classes[0] : (record.classes as { name?: string; section?: string } | null);
            if (cls) className = `${cls.name}-${cls.section}`;
            const { data: xpRow } = await supabase.from("student_xp").select("total_xp").eq("student_records_id", record.id).maybeSingle();
            totalXp = xpRow?.total_xp ?? 0;
          }

          return { id: s.id, userId: s.user_id, name, email: u?.email ?? "", initials: initials(name), color: colorFor(i), classId, className, totalXp, studentRecordId };
        })
      );
      setStudents(rows);
    } finally { setLoading(false); }
  }, [user?.schoolId]);

  useEffect(() => { if (user?.schoolId) fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (classFilter !== "all" && s.classId !== classFilter) return false;
      if (debouncedSearch && !s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !s.email.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    }).sort((a, b) => sortBy === "xp" ? b.totalXp - a.totalXp : a.name.localeCompare(b.name));
  }, [students, classFilter, debouncedSearch, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const enrolled = students.filter(s => s.classId).length;
  const topXp = students.length ? Math.max(...students.map(s => s.totalXp)) : 0;

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]"/>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        schoolId={user?.schoolId ?? ""}
        classes={classes}
        onCreated={s => setStudents(prev => [s, ...prev])}
      />
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        schoolId={user?.schoolId ?? ""}
        classes={classes}
        onComplete={fetchData}
      />
      <MoveClassModal
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        student={moveTarget}
        classes={classes}
        onMoved={(id, cid, cname) => setStudents(prev => prev.map(s => s.id === id ? { ...s, classId: cid, className: cname } : s))}
      />

      <PageHeader
        title="Students"
        subtitle={`${students.length} students enrolled`}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setShowAddModal(true)}>+ Add Student</Button>
            <Button variant="ghost" onClick={() => setShowBulkImport(true)}><Upload size={14}/> Bulk Import</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard label="Total Students" value={students.length} icon={<Users size={18}/>} bgColor="#EFF6FF" iconColor="#3B82F6"/>
        <StatsCard label="Enrolled in Class" value={enrolled} icon={<CheckCircle size={18}/>} bgColor="#ECFDF5" iconColor="#10B981"/>
        <StatsCard label="Top XP" value={topXp.toLocaleString()} icon={<Star size={18}/>} bgColor="#FFFBEB" iconColor="#F59E0B"/>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E8EDF5] px-3 h-9 w-56">
          <Search size={13} className="text-[#7A869A] shrink-0"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email…"
            className="flex-1 text-xs bg-transparent outline-none text-[#1A2035] placeholder-[#94A3B8]"/>
        </div>
        <div className="relative">
          <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-white text-xs text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
        </div>
        <button onClick={() => setSortBy(b => b === "name" ? "xp" : "name")}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E8EDF5] bg-white text-xs text-[#7A869A] hover:border-[#FF6B35] transition-colors">
          <ArrowUpDown size={12}/> Sort: {sortBy === "name" ? "Name" : "XP"}
        </button>
        <span className="text-xs text-[#7A869A] ml-auto">{filtered.length} students</span>
      </div>

      {/* Student table */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-3xl mb-3">👤</div>
          <div className="text-sm font-semibold text-[#1A2035] mb-1">No students found</div>
          <div className="text-xs text-[#7A869A] mb-4">
            {students.length === 0 ? "Add your first student to get started." : "Try a different search or filter."}
          </div>
          {students.length === 0 && <Button variant="primary" onClick={() => setShowAddModal(true)}>Add First Student</Button>}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F4FA]">
                {["Student","Class","XP","Actions"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#7A869A] uppercase tracking-wider px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {paginated.map(s => (
                <React.Fragment key={s.id}>
                  <tr className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${selected?.id === s.id ? "bg-[#FFF7F4]" : ""}`}
                    onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: s.color }}>
                          {s.initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1A2035]">{s.name}</div>
                          <div className="text-[10px] text-[#7A869A]">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[#1A2035]">{s.className}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-[#F59E0B]"/>
                        <span className="text-xs font-semibold text-[#1A2035]">{s.totalXp.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMoveTarget(s)}
                          className="text-[10px] font-semibold text-[#3B82F6] hover:underline px-2 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors">
                          Move Class
                        </button>
                        <button onClick={() => setSelected(selected?.id === s.id ? null : s)}
                          className="p-1 rounded-lg text-[#7A869A] hover:text-[#FF6B35] hover:bg-[#FFF7F4] transition-colors">
                          <Eye size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {selected?.id === s.id && (
                    <tr>
                      <td colSpan={4} className="px-5 py-4 bg-[#FFF7F4] border-b border-[#FFD5C2]">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="font-bold text-[#7A869A] uppercase text-[10px] mb-1">Email</div>
                            <div className="text-[#1A2035]">{s.email}</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#7A869A] uppercase text-[10px] mb-1">Class</div>
                            <div className="text-[#1A2035]">{s.className}</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#7A869A] uppercase text-[10px] mb-1">XP</div>
                            <div className="text-[#FF6B35] font-bold">{s.totalXp.toLocaleString()} XP</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F4FA]">
              <span className="text-xs text-[#7A869A]">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-1.5 rounded-lg text-[#7A869A] hover:bg-[#F0F4FA] disabled:opacity-40">
                  <ChevronLeft size={14}/>
                </button>
                {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                  const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-[#7A869A] hover:bg-[#F0F4FA] disabled:opacity-40">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

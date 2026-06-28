"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  School,
  Users,
  BookOpen,
  Plus,
  ChevronRight,
  Loader2,
  X,
  GraduationCap,
  Building2,
  UserPlus,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SchoolRow {
  id: string;
  username: string;
  board: string | null;
  display_name: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  admin: { name: string | null; email: string | null } | null;
  teacherCount: number;
  studentCount: number;
  classCount: number;
}

interface TeacherRow {
  id: string;
  name: string;
  email: string;
}

interface ClassRow {
  id: string;
  name: string;
  section: string;
}

interface GlobalStats {
  schools: number;
  teachers: number;
  students: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Input component
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1A2035] mb-1">
        {label}
        {required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#EF4444] mt-1">{error}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  hasError,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] transition-colors ${
        hasError ? "border-[#EF4444]" : "border-[#E8EDF5]"
      }`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  hasError?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] bg-white transition-colors ${
        hasError ? "border-[#EF4444]" : "border-[#E8EDF5]"
      }`}
    >
      {children}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="px-5 py-4 border-b border-[#F0F4FA] last:border-0">
      <div className="grid grid-cols-12 gap-3 items-center">
        <div className="col-span-4 space-y-1.5">
          <div className="h-3.5 w-3/4 bg-[#F0F4FA] rounded animate-pulse" />
          <div className="h-2.5 w-1/2 bg-[#F0F4FA] rounded animate-pulse" />
        </div>
        <div className="col-span-2 h-3 w-12 bg-[#F0F4FA] rounded animate-pulse" />
        <div className="col-span-2 h-3 w-8 bg-[#F0F4FA] rounded animate-pulse" />
        <div className="col-span-2 h-3 w-8 bg-[#F0F4FA] rounded animate-pulse" />
        <div className="col-span-2 h-3 w-8 bg-[#F0F4FA] rounded animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
      <div className="w-8 h-8 rounded-xl bg-[#F0F4FA] animate-pulse mb-2" />
      <div className="h-6 w-12 bg-[#F0F4FA] rounded animate-pulse mb-1" />
      <div className="h-3 w-20 bg-[#F0F4FA] rounded animate-pulse" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboard School Modal
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function OnboardSchoolModal({ isOpen, onClose, onSuccess }: OnboardSchoolModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [board, setBoard] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("EduBattle@2025");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from display name unless user has edited it
  useEffect(() => {
    if (!usernameEdited) {
      setUsername(slugify(displayName));
    }
  }, [displayName, usernameEdited]);

  const resetForm = () => {
    setDisplayName("");
    setUsername("");
    setUsernameEdited(false);
    setBoard("");
    setCity("");
    setState("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("EduBattle@2025");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "Required";
    if (!username.trim()) e.username = "Required";
    if (!/^[a-z0-9-]+$/.test(username)) e.username = "Only lowercase letters, numbers, hyphens";
    if (!board) e.board = "Required";
    if (!city.trim()) e.city = "Required";
    if (!state.trim()) e.state = "Required";
    if (!adminName.trim()) e.adminName = "Required";
    if (!adminEmail.trim()) e.adminEmail = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) e.adminEmail = "Invalid email";
    if (!adminPassword.trim() || adminPassword.length < 8) e.adminPassword = "Min 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          name: adminName.trim(),
          role: "SCHOOL",
          password: adminPassword,
          schoolData: {
            username: username.trim(),
            board,
            display_name: displayName.trim(),
            city: city.trim(),
            state: state.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to onboard school");
      } else {
        toast.success(`${displayName} onboarded successfully!`);
        handleClose();
        onSuccess();
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8EDF5] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF7F4] flex items-center justify-center">
              <Building2 size={16} className="text-[#FF6B35]" />
            </div>
            <h2 className="text-base font-semibold text-[#1A2035]">Onboard School</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* School Info */}
          <div>
            <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider mb-3">School Info</p>
            <div className="space-y-3">
              <Field label="School Display Name" required error={errors.displayName}>
                <TextInput
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="e.g. DPS New Delhi"
                  hasError={!!errors.displayName}
                />
              </Field>

              <Field label="Username / Slug" required error={errors.username}>
                <TextInput
                  value={username}
                  onChange={(v) => { setUsername(v); setUsernameEdited(true); }}
                  placeholder="e.g. dps-newdelhi"
                  hasError={!!errors.username}
                />
                <p className="text-[10px] text-[#7A869A] mt-1">
                  Auto-generated from name · Used in URLs · Only lowercase, numbers, hyphens
                </p>
              </Field>

              <Field label="Board" required error={errors.board}>
                <SelectInput value={board} onChange={setBoard} hasError={!!errors.board}>
                  <option value="">Select board...</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="IB">IB</option>
                  <option value="State">State Board</option>
                </SelectInput>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City" required error={errors.city}>
                  <TextInput
                    value={city}
                    onChange={setCity}
                    placeholder="e.g. New Delhi"
                    hasError={!!errors.city}
                  />
                </Field>
                <Field label="State" required error={errors.state}>
                  <TextInput
                    value={state}
                    onChange={setState}
                    placeholder="e.g. Delhi"
                    hasError={!!errors.state}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E8EDF5]" />

          {/* Admin Account */}
          <div>
            <p className="text-xs font-bold text-[#7A869A] uppercase tracking-wider mb-3">Admin Account</p>
            <div className="space-y-3">
              <Field label="Admin Full Name" required error={errors.adminName}>
                <TextInput
                  value={adminName}
                  onChange={setAdminName}
                  placeholder="e.g. Rajesh Kumar"
                  hasError={!!errors.adminName}
                />
              </Field>

              <Field label="Admin Email" required error={errors.adminEmail}>
                <TextInput
                  value={adminEmail}
                  onChange={setAdminEmail}
                  placeholder="admin@school.edu"
                  type="email"
                  hasError={!!errors.adminEmail}
                />
              </Field>

              <Field label="Password" required error={errors.adminPassword}>
                <TextInput
                  value={adminPassword}
                  onChange={setAdminPassword}
                  placeholder="Min 8 characters"
                  type="text"
                  hasError={!!errors.adminPassword}
                />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#7A869A] rounded-xl hover:bg-[#F0F4FA] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#E55A28] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
              {saving ? "Onboarding..." : "Onboard School"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Teacher Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AddTeacherModalProps {
  isOpen: boolean;
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddTeacherModal({ isOpen, schoolId, onClose, onSuccess }: AddTeacherModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("EduBattle@2025");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("EduBattle@2025");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Required";
    if (!email.trim()) e.email = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password || password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role: "TEACHER",
          password,
          schoolId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to add teacher");
      } else {
        toast.success(`${name} added as teacher`);
        handleClose();
        onSuccess();
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-[#E8EDF5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <UserCheck size={16} className="text-[#3B82F6]" />
            </div>
            <h2 className="text-base font-semibold text-[#1A2035]">Add Teacher</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Full Name" required error={errors.name}>
            <TextInput value={name} onChange={setName} placeholder="e.g. Mrs. A. Sharma" hasError={!!errors.name} />
          </Field>
          <Field label="Email" required error={errors.email}>
            <TextInput value={email} onChange={setEmail} placeholder="teacher@school.edu" type="email" hasError={!!errors.email} />
          </Field>
          <Field label="Password" required error={errors.password}>
            <TextInput value={password} onChange={setPassword} placeholder="Min 8 characters" hasError={!!errors.password} />
          </Field>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-[#7A869A] rounded-xl hover:bg-[#F0F4FA] transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-xl hover:bg-[#2563EB] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {saving ? "Adding..." : "Add Teacher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Student Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AddStudentModalProps {
  isOpen: boolean;
  schoolId: string;
  classes: ClassRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddStudentModal({ isOpen, schoolId, classes, onClose, onSuccess }: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("EduBattle@2025");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("EduBattle@2025");
    setClassId("");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Required";
    if (!email.trim()) e.email = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password || password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role: "STUDENT",
          password,
          schoolId,
          classId: classId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to add student");
      } else {
        toast.success(`${name} added as student`);
        handleClose();
        onSuccess();
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-[#E8EDF5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
              <GraduationCap size={16} className="text-[#10B981]" />
            </div>
            <h2 className="text-base font-semibold text-[#1A2035]">Add Student</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Full Name" required error={errors.name}>
            <TextInput value={name} onChange={setName} placeholder="e.g. Riya Singh" hasError={!!errors.name} />
          </Field>
          <Field label="Email" required error={errors.email}>
            <TextInput value={email} onChange={setEmail} placeholder="student@school.edu" type="email" hasError={!!errors.email} />
          </Field>
          <Field label="Password" required error={errors.password}>
            <TextInput value={password} onChange={setPassword} placeholder="Min 8 characters" hasError={!!errors.password} />
          </Field>
          <Field label="Assign to Class" error={errors.classId}>
            <SelectInput value={classId} onChange={setClassId}>
              <option value="">No class (assign later)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.section}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-[#7A869A] rounded-xl hover:bg-[#F0F4FA] transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white text-sm font-semibold rounded-xl hover:bg-[#059669] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
              {saving ? "Adding..." : "Add Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// School Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

interface SchoolDetailPanelProps {
  school: SchoolRow;
  teachers: TeacherRow[];
  classes: ClassRow[];
  teachersLoading: boolean;
  classesLoading: boolean;
  onAddTeacher: () => void;
  onAddStudent: () => void;
}

function SchoolDetailPanel({
  school,
  teachers,
  classes,
  teachersLoading,
  classesLoading,
  onAddTeacher,
  onAddStudent,
}: SchoolDetailPanelProps) {
  const displayName = school.display_name || school.username;

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
      {/* School header */}
      <div className="p-5 border-b border-[#E8EDF5]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-[#1A2035]">{displayName}</div>
            <div className="text-xs text-[#7A869A] mt-0.5">@{school.username}</div>
          </div>
          {school.board && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">
              {school.board}
            </span>
          )}
        </div>

        {(school.city || school.state) && (
          <div className="text-xs text-[#7A869A] mt-2">
            {[school.city, school.state].filter(Boolean).join(", ")}
          </div>
        )}

        {school.admin?.email && (
          <div className="mt-2 text-xs text-[#7A869A]">
            Admin: <span className="font-medium text-[#1A2035]">{school.admin.name || "—"}</span>
            {" · "}
            <span>{school.admin.email}</span>
          </div>
        )}
      </div>

      {/* Stats mini-grid */}
      <div className="grid grid-cols-3 border-b border-[#E8EDF5]">
        {[
          { label: "Students", value: school.studentCount, color: "#10B981", bg: "#ECFDF5" },
          { label: "Teachers", value: school.teacherCount, color: "#3B82F6", bg: "#EFF6FF" },
          { label: "Classes", value: school.classCount, color: "#8B5CF6", bg: "#F5F3FF" },
        ].map((s) => (
          <div key={s.label} className="p-3 text-center border-r border-[#E8EDF5] last:border-0">
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-4 border-b border-[#E8EDF5]">
        <button
          onClick={onAddTeacher}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#EFF6FF] text-[#3B82F6] text-xs font-semibold hover:bg-[#DBEAFE] transition-colors"
        >
          <UserCheck size={13} /> Add Teacher
        </button>
        <button
          onClick={onAddStudent}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#ECFDF5] text-[#10B981] text-xs font-semibold hover:bg-[#D1FAE5] transition-colors"
        >
          <GraduationCap size={13} /> Add Student
        </button>
      </div>

      {/* Teachers list */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#1A2035]">Teachers</span>
          <span className="text-[10px] text-[#7A869A]">{school.teacherCount} total</span>
        </div>
        {teachersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-[#F0F4FA] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-4">
            <UserCheck size={20} className="text-[#CBD5E1] mx-auto mb-1" />
            <p className="text-xs text-[#7A869A]">No teachers yet</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {teachers.map((t) => {
              const initials = t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] text-[10px] font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#1A2035] truncate">{t.name}</div>
                    <div className="text-[10px] text-[#7A869A] truncate">{t.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classes list */}
      <div className="p-4 pt-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#1A2035]">Classes</span>
          <span className="text-[10px] text-[#7A869A]">{school.classCount} total</span>
        </div>
        {classesLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-7 bg-[#F0F4FA] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-4">
            <BookOpen size={20} className="text-[#CBD5E1] mx-auto mb-1" />
            <p className="text-xs text-[#7A869A]">No classes yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {classes.map((c) => (
              <span
                key={c.id}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E8EDF5] text-[#1A2035]"
              >
                {c.name}-{c.section}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Joined date */}
      {school.created_at && (
        <div className="px-4 pb-4 text-[10px] text-[#CBD5E1]">
          Joined {new Date(school.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CmsSchoolsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ schools: 0, teachers: 0, students: 0 });

  // Selected school detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTeachers, setDetailTeachers] = useState<TeacherRow[]>([]);
  const [detailClasses, setDetailClasses] = useState<ClassRow[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // ── Fetch all schools with counts ──────────────────────────────────────────
  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, username, board, display_name, city, state, created_at, admin:user_id(name, email)")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load schools");
        return;
      }

      const rows = (data as unknown as Omit<SchoolRow, "teacherCount" | "studentCount" | "classCount">[]) || [];

      const withCounts: SchoolRow[] = await Promise.all(
        rows.map(async (school) => {
          const [{ count: teacherCount }, { count: studentCount }, { count: classCount }] =
            await Promise.all([
              supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", school.id),
              supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id),
              supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", school.id),
            ]);
          return {
            ...school,
            teacherCount: teacherCount ?? 0,
            studentCount: studentCount ?? 0,
            classCount: classCount ?? 0,
          };
        })
      );

      setSchools(withCounts);
      setGlobalStats({
        schools: withCounts.length,
        teachers: withCounts.reduce((s, r) => s + r.teacherCount, 0),
        students: withCounts.reduce((s, r) => s + r.studentCount, 0),
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSchools();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load selected school detail ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;

    const loadTeachers = async () => {
      setTeachersLoading(true);
      const { data } = await supabase
        .from("teachers")
        .select("id, users(name, email)")
        .eq("school_id", selectedId);
      setTeachersLoading(false);

      if (data) {
        setDetailTeachers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any[]).map((t) => {
            const u = Array.isArray(t.users) ? t.users[0] : t.users;
            return {
              id: t.id,
              name: u?.name ?? "Unknown",
              email: u?.email ?? "",
            };
          })
        );
      }
    };

    const loadClasses = async () => {
      setClassesLoading(true);
      const { data } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("school_id", selectedId)
        .order("name");
      setClassesLoading(false);

      if (data) {
        setDetailClasses(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            section: c.section ?? "",
          }))
        );
      }
    };

    loadTeachers();
    loadClasses();
  }, [selectedId, supabase]);

  // ── Refresh selected detail after add ─────────────────────────────────────
  const refreshDetail = useCallback(() => {
    fetchSchools();
    // Re-trigger detail load by bumping a dummy state — simplest approach is
    // to just clear and re-set the selectedId after a tick.
    if (selectedId) {
      const id = selectedId;
      setSelectedId(null);
      setTimeout(() => setSelectedId(id), 50);
    }
  }, [fetchSchools, selectedId]);

  const selectedSchool = schools.find((s) => s.id === selectedId) ?? null;

  const displayName = (school: SchoolRow) => school.display_name || school.username;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">School Management</h1>
          <p className="text-sm text-[#7A869A]">
            {loading ? "Loading..." : `${globalStats.schools} school${globalStats.schools !== 1 ? "s" : ""} onboarded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSchools}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E8EDF5] bg-white text-[#7A869A] hover:bg-[#F0F4FA] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold hover:bg-[#E55A28] transition-colors"
          >
            <Plus size={15} /> Onboard School
          </button>
        </div>
      </div>

      {/* Global stats row */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => <SkeletonStatCard key={i} />)
        ) : (
          [
            { label: "Active Schools", value: globalStats.schools, icon: <School size={16} />, color: "#3B82F6", bg: "#EFF6FF" },
            { label: "Total Teachers", value: globalStats.teachers.toLocaleString(), icon: <BookOpen size={16} />, color: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Total Students", value: globalStats.students.toLocaleString(), icon: <Users size={16} />, color: "#10B981", bg: "#ECFDF5" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                style={{ background: s.bg, color: s.color }}
              >
                {s.icon}
              </div>
              <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
              <div className="text-xs text-[#7A869A]">{s.label}</div>
            </div>
          ))
        )}
      </div>

      {/* Main content: list + detail */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E8EDF5]">
            <div className="h-3 w-48 bg-[#F0F4FA] rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-[#E8EDF5] flex flex-col items-center justify-center text-center">
          <School size={44} className="text-[#E8EDF5] mb-4" />
          <p className="text-sm font-semibold text-[#1A2035] mb-1">No schools yet</p>
          <p className="text-xs text-[#7A869A] mb-5">Onboard your first school to get started</p>
          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold hover:bg-[#E55A28] transition-colors"
          >
            <Plus size={14} /> Onboard School
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* School list — takes 2 cols */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
              {/* Table header */}
              <div className="px-5 py-3 border-b border-[#E8EDF5] bg-[#F8FAFC]">
                <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">
                  <span className="col-span-4">School</span>
                  <span className="col-span-2">Board</span>
                  <span className="col-span-2">Students</span>
                  <span className="col-span-2">Teachers</span>
                  <span className="col-span-2">Classes</span>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F0F4FA]">
                {schools.map((sch) => {
                  const isSelected = selectedId === sch.id;
                  return (
                    <button
                      key={sch.id}
                      onClick={() => setSelectedId(isSelected ? null : sch.id)}
                      className="w-full text-left px-5 py-4 hover:bg-[#F8FAFC] transition-colors group"
                      style={{ background: isSelected ? "#FFF7F4" : undefined }}
                    >
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4 flex items-center gap-2.5">
                          <div
                            className={`w-1.5 h-8 rounded-full shrink-0 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-30"}`}
                            style={{ background: "#FF6B35" }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1A2035] truncate">{displayName(sch)}</div>
                            <div className="text-[10px] text-[#7A869A] truncate">{sch.admin?.email || "—"}</div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          {sch.board ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                              {sch.board}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#CBD5E1]">—</span>
                          )}
                        </div>
                        <div className="col-span-2 text-sm font-semibold text-[#1A2035]">{sch.studentCount}</div>
                        <div className="col-span-2 text-sm text-[#7A869A]">{sch.teacherCount}</div>
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-sm text-[#7A869A]">{sch.classCount}</span>
                          <ChevronRight
                            size={14}
                            className={`text-[#CBD5E1] transition-transform shrink-0 ${isSelected ? "rotate-90 text-[#FF6B35]" : ""}`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail panel — 1 col */}
          <div>
            {selectedSchool ? (
              <SchoolDetailPanel
                school={selectedSchool}
                teachers={detailTeachers}
                classes={detailClasses}
                teachersLoading={teachersLoading}
                classesLoading={classesLoading}
                onAddTeacher={() => setShowAddTeacherModal(true)}
                onAddStudent={() => setShowAddStudentModal(true)}
              />
            ) : (
              <div className="bg-white rounded-2xl p-10 border border-[#E8EDF5] text-center">
                <School size={36} className="text-[#CBD5E1] mx-auto mb-3" />
                <div className="text-sm font-medium text-[#7A869A] mb-1">No school selected</div>
                <div className="text-xs text-[#CBD5E1]">Click a row to view school details</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <OnboardSchoolModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={fetchSchools}
      />

      {selectedId && (
        <>
          <AddTeacherModal
            isOpen={showAddTeacherModal}
            schoolId={selectedId}
            onClose={() => setShowAddTeacherModal(false)}
            onSuccess={refreshDetail}
          />
          <AddStudentModal
            isOpen={showAddStudentModal}
            schoolId={selectedId}
            classes={detailClasses}
            onClose={() => setShowAddStudentModal(false)}
            onSuccess={refreshDetail}
          />
        </>
      )}
    </div>
  );
}

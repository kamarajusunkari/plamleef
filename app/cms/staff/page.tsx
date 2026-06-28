"use client";
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users, Plus, Shield, Edit3, Mail, Loader2, Search,
  Clock, CheckCircle, X, Eye, EyeOff, Trash2, AlertCircle,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "CMS_ADMIN" | "CMS_STAFF";
  created_at: string;
  uploadCount: number;
  pendingCount: number;
  approvedCount: number;
}

// ─── AddStaffModal (MODULE-LEVEL) ─────────────────────────────────────────────

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (member: StaffMember) => void;
}

function AddStaffModal({ isOpen, onClose, onCreated }: AddStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"CMS_STAFF" | "CMS_ADMIN">("CMS_STAFF");
  const [password, setPassword] = useState("EduBattle@2025");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName(""); setEmail(""); setRole("CMS_STAFF");
    setPassword("EduBattle@2025"); setErrors({}); setShowPass(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim() || !email.includes("@")) errs.email = "Valid email required";
    if (password.length < 8) errs.password = "Min 8 characters";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), role, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create account");

      toast.success(`${role === "CMS_ADMIN" ? "Admin" : "Staff"} account created!`);
      onCreated({
        id: json.userId,
        name: name.trim(),
        email: email.trim(),
        role,
        created_at: new Date().toISOString(),
        uploadCount: 0,
        pendingCount: 0,
        approvedCount: 0,
      });
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-[#1A2035]">Add Staff Account</h2>
            <p className="text-xs text-[#7A869A] mt-0.5">Create a CMS team member account</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[#F0F4FA] text-[#7A869A]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Full Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.name ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
            />
            {errors.name && <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@edubattle.in"
              type="email"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.email ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
            />
            {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-2 block">Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "CMS_STAFF",  label: "Content Staff", desc: "Upload & submit for review", color: "#8B5CF6" },
                { value: "CMS_ADMIN",  label: "Super Admin",   desc: "Full access + can review",   color: "#FF6B35" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all`}
                  style={{ borderColor: role === opt.value ? opt.color : "#E8EDF5" }}
                >
                  <div className="text-xs font-bold mb-0.5" style={{ color: opt.color }}>{opt.label}</div>
                  <div className="text-[10px] text-[#7A869A]">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Password *</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPass ? "text" : "password"}
                className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.password ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A]">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password}</p>}
            <p className="text-[10px] text-[#7A869A] mt-1">Share this password with the staff member to log in.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-[#7A869A] hover:text-[#1A2035] rounded-xl hover:bg-[#F0F4FA] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#E55A28] disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal (MODULE-LEVEL) ────────────────────────────────────────

interface DeleteConfirmProps {
  member: StaffMember | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteConfirmModal({ member, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);

  if (!member) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cms-staff?userId=${member.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`${member.name} removed`);
      onDeleted(member.id);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FEE2E2] rounded-xl flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-[#EF4444]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1A2035]">Remove Staff Account</h2>
            <p className="text-xs text-[#7A869A]">{member.name}</p>
          </div>
        </div>
        <p className="text-xs text-[#7A869A] mb-5">
          This will permanently remove <strong>{member.name}</strong>. Their uploaded content will remain but the account will be deleted.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7A869A] rounded-xl hover:bg-[#F0F4FA]">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] text-white text-sm font-semibold rounded-xl hover:bg-[#DC2626] disabled:opacity-60"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StaffCard (MODULE-LEVEL) ─────────────────────────────────────────────────

interface StaffCardProps {
  member: StaffMember;
  onDelete: (member: StaffMember) => void;
}

function StaffCard({ member, onDelete }: StaffCardProps) {
  const isAdmin = member.role === "CMS_ADMIN";
  const approvalRate = member.uploadCount > 0
    ? Math.round((member.approvedCount / member.uploadCount) * 100)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: isAdmin ? "#FF6B35" : "#8B5CF6" }}>
            {member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A2035]">{member.name}</p>
            <p className="text-[11px] text-[#7A869A] flex items-center gap-1"><Mail size={10} />{member.email}</p>
          </div>
        </div>
        <button onClick={() => onDelete(member)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#C5D0E0] hover:text-[#EF4444] transition-all">
          <Trash2 size={13} />
        </button>
      </div>

      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full mb-4"
        style={{ background: isAdmin ? "#FFF7F4" : "#F5F3FF", color: isAdmin ? "#FF6B35" : "#8B5CF6" }}>
        {isAdmin ? <Shield size={10} /> : <Edit3 size={10} />}
        {isAdmin ? "Super Admin" : "Content Staff"}
      </span>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-[#F8FAFC] rounded-xl">
          <p className="text-sm font-bold text-[#1A2035]">{member.uploadCount}</p>
          <p className="text-[10px] text-[#7A869A]">Total</p>
        </div>
        <div className="text-center p-2 bg-[#FFFBEB] rounded-xl">
          <p className="text-sm font-bold text-[#F59E0B]">{member.pendingCount}</p>
          <p className="text-[10px] text-[#7A869A]">Pending</p>
        </div>
        <div className="text-center p-2 bg-[#ECFDF5] rounded-xl">
          <p className="text-sm font-bold text-[#10B981]">{member.approvedCount}</p>
          <p className="text-[10px] text-[#7A869A]">Approved</p>
        </div>
      </div>

      {approvalRate !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
            <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${approvalRate}%` }} />
          </div>
          <span className="text-[10px] text-[#7A869A]">{approvalRate}% approved</span>
        </div>
      )}

      <p className="text-[10px] text-[#C5D0E0] mt-2">
        Joined {new Date(member.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CmsStaffPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "CMS_ADMIN" | "CMS_STAFF">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const isAdmin = user?.role === "CMS_ADMIN";

  // Redirect non-admins away
  useEffect(() => {
    if (!userLoading && user && !isAdmin) {
      router.replace("/cms/dashboard");
    }
  }, [userLoading, user, isAdmin, router]);

  // Load staff via API (uses service role key server-side)
  const loadStaff = useCallback(async () => {
    if (userLoading || !user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cms-staff");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load staff");
      setStaff(json.staff ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [userLoading, user, isAdmin]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const filtered = staff.filter((m) => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (search && !`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPending = staff.reduce((s, m) => s + m.pendingCount, 0);

  // Show loading spinner until we know who the user is
  if (userLoading || (user && !isAdmin && userLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  // Non-admin — show nothing while redirect fires
  if (!userLoading && user && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Staff Accounts</h1>
          <p className="text-sm text-[#7A869A]">Manage CMS admins and content staff</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors"
        >
          <Plus size={15} /> Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Staff",    value: staff.length,                                       icon: <Users size={18} />,   bg: "#EFF6FF", color: "#3B82F6" },
          { label: "Admins",         value: staff.filter(m => m.role === "CMS_ADMIN").length,   icon: <Shield size={18} />,  bg: "#FFF7F4", color: "#FF6B35" },
          { label: "Content Staff",  value: staff.filter(m => m.role === "CMS_STAFF").length,   icon: <Edit3 size={18} />,   bg: "#F5F3FF", color: "#8B5CF6" },
          { label: "Pending Review", value: totalPending,                                        icon: <Clock size={18} />,   bg: "#FFFBEB", color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
            <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl">
          {(["all", "CMS_ADMIN", "CMS_STAFF"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === f ? "bg-white text-[#1A2035] shadow-sm" : "text-[#7A869A] hover:text-[#1A2035]"}`}
            >
              {f === "all" ? "All" : f === "CMS_ADMIN" ? "Admins" : "Staff"}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5D0E0]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8 pr-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] w-64"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl">
          <AlertCircle size={16} className="text-[#EF4444] shrink-0" />
          <p className="text-sm text-[#991B1B]">{error}</p>
          <button onClick={loadStaff} className="ml-auto text-xs text-[#EF4444] hover:underline">Retry</button>
        </div>
      )}

      {/* List table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Users size={36} className="text-[#C5D0E0] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1A2035] mb-1">
            {search || roleFilter !== "all" ? "No matches found" : "No staff accounts yet"}
          </p>
          <p className="text-xs text-[#7A869A] mb-4">
            {search || roleFilter !== "all" ? "Try adjusting your filters" : "Add your first team member to get started"}
          </p>
          {!(search || roleFilter !== "all") && (
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#E55A28]">
              Add First Staff Member
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table view */}
          <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8EDF5] bg-[#F8FAFC] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#1A2035]">Team Overview</h3>
              <span className="text-[10px] text-[#7A869A]">
                {staff.reduce((s, m) => s + m.uploadCount, 0)} total uploads ·{" "}
                {staff.reduce((s, m) => s + m.approvedCount, 0)} approved
              </span>
            </div>
            <div className="divide-y divide-[#F0F4FA]">
              {filtered.map((m) => {
                const rate = m.uploadCount > 0 ? Math.round((m.approvedCount / m.uploadCount) * 100) : null;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: m.role === "CMS_ADMIN" ? "#FF6B35" : "#8B5CF6" }}>
                      {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A2035] truncate">{m.name}</p>
                      <p className="text-[11px] text-[#7A869A] truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: m.role === "CMS_ADMIN" ? "#FFF7F4" : "#F5F3FF", color: m.role === "CMS_ADMIN" ? "#FF6B35" : "#8B5CF6" }}>
                      {m.role === "CMS_ADMIN" ? "Admin" : "Staff"}
                    </span>
                    <div className="flex items-center gap-5 shrink-0 text-center">
                      <div>
                        <p className="text-sm font-bold text-[#1A2035]">{m.uploadCount}</p>
                        <p className="text-[10px] text-[#7A869A]">Total</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#F59E0B]">{m.pendingCount}</p>
                        <p className="text-[10px] text-[#7A869A]">Pending</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#10B981]">{m.approvedCount}</p>
                        <p className="text-[10px] text-[#7A869A]">Approved</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <div className="flex-1 h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: rate !== null ? `${rate}%` : "0%" }} />
                      </div>
                      <span className="text-[10px] text-[#7A869A] w-8 shrink-0">{rate !== null ? `${rate}%` : "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[#C5D0E0] flex items-center gap-1">
                        {m.approvedCount > 0 ? <CheckCircle size={11} className="text-[#10B981]" /> : null}
                      </span>
                      <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#C5D0E0] hover:text-[#EF4444] transition-colors" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((m) => (
              <StaffCard key={m.id} member={m} onDelete={setDeleteTarget} />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={(m) => setStaff((prev) => [m, ...prev])}
      />
      <DeleteConfirmModal
        member={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => setStaff((prev) => prev.filter((m) => m.id !== id))}
      />
    </div>
  );
}

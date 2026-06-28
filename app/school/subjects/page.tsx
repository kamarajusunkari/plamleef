"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Modal } from "@/components/school/Modal";

interface Subject {
  id: string;
  name: string;
  created_at: string;
  classCount?: number;
}

const SUBJECT_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EC4899", "#FF6B35", "#06B6D4", "#EF4444",
];

export default function SubjectsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal]  = useState(false);
  const [newName, setNewName]            = useState("");
  const [nameError, setNameError]        = useState("");
  const [adding, setAdding]              = useState(false);
  const [deletingId, setDeletingId]      = useState<string | null>(null);

  const loadSubjects = async (schoolId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("subjects")
      .select("id, name, created_at")
      .eq("school_id", schoolId)
      .order("name");

    const rows = (data as Subject[]) ?? [];

    // Count classes per subject
    const withCounts = await Promise.all(
      rows.map(async (s) => {
        const { count } = await supabase
          .from("class_subjects")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("subject_id", s.id);
        return { ...s, classCount: count ?? 0 };
      })
    );

    setSubjects(withCounts);
  };

  useEffect(() => {
    if (userLoading || !user?.schoolId) return;
    (async () => {
      setLoading(true);
      await loadSubjects(user.schoolId!);
      setLoading(false);
    })();
  }, [user, userLoading]);

  const handleAdd = async () => {
    if (!newName.trim()) { setNameError("Required"); return; }
    if (!user?.schoolId) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subjects")
      .insert({ name: newName.trim(), school_id: user.schoolId })
      .select("id, name, created_at")
      .single();

    if (error) {
      toast.error("Failed to add subject");
    } else {
      toast.success(`${newName.trim()} added`);
      setSubjects((prev) => [...prev, { ...(data as Subject), classCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
      setNewName("");
      setNameError("");
    }
    setAdding(false);
  };

  const handleDelete = async (s: Subject) => {
    if ((s.classCount ?? 0) > 0) {
      toast.error(`Cannot delete — used in ${s.classCount} class${s.classCount === 1 ? "" : "es"}`);
      return;
    }
    if (!confirm(`Delete "${s.name}"?`)) return;
    setDeletingId(s.id);
    const supabase = createClient();
    const { error } = await supabase.from("subjects").delete().eq("id", s.id);
    if (error) {
      toast.error("Failed to delete subject");
    } else {
      toast.success(`${s.name} deleted`);
      setSubjects((prev) => prev.filter((sub) => sub.id !== s.id));
    }
    setDeletingId(null);
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Subjects"
        subtitle={`${subjects.length} subject${subjects.length === 1 ? "" : "s"} configured`}
        actions={<Button variant="primary" onClick={() => setShowAddModal(true)}>+ Add Subject</Button>}
      />

      {subjects.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm text-[#7A869A] mb-4">No subjects yet. Add your first subject.</div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>Add Subject</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((s, idx) => {
            const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
            return (
              <Card key={s.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A2035] truncate">{s.name}</div>
                    <div className="text-xs text-[#7A869A]">
                      {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                    Used in {s.classCount ?? 0} class{s.classCount === 1 ? "" : "es"}
                  </span>
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                    className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#7A869A] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setNewName(""); setNameError(""); }} title="Add Subject">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Subject Name *</label>
            <input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Physical Education"
              autoFocus
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${
                nameError ? "border-[#EF4444]" : "border-[#E8EDF5]"
              }`}
            />
            {nameError && <p className="text-xs text-[#EF4444] mt-1">{nameError}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => { setShowAddModal(false); setNewName(""); setNameError(""); }}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={adding}>
              {adding ? "Adding…" : "Add Subject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Modal } from "@/components/school/Modal";
import { FilterPills } from "@/components/school/FilterPills";
import { AnnouncementCard } from "@/components/school/AnnouncementCard";

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  isPinned: boolean;
  targetClassId: string | null;
  targetClassName: string | null;
  createdAt: string;
  expiresAt: string | null;
  createdBy: string;
}

function AnnouncementsContent() {
  const { user, loading: userLoading } = useCurrentUser();
  const searchParams = useSearchParams();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    audience: "ALL",
    isPinned: false,
    expiresAt: "",
  });
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  useEffect(() => {
    if (searchParams.get("modal") === "create") setShowModal(true);
  }, [searchParams]);

  useEffect(() => {
    if (!user?.schoolId) return;
    fetchAnnouncements();
  }, [user?.schoolId]);

  async function fetchAnnouncements() {
    setLoadingData(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, audience, is_pinned, expires_at, created_at, users:created_by(name)")
      .eq("school_id", user!.schoolId!)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: Announcement[] = data.map((a: any) => {
        const creatorObj = a.users ? (Array.isArray(a.users) ? a.users[0] : a.users) : null;
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          audience: a.audience,
          isPinned: a.is_pinned ?? false,
          targetClassId: null,
          targetClassName: null,
          createdAt: a.created_at,
          expiresAt: a.expires_at ?? null,
          createdBy: creatorObj?.name ?? "Unknown",
        };
      });
      setAnnouncements(mapped);
    }
    setLoadingData(false);
  }

  const openCreate = () => {
    setEditingAnn(null);
    setForm({ title: "", content: "", audience: "ALL", isPinned: false, expiresAt: "" });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setForm({
      title: ann.title,
      content: ann.content,
      audience: ann.audience,
      isPinned: ann.isPinned,
      expiresAt: ann.expiresAt || "",
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const errs: { title?: string; content?: string } = {};
    if (!form.title.trim()) errs.title = "Required";
    if (!form.content.trim()) errs.content = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!user?.schoolId) return;

    setSubmitting(true);
    const supabase = createClient();

    if (editingAnn) {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: form.title,
          content: form.content,
          audience: form.audience,
          is_pinned: form.isPinned,
          expires_at: form.expiresAt || null,
        })
        .eq("id", editingAnn.id);

      if (error) {
        toast.error("Failed to update announcement");
      } else {
        toast.success("Announcement updated");
        await fetchAnnouncements();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase
        .from("announcements")
        .insert({
          school_id: user.schoolId,
          created_by: user.id,
          title: form.title,
          content: form.content,
          audience: form.audience,
          is_pinned: form.isPinned,
          expires_at: form.expiresAt || null,
        });

      if (error) {
        toast.error("Failed to publish announcement");
      } else {
        toast.success("Announcement published");
        await fetchAnnouncements();
        setShowModal(false);
      }
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete announcement");
    } else {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    }
  };

  const handleTogglePin = async (id: string) => {
    const ann = announcements.find((a) => a.id === id);
    if (!ann) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("announcements")
      .update({ is_pinned: !ann.isPinned })
      .eq("id", id);
    if (!error) {
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
    }
  };

  const isLoading = userLoading || loadingData;

  const filtered = announcements.filter((a) => {
    if (audienceFilter === "all") return true;
    if (audienceFilter === "pinned") return a.isPinned;
    return a.audience === audienceFilter.toUpperCase();
  });

  const pinned = filtered.filter((a) => a.isPinned);
  const unpinned = filtered.filter((a) => !a.isPinned);

  const audienceOptions = [
    { label: "All", value: "all" },
    { label: "Students", value: "students" },
    { label: "Teachers", value: "teachers" },
    { label: "Pinned", value: "pinned" },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Announcements"
        subtitle={`${announcements.length} announcements · ${announcements.filter((a) => a.isPinned).length} pinned`}
        actions={<Button variant="primary" onClick={openCreate}>+ Create Announcement</Button>}
      />

      <div className="mb-5">
        <FilterPills options={audienceOptions} value={audienceFilter} onChange={setAudienceFilter} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-[#7A869A] uppercase mb-3">📌 Pinned</div>
              <div className="space-y-3">
                {pinned.map((ann) => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div className="space-y-3">
              {unpinned.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <Card className="text-center py-12">
              <div className="text-4xl mb-2">📢</div>
              <div className="text-sm text-[#7A869A]">
                {announcements.length === 0 ? "No announcements yet" : "No announcements match your filters"}
              </div>
              {announcements.length === 0 && (
                <Button variant="primary" size="sm" className="mt-3" onClick={openCreate}>Create First Announcement</Button>
              )}
            </Card>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAnn ? "Edit Announcement" : "Create Announcement"} size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] ${errors.title ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
            />
            {errors.title && <p className="text-xs text-[#EF4444] mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement..."
              rows={4}
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#FF6B35] resize-none ${errors.content ? "border-[#EF4444]" : "border-[#E8EDF5]"}`}
            />
            {errors.content && <p className="text-xs text-[#EF4444] mt-1">{errors.content}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-2 block">Audience</label>
            <div className="flex gap-2">
              {["ALL", "STUDENTS", "TEACHERS", "PARENTS"].map((a) => (
                <button
                  key={a}
                  onClick={() => setForm((f) => ({ ...f, audience: a }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.audience === a ? "bg-[#FF6B35] text-white" : "border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"}`}
                >
                  {a.charAt(0) + a.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`w-10 h-5 rounded-full transition-colors relative ${form.isPinned ? "bg-[#FF6B35]" : "bg-[#E8EDF5]"}`}
                onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPinned ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-[#1A2035]">Pin to top</span>
            </label>

            <div className="flex-1">
              <label className="text-xs font-medium text-[#1A2035] mb-1 block">Expires At (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingAnn ? "Save Changes" : "Publish →"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AnnouncementsPage() {
  return <Suspense><AnnouncementsContent /></Suspense>;
}

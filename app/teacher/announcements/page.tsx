"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/school/Card";
import { FilterPills } from "@/components/school/FilterPills";

interface Announcement {
  id: string; title: string; content: string;
  audience: string; createdAt: string;
}

export default function TeacherAnnouncements() {
  const { user, loading: userLoading } = useCurrentUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user?.schoolId) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, audience, created_at")
        .eq("school_id", user.schoolId)
        .order("created_at", { ascending: false });
      const mapped = (data ?? []).map((a: any) => ({
        id: a.id, title: a.title, content: a.content,
        audience: Array.isArray(a.audience) ? a.audience[0] : a.audience,
        createdAt: a.created_at,
      }));
      setAnnouncements(mapped);
      setLoading(false);
    })();
  }, [user?.schoolId]);

  const filtered = filter === "all"
    ? announcements
    : announcements.filter(a => a.audience === "ALL" || a.audience === filter.toUpperCase());

  const filterOptions = [
    { label: "All", value: "all" },
    { label: "Teachers", value: "teachers" },
  ];

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/teacher/dashboard" className="w-8 h-8 rounded-xl bg-[#F0F4FA] flex items-center justify-center hover:bg-[#E8EDF5] transition-colors">
          <ArrowLeft size={16} className="text-[#7A869A]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Announcements</h1>
          <p className="text-sm text-[#7A869A]">{announcements.length} announcements</p>
        </div>
      </div>

      <div className="mb-5">
        <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {announcements.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-2">📢</div>
          <div className="text-sm text-[#7A869A]">No announcements yet</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => (
            <div key={ann.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#1A2035]">{ann.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#EFF6FF] text-[#3B82F6]">
                      {ann.audience === "ALL" ? "Everyone" : ann.audience.charAt(0) + ann.audience.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A869A] mb-2 whitespace-pre-wrap">{ann.content}</p>
                  <div className="text-[10px] text-[#94A3B8]">
                    {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

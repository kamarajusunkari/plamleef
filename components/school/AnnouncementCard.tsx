"use client";
import React from "react";
import { Pin, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit: (ann: Announcement) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const audienceMap: Record<string, { label: string; className: string }> = {
  ALL: { label: "All", className: "bg-[#EFF6FF] text-[#3B82F6]" },
  STUDENTS: { label: "Students", className: "bg-[#ECFDF5] text-[#10B981]" },
  TEACHERS: { label: "Teachers", className: "bg-[#F5F3FF] text-[#8B5CF6]" },
  PARENTS: { label: "Parents", className: "bg-[#FFFBEB] text-[#F59E0B]" },
};

export function AnnouncementCard({
  announcement: ann,
  onEdit,
  onDelete,
  onTogglePin,
}: AnnouncementCardProps) {
  const audienceInfo = audienceMap[ann.audience] || audienceMap.ALL;
  const isExpired = ann.expiresAt ? new Date(ann.expiresAt) < new Date("2026-03-22") : false;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        ann.isPinned
          ? "bg-[#FFF7F4] border-[#FF6B35] border-l-4"
          : "bg-white border-[#E8EDF5]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${audienceInfo.className}`}>
            {audienceInfo.label}
          </span>
          {ann.targetClassName && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF7F4] text-[#FF6B35]">
              {ann.targetClassName}
            </span>
          )}
        </div>
        {ann.isPinned && <Pin size={14} className="text-[#FF6B35] shrink-0" />}
      </div>

      <h3 className="text-sm font-semibold text-[#1A2035] mb-1.5">{ann.title}</h3>
      <p className="text-xs text-[#7A869A] line-clamp-3 mb-3">{ann.content}</p>

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-[#7A869A]">
          By {ann.createdBy} · {ann.createdAt}
          {ann.expiresAt && (
            <span className={`ml-2 ${isExpired ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
              · {isExpired ? "Expired" : `Expires ${ann.expiresAt}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTogglePin(ann.id)}
            className="p-1.5 rounded-lg hover:bg-[#F0F4FA] text-[#7A869A] transition-colors"
            title={ann.isPinned ? "Unpin" : "Pin"}
          >
            <Pin size={13} />
          </button>
          <button
            onClick={() => onEdit(ann)}
            className="p-1.5 rounded-lg hover:bg-[#F0F4FA] text-[#7A869A] transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${ann.title}"?`)) onDelete(ann.id);
            }}
            className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#7A869A] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

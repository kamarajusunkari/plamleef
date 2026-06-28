"use client";
import React from "react";
import { Avatar } from "./Avatar";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRowProps {
  studentId: string;
  name: string;
  initials: string;
  color: string;
  rollNo?: string;
  status: AttendanceStatus;
  note: string;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
}

const STATUS_BUTTONS: { key: AttendanceStatus; label: string; active: string; inactive: string }[] = [
  { key: "present", label: "P", active: "bg-[#ECFDF5] text-[#10B981] border-[#10B981]", inactive: "bg-[#F1F5F9] text-[#94A3B8] border-transparent" },
  { key: "absent", label: "A", active: "bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]", inactive: "bg-[#F1F5F9] text-[#94A3B8] border-transparent" },
  { key: "late", label: "L", active: "bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]", inactive: "bg-[#F1F5F9] text-[#94A3B8] border-transparent" },
  { key: "excused", label: "E", active: "bg-[#F1F5F9] text-[#64748B] border-[#64748B]", inactive: "bg-[#F1F5F9] text-[#94A3B8] border-transparent" },
];

export function AttendanceRow({
  studentId,
  name,
  initials,
  color,
  rollNo,
  status,
  note,
  onStatusChange,
  onNoteChange,
}: AttendanceRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#F0F4FA] last:border-0">
      <Avatar initials={initials} color={color} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1A2035] truncate">{name}</div>
        {rollNo && <div className="text-xs text-[#7A869A]">{rollNo}</div>}
      </div>
      <div className="flex items-center gap-1">
        {STATUS_BUTTONS.map((btn) => (
          <button
            key={btn.key}
            onClick={() => onStatusChange(studentId, btn.key)}
            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all duration-150 ${
              status === btn.key ? btn.active : btn.inactive
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => onNoteChange(studentId, e.target.value)}
        placeholder="Note..."
        className="w-24 px-2 py-1 text-xs border border-[#E8EDF5] rounded-lg focus:outline-none focus:border-[#FF6B35] text-[#1A2035] placeholder-[#7A869A]"
      />
    </div>
  );
}

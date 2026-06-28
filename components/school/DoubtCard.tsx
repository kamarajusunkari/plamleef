"use client";
import React from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Doubt {
  id: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentColor: string;
  className: string;
  teacherName: string;
  subject: string;
  topic: string;
  content: string;
  answer: string | null;
  status: string;
  createdAt: string;
  answeredAt: string | null;
}

interface DoubtCardProps {
  doubt: Doubt;
}

export function DoubtCard({ doubt }: DoubtCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials={doubt.studentInitials} color={doubt.studentColor} size={36} />
          <div>
            <Link
              href={`/school/students/${doubt.studentId}`}
              className="text-sm font-semibold text-[#1A2035] hover:text-[#FF6B35] transition-colors"
            >
              {doubt.studentName}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">{doubt.className}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{doubt.subject}</span>
              <span className="text-[10px] text-[#7A869A]">{doubt.topic}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {doubt.status === "OPEN" ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFFBEB] text-[#F59E0B] text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              Open
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] text-[10px] font-semibold">
              <CheckCircle size={10} />
              Answered
            </span>
          )}
          <span className="text-[10px] text-[#7A869A] flex items-center gap-1">
            <Clock size={10} />
            {new Date(doubt.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="bg-[#F8FAFC] rounded-xl p-3 mb-3">
        <p className="text-xs text-[#1A2035]">{doubt.content}</p>
      </div>

      {doubt.status === "ANSWERED" && doubt.answer ? (
        <div className="bg-[#F0FDF4] rounded-xl p-3 border border-[#D1FAE5]">
          <div className="text-[10px] text-[#10B981] font-semibold mb-1">
            Teacher answered · {doubt.answeredAt && new Date(doubt.answeredAt).toLocaleDateString("en-IN")}
          </div>
          <p className="text-xs text-[#1A2035]">{doubt.answer}</p>
          <button
            onClick={() => toast.success("Thanks recorded!")}
            className="mt-2 text-[10px] text-[#7A869A] hover:text-[#10B981] transition-colors"
          >
            👍 This helped
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#F59E0B] bg-[#FFFBEB] px-2 py-1 rounded-lg">
            Waiting for teacher&apos;s answer — Sent to: {doubt.teacherName}
          </span>
        </div>
      )}
    </div>
  );
}

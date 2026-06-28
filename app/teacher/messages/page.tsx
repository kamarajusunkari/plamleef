"use client";
import React from "react";
import { MessageCircle } from "lucide-react";

export default function TeacherMessagesPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Parent Messages</h1>
        <p className="text-sm text-[#7A869A]">Direct messaging with parents</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF5] min-h-[500px] flex items-center justify-center">
        <div className="text-center py-16">
          <MessageCircle size={48} className="text-[#E8EDF5] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1A2035] mb-2">Messages coming soon</h2>
          <p className="text-sm text-[#7A869A]">Direct parent-teacher messaging will be available in the next update.</p>
        </div>
      </div>
    </div>
  );
}

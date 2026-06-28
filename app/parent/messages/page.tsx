"use client";
import React from "react";
import { MessageCircle } from "lucide-react";

export default function ParentMessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
      <MessageCircle size={48} className="text-[#E8EDF5] mx-auto mb-4" />
      <h2 className="text-lg font-bold text-[#1A2035] mb-2">Messages coming soon</h2>
      <p className="text-sm text-[#7A869A] text-center max-w-sm">
        Direct parent-teacher messaging will be available in the next update.
      </p>
    </div>
  );
}

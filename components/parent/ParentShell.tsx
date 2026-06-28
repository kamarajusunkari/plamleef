"use client";
import React, { useState } from "react";
import { ParentSidebar } from "@/components/parent/Sidebar";
import { ParentHeader } from "@/components/parent/Header";
import { Toaster } from "react-hot-toast";

export default function ParentShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <ParentSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ParentHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: "12px", fontFamily: "var(--font-dm-sans)" } }} />
    </div>
  );
}

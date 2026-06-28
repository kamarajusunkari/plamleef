"use client";
import React, { useState } from "react";
import { CmsSidebar } from "@/components/cms/Sidebar";
import { CmsHeader } from "@/components/cms/Header";
import { Toaster } from "react-hot-toast";

export default function CmsShell({ children, userRole }: { children: React.ReactNode; userRole: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <CmsSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CmsHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: "12px", fontFamily: "var(--font-dm-sans)" } }} />
    </div>
  );
}

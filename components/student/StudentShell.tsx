"use client";
import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { StudentSidebar } from "@/components/student/Sidebar";
import { StudentHeader } from "@/components/student/Header";

export default function StudentShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <StudentSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudentHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          success: { duration: 3000, style: { background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" } },
          error: { duration: 4000, style: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" } },
        }}
      />
    </div>
  );
}

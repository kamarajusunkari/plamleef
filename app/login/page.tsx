"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const ROLE_PORTAL: Record<string, string> = {
  STUDENT:   "/student/dashboard",
  TEACHER:   "/teacher/dashboard",
  SCHOOL:    "/school/dashboard",
  PARENT:    "/parent/dashboard",
  CMS_ADMIN: "/cms/dashboard",
  CMS_STAFF: "/cms/dashboard",
};

// Roles where demo credentials are placeholder-only (account not in DB)
const DEMO_ONLY_IDS = new Set<string>();

const ROLES = [
  {
    id: "school",
    label: "School Admin",
    emoji: "🏫",
    color: "#FF6B35",
    bg: "#FFF7F4",
    border: "#FFD4C2",
    description: "Manage your institution",
    demo: { email: "admin@dps-vjw.edu.in", password: "Admin@123" },
    redirect: "/school/dashboard",
  },
  {
    id: "teacher",
    label: "Teacher",
    emoji: "👩‍🏫",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    description: "Create quizzes & track students",
    demo: { email: "kumari.maths@dps-vjw.edu.in", password: "Teacher@123" },
    redirect: "/teacher/dashboard",
  },
  {
    id: "student",
    label: "Student",
    emoji: "🎓",
    color: "#3B82F6",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    description: "Learn, compete & earn XP",
    demo: { email: "priya.nair@student.dps-vjw.edu.in", password: "Student@123" },
    redirect: "/student/dashboard",
  },
  {
    id: "parent",
    label: "Parent",
    emoji: "👨‍👩‍👧",
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    description: "Monitor your child's progress",
    demo: { email: "suresh.nair@gmail.com", password: "Parent@123" },
    redirect: "/parent/dashboard",
  },
  {
    id: "cms",
    label: "CMS Admin",
    emoji: "⚙️",
    color: "#0A1628",
    bg: "#F8FAFC",
    border: "#CBD5E1",
    description: "Manage content & schools",
    demo: { email: "vikram@edubattle.in", password: "CMS@123" },
    redirect: "/cms/dashboard",
  },
];

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  school: (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      <rect x="60" y="100" width="160" height="130" rx="4" fill="#1e3a5f" />
      <polygon points="60,100 140,40 220,100" fill="#FF6B35" />
      <rect x="90" y="140" width="30" height="30" rx="2" fill="#7dd3fc" />
      <rect x="130" y="140" width="30" height="30" rx="2" fill="#7dd3fc" />
      <rect x="170" y="140" width="30" height="30" rx="2" fill="#7dd3fc" />
      <rect x="115" y="185" width="50" height="45" rx="2" fill="#FFB347" />
      <rect x="125" y="195" width="12" height="12" rx="1" fill="#1e3a5f" />
      <rect x="143" y="195" width="12" height="12" rx="1" fill="#1e3a5f" />
      <circle cx="140" cy="40" r="8" fill="#FFB347" />
      <rect x="136" y="20" width="8" height="20" rx="2" fill="#FF6B35" />
      <rect x="80" y="60" width="6" height="40" rx="1" fill="#94a3b8" />
      <rect x="194" y="60" width="6" height="40" rx="1" fill="#94a3b8" />
    </svg>
  ),
  teacher: (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      <rect x="40" y="80" width="200" height="140" rx="8" fill="#1e3a5f" />
      <rect x="55" y="95" width="170" height="110" rx="4" fill="#0f172a" />
      <line x1="55" y1="130" x2="225" y2="130" stroke="#334155" strokeWidth="1" />
      <rect x="70" y="105" width="60" height="8" rx="2" fill="#8B5CF6" />
      <rect x="70" y="118" width="40" height="6" rx="2" fill="#475569" />
      <rect x="70" y="140" width="140" height="4" rx="2" fill="#334155" />
      <rect x="70" y="150" width="100" height="4" rx="2" fill="#334155" />
      <rect x="70" y="160" width="120" height="4" rx="2" fill="#334155" />
      <circle cx="180" cy="65" r="25" fill="#fde68a" />
      <circle cx="180" cy="58" r="10" fill="#f59e0b" />
      <path d="M160 65 Q180 85 200 65" fill="#fde68a" />
      <rect x="155" y="65" width="50" height="20" rx="4" fill="#f59e0b" />
    </svg>
  ),
  student: (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      <circle cx="140" cy="90" r="35" fill="#fde68a" />
      <circle cx="140" cy="78" r="18" fill="#f59e0b" />
      <rect x="105" y="90" width="70" height="40" rx="8" fill="#3B82F6" />
      <path d="M80 220 L105 130 L175 130 L200 220" fill="#2563eb" />
      <polygon points="100,68 140,50 180,68 140,80" fill="#0A1628" />
      <rect x="125" y="130" width="30" height="40" rx="4" fill="#93c5fd" />
      <circle cx="200" cy="120" r="20" fill="#FFB347" opacity="0.9" />
      <text x="193" y="126" fontSize="16" fill="white">⭐</text>
      <circle cx="80" cy="140" r="16" fill="#10B981" opacity="0.9" />
      <text x="73" y="146" fontSize="12" fill="white">XP</text>
    </svg>
  ),
  parent: (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      <circle cx="100" cy="80" r="28" fill="#fde68a" />
      <circle cx="100" cy="68" r="14" fill="#f59e0b" />
      <rect x="72" y="80" width="56" height="35" rx="8" fill="#10B981" />
      <circle cx="175" cy="90" r="22" fill="#fed7aa" />
      <circle cx="175" cy="80" r="11" fill="#fb923c" />
      <rect x="153" y="90" width="44" height="28" rx="6" fill="#3B82F6" />
      <circle cx="140" cy="175" r="20" fill="#fde68a" />
      <circle cx="140" cy="165" r="10" fill="#f59e0b" />
      <rect x="120" y="175" width="40" height="30" rx="5" fill="#FF6B35" />
      <path d="M60 200 Q140 160 220 200" stroke="#e2e8f0" strokeWidth="3" fill="none" />
      <circle cx="60" cy="200" r="5" fill="#10B981" />
      <circle cx="140" cy="160" r="5" fill="#FF6B35" />
      <circle cx="220" cy="200" r="5" fill="#3B82F6" />
    </svg>
  ),
  cms: (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      <rect x="50" y="60" width="180" height="160" rx="12" fill="#0f172a" />
      <rect x="65" y="75" width="150" height="130" rx="6" fill="#1e293b" />
      <rect x="75" y="85" width="130" height="15" rx="3" fill="#0A1628" />
      <rect x="80" y="88" width="40" height="8" rx="2" fill="#FF6B35" />
      <rect x="75" y="108" width="60" height="30" rx="4" fill="#1e3a5f" />
      <rect x="80" y="113" width="45" height="4" rx="2" fill="#3B82F6" />
      <rect x="80" y="121" width="30" height="4" rx="2" fill="#475569" />
      <rect x="143" y="108" width="62" height="30" rx="4" fill="#1e3a5f" />
      <rect x="148" y="113" width="47" height="4" rx="2" fill="#10B981" />
      <rect x="148" y="121" width="32" height="4" rx="2" fill="#475569" />
      <rect x="75" y="147" width="130" height="30" rx="4" fill="#1e3a5f" />
      <rect x="80" y="152" width="50" height="4" rx="2" fill="#8B5CF6" />
      <rect x="80" y="160" width="80" height="4" rx="2" fill="#475569" />
      <circle cx="210" cy="65" r="18" fill="#FF6B35" />
      <text x="204" y="71" fontSize="14" fill="white">✓</text>
    </svg>
  ),
};

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

  const fillDemo = () => {
    setValue("email", selectedRole.demo.email);
    setValue("password", selectedRole.demo.password);
    toast.success("Demo credentials filled!", { duration: 2000 });
  };

  const onSubmit = async (data: FormData) => {
    // Demo-only accounts: show friendly toast instead of attempting auth
    if (DEMO_ONLY_IDS.has(selectedRole.id)) {
      toast("This is a demo account placeholder — not yet in the database.", {
        icon: "ℹ️",
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Fetch role from public.users to redirect to correct portal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const portal = profile?.role ? ROLE_PORTAL[profile.role] : selectedRole.redirect;
        toast.success(`Welcome back! Redirecting...`);
        router.push(portal ?? selectedRole.redirect);
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Toaster position="top-right" toastOptions={{ success: { duration: 3000 }, error: { duration: 4000 } }} />

      {/* Left Panel */}
      <div className="hidden lg:flex w-[55%] bg-[#0A1628] flex-col relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #FF6B35, transparent)" }} />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />

        <div className="relative z-10 p-10 flex-1 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">EduBattle</div>
              <div className="text-[#7A869A] text-xs">India&apos;s Competitive Learning Platform</div>
            </div>
          </div>

          {/* Role illustration */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-56 h-56 mb-8 transition-all duration-500" key={selectedRole.id}>
              {ILLUSTRATIONS[selectedRole.id]}
            </div>
            <div className="text-center mb-8">
              <div className="text-white text-2xl font-bold mb-2">{selectedRole.label} Portal</div>
              <div className="text-[#7A869A] text-sm">{selectedRole.description}</div>
            </div>
          </div>

          {/* Role selector pills */}
          <div className="flex flex-wrap gap-2 justify-center pb-4">
            {ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  background: selectedRole.id === role.id ? role.color : "rgba(255,255,255,0.08)",
                  color: selectedRole.id === role.id ? "white" : "#94A3B8",
                  border: `1px solid ${selectedRole.id === role.id ? role.color : "transparent"}`,
                }}
              >
                <span>{role.emoji}</span>
                <span>{role.label}</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            {[
              { value: "143+", label: "Schools" },
              { value: "28K+", label: "Students" },
              { value: "184K+", label: "Quizzes Played" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-white font-bold text-lg">{stat.value}</div>
                <div className="text-[#7A869A] text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F0F4FA] p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-[#0A1628] font-bold text-lg">EduBattle</span>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-card">
            <h1 className="text-2xl font-bold text-[#1A2035] mb-1">Welcome back</h1>
            <p className="text-sm text-[#7A869A] mb-6">Sign in to your EduBattle account</p>

            {/* Role selector (mobile / desktop secondary) */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-2 block">Sign in as</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-200 text-center"
                    style={{
                      borderColor: selectedRole.id === role.id ? role.color : "#E8EDF5",
                      background: selectedRole.id === role.id ? role.bg : "white",
                    }}
                  >
                    <span className="text-lg">{role.emoji}</span>
                    <span className="text-[9px] font-medium text-[#7A869A] leading-tight">{role.label.split(" ")[0]}</span>
                    {selectedRole.id === role.id && <CheckCircle size={10} style={{ color: role.color }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Demo credentials hint */}
            <div className="mb-4 bg-[#F0F4FA] rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[#1A2035]">Demo credentials available</div>
                <div className="text-[10px] text-[#7A869A]">{selectedRole.demo.email}</div>
              </div>
              <button
                onClick={fillDemo}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
                style={{ background: selectedRole.color }}
              >
                Use <ArrowRight size={12} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Email</label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ focusRingColor: selectedRole.color } as React.CSSProperties}
                  {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } })}
                />
                {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-xs text-[#FF6B35] hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full h-11 px-4 pr-12 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    {...register("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] hover:text-[#1A2035] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ background: loading ? "#94A3B8" : selectedRole.color }}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E8EDF5] text-center">
              <span className="text-sm text-[#7A869A]">New to EduBattle? </span>
              <Link href="/register" className="text-sm font-semibold" style={{ color: selectedRole.color }}>Create account</Link>
            </div>
          </div>

          <p className="text-center text-xs text-[#7A869A] mt-6">
            © 2026 EduBattle · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

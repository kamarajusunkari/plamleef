"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const ROLE_DB_MAP: Record<string, string> = {
  school: "SCHOOL",
  teacher: "TEACHER",
  student: "STUDENT",
  parent: "PARENT",
};

const ROLES = [
  { id: "school", label: "School Admin", emoji: "🏫", color: "#FF6B35", description: "Register your school on EduBattle" },
  { id: "teacher", label: "Teacher", emoji: "👩‍🏫", color: "#8B5CF6", description: "Join with your school code" },
  { id: "student", label: "Student", emoji: "🎓", color: "#3B82F6", description: "Get your roll number from class teacher" },
  { id: "parent", label: "Parent", emoji: "👨‍👩‍👧", color: "#10B981", description: "Link to your child's account" },
];

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  schoolCode: string;
  phone: string;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Special char", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: i < score ? colors[score - 1] : "#E8EDF5" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{ color: score > 0 ? colors[score - 1] : "#7A869A" }}>{score > 0 ? labels[score - 1] : ""}</span>
        <div className="flex gap-2">
          {checks.map(c => (
            <span key={c.label} className={`text-[9px] ${c.pass ? "text-[#10B981]" : "text-[#94A3B8]"}`}>
              {c.pass ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const password = watch("password", "");

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.fullName },
        },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        return;
      }

      const userId = signUpData.user?.id;
      if (userId) {
        // 2. Insert profile into public.users
        const dbRole = ROLE_DB_MAP[selectedRole.id] ?? "STUDENT";
        const { error: insertError } = await supabase
          .from("users")
          .insert({ id: userId, email: data.email, name: data.fullName, role: dbRole });

        if (insertError) {
          // Non-fatal: auth account exists, profile insert failed
          console.error("Profile insert error:", insertError.message);
        }
      }

      toast.success("Account created! Check your email to verify.");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex items-center justify-center p-6 font-sans">
      <Toaster position="top-right" toastOptions={{ success: { duration: 3000 }, error: { duration: 4000 } }} />

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-[#0A1628] font-bold text-xl">EduBattle</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/login" className="text-[#7A869A] hover:text-[#1A2035] transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-2xl font-bold text-[#1A2035]">Create account</h1>
          </div>
          <p className="text-sm text-[#7A869A] mb-6 ml-6">Join India&apos;s competitive learning platform</p>

          {/* Role selector */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-2 block">I am a</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200"
                  style={{
                    borderColor: selectedRole.id === role.id ? role.color : "#E8EDF5",
                    background: selectedRole.id === role.id ? role.color + "10" : "white",
                  }}
                >
                  <span className="text-xl">{role.emoji}</span>
                  <span className="text-[10px] font-semibold text-[#1A2035] leading-tight text-center">{role.label}</span>
                  {selectedRole.id === role.id && <CheckCircle size={12} style={{ color: role.color }} />}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#7A869A] mt-2 text-center">{selectedRole.description}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                  {...register("fullName", { required: "Required" })}
                />
                {errors.fullName && <p className="text-[10px] text-[#EF4444] mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                  {...register("phone", { required: "Required", pattern: { value: /^\d{10}$/, message: "Invalid" } })}
                />
                {errors.phone && <p className="text-[10px] text-[#EF4444] mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@school.edu"
                className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } })}
              />
              {errors.email && <p className="text-[10px] text-[#EF4444] mt-1">{errors.email.message}</p>}
            </div>

            {selectedRole.id !== "school" && (
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                  {selectedRole.id === "student" ? "School Code & Roll Number" : "School Code"}
                </label>
                <input
                  type="text"
                  placeholder={selectedRole.id === "student" ? "e.g. DPS-VJA-8A-01" : "e.g. DPS-VJA"}
                  className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                  {...register("schoolCode", { required: "Required" })}
                />
                {errors.schoolCode && <p className="text-[10px] text-[#EF4444] mt-1">{errors.schoolCode.message}</p>}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="w-full h-11 px-4 pr-12 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={password} />
              {errors.password && <p className="text-[10px] text-[#EF4444] mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                className="w-full h-11 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-transparent"
                {...register("confirmPassword", { required: "Required" })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: loading ? "#94A3B8" : selectedRole.color }}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E8EDF5] text-center">
            <span className="text-sm text-[#7A869A]">Already have an account? </span>
            <Link href="/login" className="text-sm font-semibold" style={{ color: selectedRole.color }}>Sign in</Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#7A869A] mt-4">
          © 2026 EduBattle · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}

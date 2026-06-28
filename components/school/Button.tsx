"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-[#FF6B35] text-white hover:bg-[#e55f2c] active:scale-[0.98] shadow-sm",
  ghost:
    "border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA] active:scale-[0.98]",
  danger:
    "bg-[#EF4444] text-white hover:bg-[#dc2626] active:scale-[0.98] shadow-sm",
  success:
    "bg-[#10B981] text-white hover:bg-[#059669] active:scale-[0.98] shadow-sm",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-2.5 text-sm rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 font-medium transition-all duration-150 ${variantClasses[variant]} ${sizeClasses[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

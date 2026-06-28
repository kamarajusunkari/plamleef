"use client";
import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info" | "purple" | "orange" | "gray";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
  pulsing?: boolean;
}

const variantMap: Record<string, string> = {
  default: "bg-[#F1F5F9] text-[#64748B]",
  success: "bg-[#ECFDF5] text-[#10B981]",
  danger: "bg-[#FEF2F2] text-[#EF4444]",
  warning: "bg-[#FFFBEB] text-[#F59E0B]",
  info: "bg-[#EFF6FF] text-[#3B82F6]",
  purple: "bg-[#F5F3FF] text-[#8B5CF6]",
  orange: "bg-[#FFF7F4] text-[#FF6B35]",
  gray: "bg-[#F1F5F9] text-[#94A3B8]",
};

const sizeMap: Record<string, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  dot = false,
  pulsing = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${pulsing ? "animate-pulse" : ""}`}
          style={{
            backgroundColor:
              variant === "success"
                ? "#10B981"
                : variant === "danger"
                ? "#EF4444"
                : variant === "warning"
                ? "#F59E0B"
                : variant === "info"
                ? "#3B82F6"
                : variant === "orange"
                ? "#FF6B35"
                : "#94A3B8",
          }}
        />
      )}
      {children}
    </span>
  );
}

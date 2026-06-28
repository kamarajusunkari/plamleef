"use client";
import React from "react";

interface FilterPillsProps {
  options: { label: string; value: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterPills({ options, value, onChange, className = "" }: FilterPillsProps) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
            value === opt.value
              ? "bg-[#FF6B35] text-white shadow-sm"
              : "bg-white border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"
          }`}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span
              className={`ml-1 ${value === opt.value ? "text-white/80" : "text-[#94A3B8]"}`}
            >
              ({opt.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

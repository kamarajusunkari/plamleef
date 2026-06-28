"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  trend?: number;
  link?: string;
  animate?: boolean;
}

export function StatsCard({
  label,
  value,
  subtext,
  subtextColor,
  icon,
  bgColor,
  iconColor,
  trend,
  link,
  animate = true,
}: StatsCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(value.toString().replace(/[^0-9.]/g, ""));
  const suffix = typeof value === "string" ? value.replace(/[0-9.]/g, "") : "";
  const [displayValue, setDisplayValue] = useState(animate ? 0 : numericValue);

  useEffect(() => {
    if (!animate || isNaN(numericValue)) {
      setDisplayValue(numericValue);
      return;
    }
    let start = 0;
    const step = numericValue / 30;
    const interval = setInterval(() => {
      start += step;
      if (start >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(interval);
      } else {
        setDisplayValue(start);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [numericValue, animate]);

  const displayStr = isNaN(numericValue)
    ? String(value)
    : `${numericValue % 1 !== 0 ? displayValue.toFixed(1) : Math.round(displayValue)}${suffix}`;

  const content = (
    <div className="bg-white rounded-2xl border border-[#E8EDF5] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend > 0 ? "text-[#10B981]" : trend < 0 ? "text-[#EF4444]" : "text-[#7A869A]"
            }`}
          >
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend !== 0 && `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#1A2035] mb-0.5">{displayStr}</div>
      <div className="text-xs text-[#7A869A] mb-0.5">{label}</div>
      {subtext && (
        <div className={`text-xs ${subtextColor || "text-[#7A869A]"}`}>{subtext}</div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
}

"use client";
import React from "react";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
  className?: string;
}

export function Avatar({ initials, color, size = 40, className = "" }: AvatarProps) {
  const fontSize = size < 32 ? 10 : size < 48 ? 14 : size < 64 ? 16 : 20;

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
}

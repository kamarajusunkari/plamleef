"use client";
import React from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";

interface PodiumEntry {
  rank: number;
  studentId: string;
  name: string;
  initials: string;
  color: string;
  className: string;
  xp: number;
}

interface LeaderboardPodiumProps {
  top3: PodiumEntry[];
}

export function LeaderboardPodium({ top3 }: LeaderboardPodiumProps) {
  const order = [
    top3.find((e) => e.rank === 2),
    top3.find((e) => e.rank === 1),
    top3.find((e) => e.rank === 3),
  ];

  const platformHeights = [60, 80, 50];
  const platformColors = ["#94A3B8", "#FFB347", "#CD7F32"];
  const medals = ["🥈", "👑", "🥉"];

  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {order.map((entry, i) => {
        if (!entry) return null;
        return (
          <div key={entry.rank} className="flex flex-col items-center gap-2">
            <div className="text-xl">{medals[i]}</div>
            <Link href={`/school/students/${entry.studentId}`}>
              <Avatar initials={entry.initials} color={entry.color} size={52} />
            </Link>
            <div className="text-xs font-semibold text-[#1A2035] text-center">{entry.name}</div>
            <div className="text-[10px] text-[#7A869A] text-center">{entry.className}</div>
            <div className="text-xs font-bold text-[#FFB347]">{entry.xp.toLocaleString()} XP</div>
            <div
              className="w-20 rounded-t-xl flex items-center justify-center"
              style={{
                height: platformHeights[i],
                backgroundColor: platformColors[i],
              }}
            >
              <span className="text-white font-bold text-lg">#{entry.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

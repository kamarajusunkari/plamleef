export function getScoreColor(score: number): string {
  if (score >= 75) return "text-[#10B981]";
  if (score >= 50) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

export function getScoreBg(score: number): string {
  if (score >= 75) return "bg-[#ECFDF5]";
  if (score >= 50) return "bg-[#FFFBEB]";
  return "bg-[#FEF2F2]";
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 75) return "text-[#10B981] bg-[#ECFDF5]";
  if (score >= 50) return "text-[#F59E0B] bg-[#FFFBEB]";
  return "text-[#EF4444] bg-[#FEF2F2]";
}

export function getModeBadgeClass(mode: string): string {
  switch (mode) {
    case "HOMEWORK": return "bg-[#EFF6FF] text-[#3B82F6]";
    case "GAME": return "bg-[#FFF7F4] text-[#FF6B35]";
    case "PRACTICE": return "bg-[#ECFDF5] text-[#10B981]";
    case "COMPETITION": return "bg-[#F5F3FF] text-[#8B5CF6]";
    default: return "bg-[#F1F5F9] text-[#64748B]";
  }
}

export function getAttendanceBg(pct: number): string {
  if (pct >= 90) return "bg-[#10B981]";
  if (pct >= 75) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getRelativeTime(dateStr: string): string {
  const now = new Date("2026-03-22T12:00:00");
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "EASY": return "text-[#10B981] bg-[#ECFDF5]";
    case "MEDIUM": return "text-[#F59E0B] bg-[#FFFBEB]";
    case "HARD": return "text-[#EF4444] bg-[#FEF2F2]";
    case "OLYMPIAD": return "text-[#8B5CF6] bg-[#F5F3FF]";
    default: return "text-[#7A869A] bg-[#F1F5F9]";
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

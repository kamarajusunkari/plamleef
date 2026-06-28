// Shared game & mode definitions — single source of truth for the entire Game Zone system

export interface GameDef {
  key: string;
  label: string;
  emoji: string;
  desc: string;
  color: string;
  bgLight: string;
  modes: string[];
}

export interface ModeDef {
  key: string;
  label: string;
  emoji: string;
  desc: string;
}

export const GAMES: GameDef[] = [
  {
    key: "speed-blitz",
    label: "Speed Blitz",
    emoji: "⚡",
    desc: "Race the clock",
    color: "#8B5CF6",
    bgLight: "#F5F3FF",
    modes: ["solo", "vs-ai", "1v1", "pass-play"],
  },
  {
    key: "tug-of-war",
    label: "Tug of War",
    emoji: "🪢",
    desc: "Push the rope with points",
    color: "#FF6B35",
    bgLight: "#FFF7F4",
    modes: ["vs-ai", "1v1", "pass-play"],
  },
  {
    key: "challenge",
    label: "Challenge",
    emoji: "⚔️",
    desc: "Room-code 1v1 battle",
    color: "#10B981",
    bgLight: "#ECFDF5",
    modes: ["1v1"],
  },
  {
    key: "practice",
    label: "Practice",
    emoji: "🧘",
    desc: "No timer, full explanations",
    color: "#F59E0B",
    bgLight: "#FFFBEB",
    modes: ["solo"],
  },
  {
    key: "tournament",
    label: "Tournament",
    emoji: "🏆",
    desc: "Compete for prizes & XP",
    color: "#EF4444",
    bgLight: "#FEF2F2",
    modes: ["solo"],
  },
];

export const MODES: ModeDef[] = [
  { key: "solo",      emoji: "🎯", label: "Solo",         desc: "Just you — race the clock" },
  { key: "vs-ai",    emoji: "🤖", label: "VS AI",         desc: "Battle EduBot" },
  { key: "1v1",      emoji: "👥", label: "1v1 Online",    desc: "Challenge a friend with a code" },
  { key: "pass-play",emoji: "📱", label: "Pass & Play",   desc: "Offline, same device, take turns" },
];

/** Return the route to navigate to for a given game + mode + quiz. */
export function getGameRoute(
  game: string,
  mode: string,
  quizId: string,
  quizTitle: string,
): string {
  const q = `quizId=${quizId}&quizTitle=${encodeURIComponent(quizTitle)}`;
  if (game === "tournament") return "/student/play/tournaments";
  if (game === "practice")   return `/student/play/practice?${q}`;
  if (game === "challenge")  return `/student/play/challenge?${q}`;
  // speed-blitz and tug-of-war handle mode internally via ?mode= param
  return `/student/play/${game}?${q}&mode=${mode}`;
}

/** Lookup helpers */
export const getGame = (key: string) => GAMES.find(g => g.key === key);
export const getMode = (key: string) => MODES.find(m => m.key === key);
export const getModesForGame = (gameKey: string): ModeDef[] => {
  const game = getGame(gameKey);
  if (!game) return [];
  return MODES.filter(m => game.modes.includes(m.key));
};

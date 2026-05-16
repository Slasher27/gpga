import type { Player } from '../../api';

// One cart partnership within a four-ball. Live-only — not persisted.
export interface Partnership {
  fourball: number; // 1 or 2
  team: string; // 'A' or 'B'
  player1_id: string;
  player2_id: string;
}

// Fisher-Yates — returns a new shuffled array, input untouched.
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Slot order of the four partnerships, in reveal sequence.
export const DRAW_SLOTS = [
  { fourball: 1, team: 'A' },
  { fourball: 1, team: 'B' },
  { fourball: 2, team: 'A' },
  { fourball: 2, team: 'B' },
] as const;

// Draw exactly 8 players into 4 cart partnerships across 2 four-balls.
// Result is decided up front; the UI theatrically reveals it.
export function drawTeams(players: Player[]): Partnership[] {
  if (players.length !== 8) {
    throw new Error(`drawTeams expects exactly 8 players, got ${players.length}`);
  }
  const s = shuffle(players);
  return DRAW_SLOTS.map((slot, i) => ({
    fourball: slot.fourball,
    team: slot.team,
    player1_id: s[i * 2].id,
    player2_id: s[i * 2 + 1].id,
  }));
}

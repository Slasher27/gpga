import type { Player, Round, PlayerScores, PlayerFines, LeaderboardPlayer } from '../types';

export interface LeaderboardCalculationInput {
  players: Player[];
  scores: PlayerScores;
  fines: PlayerFines;
  rounds: Round[];
}

/**
 * Calculate leaderboard data with net scoring and worst round drop logic
 *
 * Rules:
 * - Players can drop their worst round ONLY if they've played ALL created rounds
 * - If a player missed even one round, they cannot drop a round
 * - Net scoring = Total strokes - Worst round (if eligible)
 */
export function calculateLeaderboard(input: LeaderboardCalculationInput): LeaderboardPlayer[] {
  const { players, scores, fines, rounds } = input;
  const totalRoundsCreated = rounds.length;

  const leaderboardPlayers: LeaderboardPlayer[] = players.map(player => {
    const pScores = scores[player.id] || {};
    const pFines = fines[player.id] || {};

    let totalStrokes = 0;
    let totalStableford = 0;
    let totalFines = 0;
    let roundsPlayed = 0;
    let worstRound = 0;
    let worstStableford = 999;

    rounds.forEach(round => {
      // Count fines even if no score entered
      if (pFines[round.id]) {
        totalFines += pFines[round.id];
      }

      if (pScores[round.id]) {
        const strokes = pScores[round.id].strokes || 0;
        const stableford = pScores[round.id].stableford || 0;

        if (strokes > 0) {
          totalStrokes += strokes;
          totalStableford += stableford;
          roundsPlayed++;

          if (strokes > worstRound) {
            worstRound = strokes;
          }
          if (stableford < worstStableford) {
            worstStableford = stableford;
          }
        }
      }
    });

    // Player can drop worst round if they haven't missed any rounds
    const hasntMissedAnyRound = roundsPlayed === totalRoundsCreated;
    const canDropWorstRound = hasntMissedAnyRound && roundsPlayed > 0;

    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      status: player.status,
      totalStrokes,
      netScore: canDropWorstRound ? totalStrokes - worstRound : totalStrokes,
      totalFines,
      roundsPlayed,
      worstRound: canDropWorstRound ? worstRound : null
    };
  });

  // Sort by net score (ascending - lower is better)
  return leaderboardPlayers.sort((a, b) => {
    if (a.netScore === 0 && b.netScore === 0) return 0;
    if (a.netScore === 0) return 1; // Players with no score go to bottom
    if (b.netScore === 0) return -1;
    return a.netScore - b.netScore;
  });
}

/**
 * Calculate stableford leaderboard
 */
export function calculateStablefordLeaderboard(input: LeaderboardCalculationInput) {
  const { players, scores, fines, rounds } = input;
  const totalRoundsCreated = rounds.length;

  const leaderboardPlayers = players.map(player => {
    const pScores = scores[player.id] || {};
    const pFines = fines[player.id] || {};

    let totalStableford = 0;
    let totalFines = 0;
    let roundsPlayed = 0;
    let worstStableford = 999;

    rounds.forEach(round => {
      if (pFines[round.id]) {
        totalFines += pFines[round.id];
      }

      if (pScores[round.id]) {
        const stableford = pScores[round.id].stableford || 0;
        const strokes = pScores[round.id].strokes || 0;

        if (strokes > 0) {
          totalStableford += stableford;
          roundsPlayed++;

          if (stableford < worstStableford) {
            worstStableford = stableford;
          }
        }
      }
    });

    const hasntMissedAnyRound = roundsPlayed === totalRoundsCreated;
    const canDropWorstRound = hasntMissedAnyRound && roundsPlayed > 0;

    return {
      ...player,
      totalStableford,
      netStableford: canDropWorstRound ? totalStableford - worstStableford : totalStableford,
      totalFines,
      roundsPlayed,
      worstStableford: canDropWorstRound ? worstStableford : 0,
      canDropWorstRound,
      pScores
    };
  });

  // Sort by net stableford (descending - higher is better)
  return leaderboardPlayers.sort((a, b) => {
    if (a.netStableford === 0 && b.netStableford === 0) return 0;
    if (a.netStableford === 0) return 1;
    if (b.netStableford === 0) return -1;
    return b.netStableford - a.netStableford; // Descending
  });
}

/**
 * Get next round name based on existing rounds
 */
export function getNextRoundName(rounds: Round[]): string {
  if (rounds.length === 0) return 'Round 1';

  // Extract round numbers from existing rounds
  const roundNumbers = rounds
    .map(r => {
      const match = r.name.match(/Round (\d+)/i);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);

  if (roundNumbers.length === 0) return `Round ${rounds.length + 1}`;

  const maxRound = Math.max(...roundNumbers);
  return `Round ${maxRound + 1}`;
}

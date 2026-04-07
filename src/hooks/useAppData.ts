import { useState, useEffect, useMemo } from 'react';
import * as DB from '../api';
import { calculateLeaderboard } from '../services';
import type { Player, Round, Season, GolfCourse, PlayerScores, PlayerFines } from '../types';

export interface AppData {
  players: Player[];
  rounds: Round[];
  scores: PlayerScores & { [playerId: string]: { [roundId: number]: { strokes: number; handicap: number; stableford: number; fines?: number } } };
  activeSeason: Season | null;
  golfCourses: GolfCourse[];
  leaderboardData: any[];
  loadData: () => void;
}

export function useAppData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [scores, setScores] = useState<any>({});
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [golfCourses, setGolfCourses] = useState<GolfCourse[]>([]);

  // Load data from database
  const loadData = () => {
    try {
      // Get active season
      const season = DB.getActiveSeason();
      setActiveSeason(season);

      // Load players
      const playersData = DB.getAllPlayers();
      setPlayers(playersData);

      // Load rounds for active season
      const roundsData = season ? DB.getAllRounds(season.id) : DB.getAllRounds();
      setRounds(roundsData);

      // Load golf courses
      const coursesData = DB.getAllGolfCourses();
      setGolfCourses(coursesData);

      // Load scores
      const scoresData = DB.getAllScores();

      // Load fines separately
      const finesData = DB.getPlayerFinesByRound();

      // Merge scores and fines
      const mergedData: any = { ...scoresData };
      Object.keys(finesData).forEach(playerId => {
        if (!mergedData[playerId]) mergedData[playerId] = {};
        Object.keys(finesData[playerId]).forEach(roundId => {
          if (!mergedData[playerId][roundId]) {
            mergedData[playerId][roundId] = { strokes: 0, handicap: 0, stableford: 0, fines: 0 };
          }
          mergedData[playerId][roundId].fines = finesData[playerId][roundId];
        });
      });

      setScores(mergedData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Calculate leaderboard data
  const leaderboardData = useMemo(() => {
    const totalRoundsCreated = rounds.length;

    return players.map(player => {
      const pScores = scores[player.id] || {};
      let totalStrokes = 0;
      let totalStableford = 0;
      let totalFines = 0;
      let roundsPlayed = 0;
      let worstRound = 0;
      let worstStableford = 999;

      rounds.forEach(r => {
        if (pScores[r.id]) {
          const s = pScores[r.id].strokes || 0;
          const sf = pScores[r.id].stableford || 0;
          const f = pScores[r.id].fines || 0;

          // Always count fines, even if no score entered
          totalFines += f;

          if (s > 0) {
            totalStrokes += s;
            totalStableford += sf;
            roundsPlayed++;
            if (s > worstRound) worstRound = s;
            if (sf < worstStableford) worstStableford = sf;
          }
        }
      });

      // Player can drop worst round if they haven't missed any rounds
      const hasntMissedAnyRound = roundsPlayed === totalRoundsCreated;
      const canDropWorstRound = hasntMissedAnyRound && roundsPlayed > 0;
      const netTotal = canDropWorstRound ? totalStrokes - worstRound : totalStrokes;
      const netStableford = canDropWorstRound ? totalStableford - worstStableford : totalStableford;

      return {
        ...player,
        totalStrokes,
        totalStableford,
        netTotal,
        netStableford,
        worstRound: canDropWorstRound ? worstRound : 0,
        worstStableford: canDropWorstRound ? worstStableford : 0,
        totalFines,
        roundsPlayed,
        pScores,
        canDropWorstRound
      };
    }).sort((a, b) => {
      if (a.netTotal === 0 && b.netTotal === 0) return 0;
      if (a.netTotal === 0) return 1;
      if (b.netTotal === 0) return -1;
      return a.netTotal - b.netTotal;
    });
  }, [players, scores, rounds]);

  return {
    players,
    rounds,
    scores,
    activeSeason,
    golfCourses,
    leaderboardData,
    loadData
  };
}

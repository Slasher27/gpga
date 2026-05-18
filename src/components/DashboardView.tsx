import { useState, useEffect, useMemo } from 'react';
import { Trophy, MapPin, Calendar, Clock } from 'lucide-react';
import { TabBar, Card, Avatar, formatDate, EmptyRow } from './common';
import * as DB from '../api';
import { SEASON_ROUNDS } from '../api';
import type { Season, Round, Player, GolfCourse, Team, LeaderboardEntry, ScoresMapFull } from '../api';

const RankBadge = ({ idx, dq }: { idx: number; dq?: boolean }) => (
  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
    dq ? 'bg-slate-100 text-slate-400' :
    idx === 0 ? 'bg-emerald-500 text-white' :
    idx === 1 ? 'bg-slate-300 text-slate-700' :
    idx === 2 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'
  }`}>{dq ? '-' : idx + 1}</span>
);

const PlayerCell = ({ player, isWinner }: { player: LeaderboardEntry; isWinner?: boolean }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className={`truncate ${player.isDisqualified ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
      {player.name}
    </span>
    {isWinner && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">WINNER</span>}
    {player.isDisqualified && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">DQ</span>}
  </div>
);

const LeaderCard = ({ title, player, value, unit, totalRounds }: {
  title: string;
  player?: LeaderboardEntry;
  value: number;
  unit: string;
  totalRounds: number;
}) => (
  <Card className="p-5 flex flex-col items-center text-center">
    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-4">{title}</p>
    {player && player.roundsPlayed > 0 ? (
      <>
        <div className="rounded-full ring-2 ring-emerald-200 mb-3">
          <Avatar src={player.avatar} name={player.name} size="lg" />
        </div>
        <p className="text-base font-bold text-slate-800">{player.name}</p>
        <p className="text-xl font-bold text-emerald-600 mt-1">{value} <span className="text-sm font-normal text-slate-400">{unit}</span></p>
        <p className="text-xs text-slate-400 mt-1">{player.roundsPlayed} of {totalRounds} rounds</p>
      </>
    ) : (
      <p className="text-sm text-slate-400 mt-2">Awaiting scores</p>
    )}
  </Card>
);

// Medal & Stableford share one table. # and Player stay pinned (sticky) while
// the round columns scroll horizontally on narrow screens.
const StandingsTable = ({ players, rounds, isCompletedSeason, metric }: {
  players: LeaderboardEntry[];
  rounds: Round[];
  isCompletedSeason: boolean;
  metric: 'medal' | 'stableford';
}) => {
  const cell = (p: LeaderboardEntry, rid: number) => metric === 'medal' ? p.pScores[rid]?.strokes : p.pScores[rid]?.stableford;
  const total = (p: LeaderboardEntry) => metric === 'medal' ? p.totalStrokes : p.totalStableford;
  const drop = (p: LeaderboardEntry) => metric === 'medal' ? p.worstRound : p.worstStableford;
  const net = (p: LeaderboardEntry) => metric === 'medal' ? p.netTotal : p.netStableford;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-3 py-3 text-left w-10 sticky left-0 bg-slate-50 z-10">#</th>
            <th className="px-3 py-3 text-left sticky left-10 bg-slate-50 z-10 w-px whitespace-nowrap">Player</th>
            {rounds.map((r, i) => <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i + 1}</th>)}
            <th className="px-3 py-3 text-center bg-slate-100">Total</th>
            <th className="px-3 py-3 text-center text-red-400">Drop</th>
            <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {players.map((player, idx) => (
            <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
              <td className="px-3 py-3 sticky left-0 bg-white z-10"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
              <td className="px-3 py-3 sticky left-10 bg-white z-10 w-px whitespace-nowrap"><PlayerCell player={player} isWinner={isCompletedSeason && idx === 0 && !player.isDisqualified} /></td>
              {rounds.map(r => <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">{cell(player, r.id) || <span className="text-slate-300">-</span>}</td>)}
              <td className="px-3 py-3 text-center font-semibold bg-slate-50">{total(player) || '-'}</td>
              <td className="px-3 py-3 text-center text-red-400 text-xs">{player.canDropWorstRound ? `-${drop(player)}` : '-'}</td>
              <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{net(player) || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DashboardViewProps {
  activeSeason: Season | null;
  leaderboardData: LeaderboardEntry[];
  rounds: Round[];
  scores: ScoresMapFull;
  players: Player[];
  golfCourses: GolfCourse[];
}

export default function DashboardView({ activeSeason, leaderboardData, rounds, scores, players, golfCourses }: DashboardViewProps) {
  const [leaderboardTab, setLeaderboardTab] = useState('medal');
  const [teamsData, setTeamsData] = useState<Team[]>([]);

  useEffect(() => {
    if (activeSeason) DB.getTeams(activeSeason.id).then(setTeamsData);
  }, [activeSeason]);

  const teamLeaderboard = useMemo(() => {
    if (!teamsData.length || !rounds.length) return [];
    return teamsData.map(team => {
      const p1 = scores[team.player1_id] || {}, p2 = scores[team.player2_id] || {};
      let total = 0;
      const roundTotals: Record<number, number> = {};
      rounds.forEach(r => {
        const combined = (p1[r.id]?.stableford || 0) + (p2[r.id]?.stableford || 0);
        roundTotals[r.id] = combined;
        total += combined;
      });
      return { ...team, roundTotals, total };
    }).sort((a, b) => b.total - a.total);
  }, [teamsData, scores, rounds]);

  const stablefordSorted = useMemo(() => [...leaderboardData].sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    if (a.netStableford === 0 && b.netStableford === 0) return 0;
    if (a.netStableford === 0) return 1;
    if (b.netStableford === 0) return -1;
    return b.netStableford - a.netStableford;
  }), [leaderboardData]);

  const finesSorted = useMemo(() => [...leaderboardData].sort((a, b) => b.totalFines - a.totalFines), [leaderboardData]);
  const totalFinesPot = leaderboardData.reduce((acc, p) => acc + p.totalFines, 0);
  const isCompletedSeason = !!activeSeason && !activeSeason.is_active;
  const medalLeader = leaderboardData[0];
  const sfLeader = stablefordSorted[0];

  // The spotlight card walks a round through its lifecycle, driven only by
  // the round date + `closed` flag: Next → Today's → Awaiting Results → Last.
  const spotlight = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const byDateAsc = (a: Round, b: Round) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const upcoming = rounds.filter(r => !r.closed && r.date >= today).sort(byDateAsc);
    if (upcoming.length) {
      const round = upcoming[0];
      if (round.date === today) return { state: 'today' as const, round };
      const days = Math.ceil((new Date(round.date).getTime() - new Date(today).getTime()) / 86400000);
      return { state: 'next' as const, round, days };
    }
    const awaiting = rounds.filter(r => !r.closed && r.date < today).sort(byDateAsc).pop();
    if (awaiting) return { state: 'awaiting' as const, round: awaiting };
    const lastClosed = rounds.filter(r => r.closed).sort(byDateAsc).pop();
    if (lastClosed) return { state: 'last' as const, round: lastClosed };
    return { state: 'none' as const };
  }, [rounds]);

  // Prize total
  const prizeTotal = (activeSeason?.medal_1st || 0) + (activeSeason?.medal_2nd || 0) + (activeSeason?.stableford_1st || 0) + (activeSeason?.stableford_2nd || 0) + (activeSeason?.team_1st || 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <span className="text-xs text-slate-400">{activeSeason?.name}</span>
      </div>

      {/* Season Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (rounds.length / SEASON_ROUNDS) * 100)}%` }} />
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">Round {rounds.length} of {SEASON_ROUNDS}</span>
      </div>

      {/* Purse strip */}
      {activeSeason && prizeTotal > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <Trophy size={16} className="text-emerald-500 flex-shrink-0" />
          <span className="font-bold text-slate-800">R{prizeTotal.toLocaleString()}</span>
          <span className="text-slate-300">—</span>
          <span className="text-slate-500">
            {[
              activeSeason.medal_1st > 0 && `Medal R${activeSeason.medal_1st.toLocaleString()}/${(activeSeason.medal_2nd||0).toLocaleString()}`,
              activeSeason.stableford_1st > 0 && `SF R${activeSeason.stableford_1st.toLocaleString()}/${(activeSeason.stableford_2nd||0).toLocaleString()}`,
              activeSeason.team_1st > 0 && `Teams R${activeSeason.team_1st.toLocaleString()}`,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Spotlight round — lifecycle: Next → Today's → Awaiting Results → Last */}
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">
              {spotlight.state === 'today' ? "Today's Round"
                : spotlight.state === 'awaiting' ? 'Awaiting Results'
                : spotlight.state === 'last' ? 'Last Round'
                : 'Next Round'}
            </p>
            {spotlight.state === 'next' && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                {spotlight.days} {spotlight.days === 1 ? 'day' : 'days'}
              </span>
            )}
            {spotlight.state === 'today' && (
              <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold">Today</span>
            )}
            {spotlight.state === 'awaiting' && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">Not finalised</span>
            )}
            {spotlight.state === 'last' && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">Completed</span>
            )}
          </div>
          {spotlight.state !== 'none' ? (
            <>
              {/* Course placeholder */}
              <div className="bg-gradient-to-br from-emerald-50 to-slate-100 rounded-lg p-4 mb-3 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-slate-800">{spotlight.round.course_name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">18 holes · Par {golfCourses?.find(c => c.id === spotlight.round.course_id)?.par || 72}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700">{spotlight.round.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{formatDate(spotlight.round.date)}</span>
                </div>
                {(spotlight.round.tee_time || spotlight.round.tee_time_2) && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>{[spotlight.round.tee_time, spotlight.round.tee_time_2].filter(Boolean).join(' & ')}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">No rounds scheduled</p>
          )}
        </Card>

        <LeaderCard title="Medal Leader" player={medalLeader} value={medalLeader?.netTotal ?? 0} unit="net" totalRounds={rounds.length} />

        <LeaderCard title="Stableford Leader" player={sfLeader} value={sfLeader?.netStableford ?? 0} unit="pts" totalRounds={rounds.length} />

      </div>

      {/* === Competitions === */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Competitions</h3>
        <TabBar
          tabs={[{ id: 'medal', label: 'Medal' }, { id: 'stableford', label: 'Stableford' }, { id: 'teams', label: 'Teams' }]}
          active={leaderboardTab}
          onChange={setLeaderboardTab}
        />
      </div>

      {/* Medal Tab */}
      {leaderboardTab === 'medal' && (
        <Card>
          {rounds.length === 0 ? (
            <EmptyRow>No rounds played yet</EmptyRow>
          ) : (
            <StandingsTable players={leaderboardData} rounds={rounds} isCompletedSeason={isCompletedSeason} metric="medal" />
          )}
        </Card>
      )}

      {/* Stableford Tab */}
      {leaderboardTab === 'stableford' && (
        <Card>
          {rounds.length === 0 ? (
            <EmptyRow>No rounds played yet</EmptyRow>
          ) : (
            <StandingsTable players={stablefordSorted} rounds={rounds} isCompletedSeason={isCompletedSeason} metric="stableford" />
          )}
        </Card>
      )}

      {/* Teams Tab */}
      {leaderboardTab === 'teams' && (
        <Card>
          {teamLeaderboard.length === 0 ? (
            <EmptyRow>No teams set up for this season</EmptyRow>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10 sticky left-0 bg-slate-50 z-10">#</th>
                    <th className="px-3 py-3 text-left sticky left-10 bg-slate-50 z-10 w-px whitespace-nowrap">Team</th>
                    {rounds.map((r, i) => <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>)}
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamLeaderboard.map((team, idx) => (
                    <tr key={team.id} className={idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-3 sticky left-0 bg-white z-10"><RankBadge idx={idx} /></td>
                      <td className="px-3 py-3 sticky left-10 bg-white z-10 w-px whitespace-nowrap">
                        <p className="font-medium text-slate-800 flex items-center gap-1.5">
                          {team.name}
                          {isCompletedSeason && idx === 0 && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">WINNER</span>}
                        </p>
                        <p className="text-xs text-slate-400">{team.player1_name} & {team.player2_name}</p>
                      </td>
                      {rounds.map(r => <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">{team.roundTotals[r.id] || <span className="text-slate-300">-</span>}</td>)}
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{team.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* === Fines Section === */}
      <div className="pt-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Fines</h3>

        {/* Summary cards — always full width, 2 col on mobile, 3 col on desktop for balance */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-xs text-red-500 uppercase font-medium">Fines Pot</p>
            <p className="text-2xl font-bold text-red-700 mt-1">R{totalFinesPot.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">{rounds.length} rounds</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 uppercase font-medium">Most Fines</p>
            <p className="text-lg font-bold text-slate-700 mt-1 truncate">{finesSorted[0]?.name || '-'}</p>
            <p className="text-xs text-slate-500 mt-1">R{finesSorted[0]?.totalFines?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
            <p className="text-xs text-emerald-600 uppercase font-medium">Avg per Round</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              R{rounds.length > 0 ? Math.round(totalFinesPot / rounds.length).toLocaleString() : '0'}
            </p>
            <p className="text-xs text-emerald-500 mt-1">across season</p>
          </div>
        </div>

        {/* Leaderboard + chart — stacked on mobile, side-by-side from md up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">Leaderboard</p>
            </div>
            <div className="divide-y divide-slate-50">
              {finesSorted.length === 0 ? (
                <EmptyRow>No fines recorded</EmptyRow>
              ) : finesSorted.map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-3">
                  <RankBadge idx={idx} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{player.name}</p>
                    <p className="text-xs text-slate-400">{player.roundsPlayed} rounds</p>
                  </div>
                  <p className="font-bold text-red-600 text-sm flex-shrink-0">R{player.totalFines.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>

          {rounds.length > 0 && (() => {
            const data = rounds.map((r, i) => ({
              label: `R${i + 1}`,
              value: players.reduce((acc, p) => acc + (scores[p.id]?.[r.id]?.fines || 0), 0)
            }));
            const maxV = Math.max(1, ...data.map(d => d.value));
            const W = 300, H = 100;
            const padL = 14, padR = 14, padT = 16, padB = 10;
            const innerW = W - padL - padR;
            const innerH = H - padT - padB;
            const pts = data.map((d, i) => ({
              ...d,
              x: padL + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1)),
              y: padT + innerH - (d.value / maxV) * innerH
            }));
            const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
            return (
              <Card className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Fines per Round</p>
                <div className="w-full aspect-[5/2] min-h-[140px]">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Fines per round chart">
                    {[0, 0.5, 1].map(f => (
                      <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f} stroke="#f1f5f9" strokeWidth="1" />
                    ))}
                    <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#ef4444" />
                        {p.value > 0 && (
                          <text x={p.x} y={p.y - 5} fontSize="7" textAnchor="middle" fill="#64748b" fontWeight="600">R{p.value}</text>
                        )}
                        <text x={p.x} y={H - 1} fontSize="7" textAnchor="middle" fill="#94a3b8">{p.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

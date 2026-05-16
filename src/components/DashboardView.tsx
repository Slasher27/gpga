// @ts-nocheck — legacy JS patterns; migrate to strict TS in a follow-up pass.
import { useState, useEffect, useMemo } from 'react';
import { Trophy, MapPin, Calendar, Clock } from 'lucide-react';
import { TabBar, Card, Avatar } from './common';
import * as DB from '../api';

const RankBadge = ({ idx, dq }) => (
  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
    dq ? 'bg-slate-100 text-slate-400' :
    idx === 0 ? 'bg-emerald-500 text-white' :
    idx === 1 ? 'bg-slate-300 text-slate-700' :
    idx === 2 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'
  }`}>{dq ? '-' : idx + 1}</span>
);

const PlayerCell = ({ player, isWinner }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className={`truncate ${player.isDisqualified ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
      {player.name}
    </span>
    {isWinner && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">WINNER</span>}
    {player.isDisqualified && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">DQ</span>}
  </div>
);

export default function DashboardView({ activeSeason, leaderboardData, rounds, scores, players, golfCourses }) {
  const [leaderboardTab, setLeaderboardTab] = useState('medal');
  const [teamsData, setTeamsData] = useState([]);

  useEffect(() => {
    if (activeSeason) DB.getTeams(activeSeason.id).then(setTeamsData);
  }, [activeSeason]);

  const teamLeaderboard = useMemo(() => {
    if (!teamsData.length || !rounds.length) return [];
    return teamsData.map(team => {
      const p1 = scores[team.player1_id] || {}, p2 = scores[team.player2_id] || {};
      let total = 0;
      const roundTotals = {};
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
  const isCompletedSeason = activeSeason && !activeSeason.is_active;
  const medalLeader = leaderboardData[0];
  const sfLeader = stablefordSorted[0];

  // Next round = first future round, or last round if all are past
  const today = new Date().toISOString().split('T')[0];
  const nextRound = rounds.find(r => r.date >= today) || rounds[rounds.length - 1];
  const daysUntilNext = nextRound && nextRound.date >= today ? Math.ceil((new Date(nextRound.date).getTime() - new Date(today).getTime()) / 86400000) : -1;

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
          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(rounds.length / 9) * 100}%` }} />
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">Round {rounds.length} of 9</span>
      </div>

      {/* Purse strip */}
      {prizeTotal > 0 && (
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
        {/* Next Round */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">{nextRound && nextRound.date >= today ? 'Next Round' : nextRound ? 'Latest Round' : 'Next Round'}</p>
            {daysUntilNext >= 0 && (
              daysUntilNext > 0
                ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">{daysUntilNext} days</span>
                : <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold">Today</span>
            )}
          </div>
          {nextRound ? (
            <>
              {/* Course placeholder */}
              <div className="bg-gradient-to-br from-emerald-50 to-slate-100 rounded-lg p-4 mb-3 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-slate-800">{nextRound.course_name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">18 holes · Par {golfCourses?.find(c => c.id === nextRound.course_id)?.par || 72}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700">{nextRound.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{nextRound.date}</span>
                </div>
                {(nextRound.tee_time || nextRound.tee_time_2) && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>{[nextRound.tee_time, nextRound.tee_time_2].filter(Boolean).join(' & ')}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Not scheduled</p>
          )}
        </div>

        {/* Medal Leader */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-4">Medal Leader</p>
          {medalLeader && medalLeader.roundsPlayed > 0 ? (
            <>
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-emerald-200 mb-3 flex-shrink-0">
                {medalLeader.avatar
                  ? <img src={medalLeader.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">{medalLeader.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
                }
              </div>
              <p className="text-base font-bold text-slate-800">{medalLeader.name}</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{medalLeader.netTotal} <span className="text-sm font-normal text-slate-400">net</span></p>
              <p className="text-xs text-slate-400 mt-1">{medalLeader.roundsPlayed} of {rounds.length} rounds</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">Awaiting scores</p>
          )}
        </div>

        {/* Stableford Leader */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-4">Stableford Leader</p>
          {sfLeader && sfLeader.roundsPlayed > 0 ? (
            <>
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-emerald-200 mb-3 flex-shrink-0">
                {sfLeader.avatar
                  ? <img src={sfLeader.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">{sfLeader.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
                }
              </div>
              <p className="text-base font-bold text-slate-800">{sfLeader.name}</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{sfLeader.netStableford} <span className="text-sm font-normal text-slate-400">pts</span></p>
              <p className="text-xs text-slate-400 mt-1">{sfLeader.roundsPlayed} of {rounds.length} rounds</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">Awaiting scores</p>
          )}
        </div>

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
            <div className="p-8 text-center text-slate-400 text-sm">No rounds played yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Player</th>
                    {rounds.map((r, i) => <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>)}
                    <th className="px-3 py-3 text-center bg-slate-100">Total</th>
                    <th className="px-3 py-3 text-center text-red-400">Drop</th>
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaderboardData.map((player, idx) => (
                    <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
                      <td className="px-3 py-3"><PlayerCell player={player} isWinner={isCompletedSeason && idx === 0 && !player.isDisqualified} /></td>
                      {rounds.map(r => <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">{player.pScores[r.id]?.strokes || <span className="text-slate-300">-</span>}</td>)}
                      <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStrokes || '-'}</td>
                      <td className="px-3 py-3 text-center text-red-400 text-xs">{player.canDropWorstRound ? `-${player.worstRound}` : '-'}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netTotal || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Stableford Tab */}
      {leaderboardTab === 'stableford' && (
        <Card>
          {rounds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No rounds played yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Player</th>
                    {rounds.map((r, i) => <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>)}
                    <th className="px-3 py-3 text-center bg-slate-100">Total</th>
                    <th className="px-3 py-3 text-center text-red-400">Drop</th>
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stablefordSorted.map((player, idx) => (
                    <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
                      <td className="px-3 py-3"><PlayerCell player={player} isWinner={isCompletedSeason && idx === 0 && !player.isDisqualified} /></td>
                      {rounds.map(r => <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">{player.pScores[r.id]?.stableford || <span className="text-slate-300">-</span>}</td>)}
                      <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStableford || '-'}</td>
                      <td className="px-3 py-3 text-center text-red-400 text-xs">{player.canDropWorstRound ? `-${player.worstStableford}` : '-'}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netStableford || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Teams Tab */}
      {leaderboardTab === 'teams' && (
        <Card>
          {teamLeaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No teams set up for this season</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    {rounds.map((r, i) => <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>)}
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamLeaderboard.map((team, idx) => (
                    <tr key={team.id} className={idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-3"><RankBadge idx={idx} /></td>
                      <td className="px-3 py-3">
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
                <div className="p-6 text-center text-slate-400 text-sm">No fines recorded</div>
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

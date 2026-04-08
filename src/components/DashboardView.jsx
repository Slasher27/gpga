import { useState, useEffect, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TabBar } from './common';
import * as DB from '../api.ts';

const Card = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>
    {children}
  </div>
);

const DashboardView = ({ activeSeason, leaderboardData, rounds, scores, players }) => {
  const [leaderboardTab, setLeaderboardTab] = useState('medal');
  const [teamsData, setTeamsData] = useState([]);

  // Load teams for active season
  useEffect(() => {
    if (activeSeason) {
      DB.getTeams(activeSeason.id).then(data => setTeamsData(data));
    }
  }, [activeSeason]);

  // Calculate team leaderboard (combined stableford, ALL rounds count)
  const teamLeaderboard = useMemo(() => {
    if (!teamsData.length || !rounds.length) return [];

    return teamsData.map(team => {
      const p1Scores = scores[team.player1_id] || {};
      const p2Scores = scores[team.player2_id] || {};
      let total = 0;
      const roundTotals = {};

      rounds.forEach(r => {
        const p1sf = p1Scores[r.id]?.stableford || 0;
        const p2sf = p2Scores[r.id]?.stableford || 0;
        const combined = p1sf + p2sf;
        roundTotals[r.id] = combined;
        total += combined;
      });

      return { ...team, roundTotals, total };
    }).sort((a, b) => b.total - a.total);
  }, [teamsData, scores, rounds]);

  const stablefordSorted = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      if (a.netStableford === 0 && b.netStableford === 0) return 0;
      if (a.netStableford === 0) return 1;
      if (b.netStableford === 0) return -1;
      return b.netStableford - a.netStableford;
    });
  }, [leaderboardData]);

  const finesSorted = useMemo(() =>
    [...leaderboardData].sort((a, b) => b.totalFines - a.totalFines),
  [leaderboardData]);

  const totalFinesPot = leaderboardData.reduce((acc, curr) => acc + curr.totalFines, 0);

  // Empty state for new season
  if (rounds.length === 0) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between h-10">
          <h2 className="text-xl font-bold text-slate-800">{activeSeason?.name || 'Season'}</h2>
        </div>
        <Card>
          <div className="p-8 md:p-12 text-center">
            <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Season hasn't started yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No rounds have been played. Once the first round is created and scores are entered, the leaderboard will appear here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Rank badge helper
  const RankBadge = ({ idx, dq }) => (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
      dq ? 'bg-slate-100 text-slate-400' :
      idx === 0 ? 'bg-emerald-500 text-white' :
      idx === 1 ? 'bg-slate-300 text-slate-700' :
      idx === 2 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'
    }`}>{dq ? '-' : idx + 1}</span>
  );

  // Player name cell helper — shows trophy for winners in completed seasons
  const isCompletedSeason = activeSeason && !activeSeason.is_active;

  const PlayerCell = ({ player, isWinner }) => (
    <div className="flex items-center gap-2 min-w-0">
              <span className={`truncate ${player.isDisqualified ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
        {player.name}
      </span>
      {isWinner && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">WINNER</span>}
      {player.isDisqualified && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">DQ</span>}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Winners Banner for completed seasons */}
      {isCompletedSeason && (
        <Card>
          <div className="p-4 md:p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">{activeSeason.name} Champions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Trophy size={18} className="text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Medal</p>
                  <p className="font-bold text-slate-800 text-sm truncate">{leaderboardData[0]?.name || '-'}</p>
                  <p className="text-xs text-slate-500">{leaderboardData[0]?.netTotal || '-'} net</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Trophy size={18} className="text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Stableford</p>
                  <p className="font-bold text-slate-800 text-sm truncate">{stablefordSorted[0]?.name || '-'}</p>
                  <p className="text-xs text-slate-500">{stablefordSorted[0]?.netStableford || '-'} pts</p>
                </div>
              </div>
              {teamLeaderboard.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <Trophy size={18} className="text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-medium">Teams</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{teamLeaderboard[0].name}</p>
                    <p className="text-xs text-slate-500">{teamLeaderboard[0].total} pts</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Header + Season Summary */}
      <div>
        <div className="flex items-center justify-between h-10">
          <h2 className="text-xl font-bold text-slate-800">{activeSeason?.name || 'Leaderboard'}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">Medal: {leaderboardData[0]?.name || '-'} ({leaderboardData[0]?.netTotal || '-'})</span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">Stableford: {stablefordSorted[0]?.name || '-'} ({stablefordSorted[0]?.netStableford || '-'})</span>
          {teamLeaderboard.length > 0 && (
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">Teams: {teamLeaderboard[0].name} ({teamLeaderboard[0].total})</span>
          )}
          <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-semibold">Fines Pot: R{totalFinesPot.toLocaleString()}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabBar
        tabs={[{ id: 'medal', label: 'Medal' }, { id: 'stableford', label: 'Stableford' }, { id: 'teams', label: 'Teams' }, { id: 'fines', label: 'Fines' }]}
        active={leaderboardTab}
        onChange={setLeaderboardTab}
      />

      {/* Medal Tab */}
      {leaderboardTab === 'medal' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left w-10">#</th>
                  <th className="px-3 py-3 text-left">Player</th>
                  {rounds.map((r, i) => (
                    <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                  ))}
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
                    {rounds.map(r => (
                      <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                        {player.pScores[r.id]?.strokes || <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStrokes || '-'}</td>
                    <td className="px-3 py-3 text-center text-red-400 text-xs">{player.canDropWorstRound ? `-${player.worstRound}` : '-'}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netTotal || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Stableford Tab */}
      {leaderboardTab === 'stableford' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left w-10">#</th>
                  <th className="px-3 py-3 text-left">Player</th>
                  {rounds.map((r, i) => (
                    <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                  ))}
                  <th className="px-3 py-3 text-center bg-slate-100">Total</th>
                  <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stablefordSorted.map((player, idx) => (
                  <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-3"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
                    <td className="px-3 py-3"><PlayerCell player={player} isWinner={isCompletedSeason && idx === 0 && !player.isDisqualified} /></td>
                    {rounds.map(r => (
                      <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                        {player.pScores[r.id]?.stableford || <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStableford || '-'}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netStableford || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    {rounds.map((r, i) => (
                      <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                    ))}
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamLeaderboard.map((team, idx) => (
                    <tr key={team.id} className={idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-3"><RankBadge idx={idx} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 flex items-center gap-1.5">
                              {team.name}
                              {isCompletedSeason && idx === 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">WINNER</span>}
                            </p>
                            <p className="text-xs text-slate-400">{team.player1_name} & {team.player2_name}</p>
                          </div>
                        </div>
                      </td>
                      {rounds.map(r => (
                        <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                          {team.roundTotals[r.id] || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{team.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Fines Tab */}
      {leaderboardTab === 'fines' && (
        <div className="space-y-4">
          {/* Fines Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-red-500 uppercase font-medium">Fines Pot</p>
              <p className="text-2xl font-bold text-red-700 mt-1">R{totalFinesPot.toLocaleString()}</p>
              <p className="text-xs text-red-400 mt-1">{rounds.length} rounds</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 uppercase font-medium">Most Fines</p>
              <p className="text-lg font-bold text-slate-700 mt-1">{finesSorted[0]?.name || '-'}</p>
              <p className="text-xs text-slate-500 mt-1">R{finesSorted[0]?.totalFines?.toLocaleString() || '0'}</p>
            </div>
          </div>

          {/* Fines Ranking */}
          <Card>
            <div className="divide-y divide-slate-50">
              {finesSorted.map((player, idx) => (
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

          {/* Chart */}
          {rounds.length > 0 && (
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase font-medium mb-3">Fines per Round</p>
              <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer>
                  <LineChart data={rounds}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#94a3b8" tickFormatter={v => v.replace('Round ', 'R')} />
                    <YAxis tick={{fontSize: 11}} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                    <Line type="monotone" dataKey={(r) => players.reduce((acc, p) => acc + (scores[p.id]?.[r.id]?.fines || 0), 0)} name="Total Fines" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardView;

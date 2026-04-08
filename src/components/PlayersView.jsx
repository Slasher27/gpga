import { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Edit, Trash2, ChevronDown } from 'lucide-react';
import * as DB from '../api.ts';
import { NoPlayersEmptyState, Avatar } from './common';

const Card = ({ children, className = '' }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>{children}</div>
);

const TeamManagementSection = ({ teams, setTeams, isAddingTeam, setIsAddingTeam, players, activeSeason, showToast }) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayer1, setNewPlayer1] = useState('');
  const [newPlayer2, setNewPlayer2] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);

  const assignedPlayerIds = teams.flatMap(t => [t.player1_id, t.player2_id]);
  const availablePlayers = players.filter(p => p.status === 'active' && !assignedPlayerIds.includes(p.id));

  const handleAddTeam = async () => {
    if (!newTeamName || !newPlayer1 || !newPlayer2 || !activeSeason) return;
    await DB.createTeam(activeSeason.id, newTeamName, newPlayer1, newPlayer2);
    const updated = await DB.getTeams(activeSeason.id);
    setTeams(updated);
    setNewTeamName('');
    setNewPlayer1('');
    setNewPlayer2('');
    setIsAddingTeam(false);
    showToast('Team created!', 'success');
  };

  const handleDeleteTeam = async (id) => {
    await DB.deleteTeam(id);
    const updated = await DB.getTeams(activeSeason.id);
    setTeams(updated);
    showToast('Team deleted', 'info');
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    await DB.updateTeam(editingTeam.id, {
      name: editingTeam.name,
      player1_id: editingTeam.player1_id,
      player2_id: editingTeam.player2_id
    });
    const updated = await DB.getTeams(activeSeason.id);
    setTeams(updated);
    setEditingTeam(null);
    showToast('Team updated!', 'success');
  };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">Fixed pairs for {activeSeason?.name || 'the season'}. Combined stableford, all 9 rounds count.</p>
      <Card>
        <div className="divide-y divide-slate-100">
          {teams.map(team => (
            <div key={team.id} className="p-4">
              {editingTeam?.id === team.id ? (
                <div className="space-y-3">
                  <input
                    id={`edit-team-${team.id}`}
                    name="edit-team-name"
                    value={editingTeam.name}
                    onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    aria-label="Team name"
                    className="input input-bordered w-full min-h-[44px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      id={`edit-team-p1-${team.id}`}
                      name="edit-team-p1"
                      value={editingTeam.player1_id}
                      onChange={e => setEditingTeam({ ...editingTeam, player1_id: e.target.value })}
                      aria-label="Player 1"
                      className="select select-bordered w-full min-h-[44px]"
                    >
                      {players.filter(p => p.status === 'active').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      id={`edit-team-p2-${team.id}`}
                      name="edit-team-p2"
                      value={editingTeam.player2_id}
                      onChange={e => setEditingTeam({ ...editingTeam, player2_id: e.target.value })}
                      aria-label="Player 2"
                      className="select select-bordered w-full min-h-[44px]"
                    >
                      {players.filter(p => p.status === 'active').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleUpdateTeam} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm min-h-[44px] flex items-center justify-center gap-2">
                      <Save size={14} /> Save
                    </button>
                    <button onClick={() => setEditingTeam(null)} className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm min-h-[44px]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.player1_name} & {team.player2_name}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingTeam(team)}
                      className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Edit ${team.name}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Delete ${team.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {teams.length === 0 && !isAddingTeam && (
            <div className="p-8 text-center text-slate-400 text-sm">No teams set up yet</div>
          )}

          {isAddingTeam && (
            <div className="p-4 bg-slate-50 space-y-3">
              <input
                id="team-name"
                name="team-name"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name"
                aria-label="Team name"
                className="input input-bordered w-full min-h-[44px]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select id="team-p1" name="team-p1" aria-label="Player 1" value={newPlayer1} onChange={e => setNewPlayer1(e.target.value)} className="select select-bordered w-full min-h-[44px]">
                  <option value="">Player 1</option>
                  {availablePlayers.filter(p => p.id !== newPlayer2).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select id="team-p2" name="team-p2" aria-label="Player 2" value={newPlayer2} onChange={e => setNewPlayer2(e.target.value)} className="select select-bordered w-full min-h-[44px]">
                  <option value="">Player 2</option>
                  {availablePlayers.filter(p => p.id !== newPlayer1).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTeam}
                  disabled={!newTeamName || !newPlayer1 || !newPlayer2}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm min-h-[44px] disabled:opacity-50"
                >
                  Add Team
                </button>
                <button
                  onClick={() => setIsAddingTeam(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default function PlayersView({ players, scores, rounds, activeSeason, isReadOnlySeason, currentUser, showToast, showConfirm, setPlayers, onAddPlayer, managingPlayerId, setManagingPlayerId }) {
  const [adminTab, setAdminTab] = useState('players');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [teamsList, setTeamsList] = useState([]);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [buyInStatusCache, setBuyInStatusCache] = useState({});
  const [buyInLoaded, setBuyInLoaded] = useState(false);

  useEffect(() => {
    if (activeSeason) DB.getTeams(activeSeason.id).then(setTeamsList);
  }, [activeSeason]);

  useEffect(() => {
    let cancelled = false;
    setBuyInLoaded(false);
    const loadBuyInStatuses = async () => {
      if (!activeSeason?.id || players.length === 0) return;
      const results = await Promise.all(
        players.map(p => DB.getPlayerBuyInStatus(p.id, activeSeason.id).then(status => [p.id, status]))
      );
      if (cancelled) return;
      const cache = {};
      for (const [id, status] of results) cache[id] = status;
      setBuyInStatusCache(cache);
      setBuyInLoaded(true);
    };
    loadBuyInStatuses();
    return () => { cancelled = true; };
  }, [activeSeason?.id]);

  const playersWithStats = useMemo(() => {
    const seasonRoundIds = new Set(rounds.map(r => r.id));
    return players.map(player => {
      const playerScores = scores[player.id] || {};
      let roundsPlayed = 0;
      let totalFines = 0;
      let totalStrokes = 0;
      for (const [roundId, s] of Object.entries(playerScores)) {
        if (!seasonRoundIds.has(Number(roundId))) continue;
        if (s.strokes > 0) {
          roundsPlayed++;
          totalStrokes += s.strokes;
        }
        totalFines += s.fines || 0;
      }
      const avgScore = roundsPlayed > 0 ? Math.round(totalStrokes / roundsPlayed) : 0;
      return { ...player, roundsPlayed, totalFines, avgScore };
    });
  }, [players, scores, rounds]);

  const filteredPlayers = useMemo(() => {
    let filtered = playersWithStats.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'rounds': return b.roundsPlayed - a.roundsPlayed;
        case 'fines': return b.totalFines - a.totalFines;
        case 'avg': return a.avgScore - b.avgScore;
        default: return 0;
      }
    });

    return filtered;
  }, [playersWithStats, searchTerm, statusFilter, sortBy]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Players & Teams</h2>
        {!isReadOnlySeason && adminTab === 'players' && (
          <button
            onClick={onAddPlayer}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus size={16} /> Add Player
          </button>
        )}
        {!isReadOnlySeason && adminTab === 'teams' && !isAddingTeam && teamsList.length < 4 && (
          <button
            onClick={() => setIsAddingTeam(true)}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus size={16} /> Add Team
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setAdminTab('players')}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-[44px] ${
            adminTab === 'players'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Players ({players.length})
        </button>
        <button
          onClick={() => setAdminTab('teams')}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-[44px] ${
            adminTab === 'teams'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Teams
        </button>
      </div>

      {/* Players Tab */}
      {adminTab === 'players' && <>
        {filteredPlayers.length === 0 && players.length === 0 ? (
          <NoPlayersEmptyState onAddPlayer={onAddPlayer} />
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No players match your search.</div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {filteredPlayers.map(p => {
                const buyInStatus = buyInStatusCache[p.id] || { isPaid: false };
                return (
                  <button
                    key={p.id}
                    onClick={() => setManagingPlayerId(p.id)}
                    className="w-full flex items-center gap-3 p-3 md:p-4 hover:bg-slate-50 transition-colors text-left min-h-[64px]"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {p.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm truncate">{p.name}</span>
                        {p.role === 'master' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Master</span>}
                        {p.role === 'admin' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Admin</span>}
                        {p.status === 'inactive' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">Inactive</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{p.email}</p>
                    </div>

                    {/* Quick Stats (desktop) */}
                    <div className="hidden md:flex items-center gap-6 flex-shrink-0 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Rounds</p>
                        <p className="text-sm font-bold text-slate-700">{p.roundsPlayed}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Avg</p>
                        <p className="text-sm font-bold text-slate-700">{p.avgScore || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Fines</p>
                        <p className="text-sm font-bold text-red-600">R{p.totalFines}</p>
                      </div>
                    </div>

                    {/* Buy-In Badge */}
                    <span className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full font-bold ${
                      !buyInLoaded ? 'bg-slate-100 text-slate-400' :
                      buyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {!buyInLoaded ? '...' : buyInStatus.isPaid ? 'Paid' : 'Due'}
                    </span>

                    {/* Chevron */}
                    <ChevronDown size={16} className="-rotate-90 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </>}

      {/* Teams Tab */}
      {adminTab === 'teams' && (
        <TeamManagementSection
          teams={teamsList}
          setTeams={setTeamsList}
          isAddingTeam={isAddingTeam}
          setIsAddingTeam={setIsAddingTeam}
          players={players}
          activeSeason={activeSeason}
          showToast={showToast}
        />
      )}
    </div>
  );
}

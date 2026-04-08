import { useState, useEffect } from 'react';
import { Save, Camera, ChevronDown } from 'lucide-react';
import * as DB from '../api.ts';
import { TabBar, Avatar, PlayerRoundsTable, FinesSummaryCards, StatsGrid, usePlayerStats } from './common';

const Card = ({ children, className = '' }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>{children}</div>
);

const badgeStyles = {
  neutral: 'badge badge-ghost badge-sm',
  success: 'badge badge-success badge-sm',
  danger: 'badge badge-error badge-sm',
  warning: 'badge badge-ghost badge-sm',
};

export default function PlayerProfilePage({ players, setPlayers, scores, rounds, activeSeason, currentUser, managingPlayerId, setManagingPlayerId, showToast }) {
  const player = players.find(p => p.id === managingPlayerId);
  const [formData, setFormData] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [playerBuyIn, setPlayerBuyIn] = useState({ isPaid: false, date: null });
  const [playerFinesSummary, setPlayerFinesSummary] = useState({ total_fines: 0, paid_fines: 0, outstanding_fines: 0 });
  const [profileTab, setProfileTab] = useState('stats');

  useEffect(() => {
    if (player) {
      setFormData({ name: player.name, email: player.email, role: player.role, status: player.status, password: '' });
      setAvatarPreview(player.avatar);
      if (activeSeason?.id) {
        DB.getPlayerBuyInStatus(player.id, activeSeason.id).then(setPlayerBuyIn);
        DB.getPlayerFinesSummary(player.id, activeSeason.id).then(setPlayerFinesSummary);
      }
    }
  }, [managingPlayerId, player?.id, activeSeason?.id]);

  if (!player) return null;

  const { playerScores, roundsPlayed, totalStrokes, totalStableford, avgScore } = usePlayerStats(player.id, scores, rounds);

  const handleSave = async (e) => {
    e.preventDefault();
    const updates = { name: formData.name, email: formData.email, status: formData.status };
    if (currentUser.role === 'master' && player.role !== 'master') updates.role = formData.role;
    if (formData.password?.trim()) updates.password = formData.password;
    if (avatarPreview !== player.avatar) updates.avatar = avatarPreview;
    await DB.updatePlayer(player.id, updates);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...updates } : p));
    showToast(`${formData.name} updated successfully!`, 'success');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { showToast('Image too large. Max 500KB.', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'rounds', label: 'Rounds' },
    { id: 'fines', label: 'Fines' },
    { id: 'edit', label: 'Edit' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      {/* Back Button */}
      <button
        onClick={() => setManagingPlayerId(null)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 min-h-[44px]"
      >
        <ChevronDown size={16} className="rotate-90" /> Back to Players
      </button>

      {/* Unified Profile Card */}
      <Card>
        {/* Profile Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt={player.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl ring-2 ring-emerald-200">
                  {player.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-800 truncate">{player.name}</h2>
              <p className="text-sm text-slate-500 truncate">{player.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={badgeStyles[player.role === 'master' || player.role === 'admin' ? 'warning' : 'neutral']}>
                  {player.role === 'master' ? 'Master' : player.role}
                </span>
                <span className={badgeStyles[player.status === 'active' ? 'success' : 'danger']}>{player.status}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  playerBuyIn.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  Buy-In: {playerBuyIn.isPaid ? 'Paid' : 'Due'}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{roundsPlayed}/{rounds.length} Rounds</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Avg {avgScore || '-'}</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">SF {totalStableford || '-'}</span>
            <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">Fines R{playerFinesSummary.total_fines.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-slate-200">
          <TabBar tabs={tabs} active={profileTab} onChange={setProfileTab} />
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Stats Tab */}
          {profileTab === 'stats' && (
            <StatsGrid roundsPlayed={roundsPlayed} totalRounds={rounds.length} avgScore={avgScore} totalStrokes={totalStrokes} totalStableford={totalStableford} />
          )}

          {/* Rounds Tab */}
          {profileTab === 'rounds' && (
            <PlayerRoundsTable rounds={rounds} playerScores={playerScores} />
          )}

          {/* Fines Tab */}
          {profileTab === 'fines' && (
            <div className="space-y-4">
              <FinesSummaryCards summary={playerFinesSummary} />

              {/* Buy-In */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Season Buy-In</p>
                  <p className="text-xs text-slate-500">R{activeSeason?.buy_in_amount?.toLocaleString() || '2,500'} — {activeSeason?.name}</p>
                  {playerBuyIn.date && <p className="text-xs text-slate-400 mt-0.5">Paid {playerBuyIn.date}</p>}
                </div>
                <button
                  onClick={async () => {
                    if (!activeSeason?.id) return;
                    await DB.markBuyInPaid(player.id, activeSeason.id, !playerBuyIn.isPaid);
                    setPlayerBuyIn({ isPaid: !playerBuyIn.isPaid, date: !playerBuyIn.isPaid ? new Date().toISOString().split('T')[0] : null });
                    showToast(`Buy-in ${!playerBuyIn.isPaid ? 'marked as paid' : 'marked as outstanding'}`, 'success');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
                    playerBuyIn.isPaid
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {playerBuyIn.isPaid ? 'Paid' : 'Mark Paid'}
                </button>
              </div>
            </div>
          )}

          {/* Edit Tab */}
          {profileTab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                      {player.name.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors text-sm text-slate-600 min-h-[44px]">
                  <Camera size={16} /> Change Photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="pp-name" className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
                  <input
                    id="pp-name"
                    name="playerName"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input input-bordered w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="pp-email" className="text-sm font-medium text-slate-700 mb-1 block">Email Address</label>
                  <input
                    id="pp-email"
                    name="playerEmail"
                    required
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input input-bordered w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="pp-password" className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
                  <input
                    id="pp-password"
                    name="playerPassword"
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password || ''}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="input input-bordered w-full min-h-[44px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentUser.role === 'master' && player.role !== 'master' && (
                    <div>
                      <label htmlFor="pp-role" className="text-sm font-medium text-slate-700 mb-1 block">Role</label>
                      <select
                        id="pp-role"
                        name="playerRole"
                        value={formData.role || 'player'}
                        onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        className="select select-bordered w-full min-h-[44px]"
                      >
                        <option value="player">Player</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor="pp-status" className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                    <select
                      id="pp-status"
                      name="playerStatus"
                      value={formData.status || 'active'}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="select select-bordered w-full min-h-[44px]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px]">
                <Save size={16} /> Save Changes
              </button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

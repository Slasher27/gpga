import { useState, useEffect, type FormEvent, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { Save, Camera, ChevronDown, Trash2 } from 'lucide-react';
import * as DB from '../api';
import type { Player, Season, ScoresMapFull, Round, Role, Status, PlayerUpdate, BuyInStatus, FinesSummary } from '../api';
import { TabBar, Avatar, PlayerRoundsTable, FinesSummaryCards, StatsGrid, usePlayerStats, Card, useConfirm, SubmitButton } from './common';

const badgeStyles: Record<string, string> = {
  neutral: 'badge badge-ghost badge-sm',
  success: 'badge badge-success badge-sm',
  danger: 'badge badge-error badge-sm',
  warning: 'badge badge-ghost badge-sm',
};

type EditForm = { name: string; email: string; role: Role; status: Status; password: string };

interface PlayerProfilePageProps {
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  scores: ScoresMapFull;
  rounds: Round[];
  activeSeason: Season | null;
  currentUser: Player;
  managingPlayerId: string | null;
  setManagingPlayerId: Dispatch<SetStateAction<string | null>>;
  showToast: (msg: string, type?: string) => void;
}

export default function PlayerProfilePage({ players, setPlayers, scores, rounds, activeSeason, currentUser, managingPlayerId, setManagingPlayerId, showToast }: PlayerProfilePageProps) {
  const player = players.find(p => p.id === managingPlayerId);
  const [formData, setFormData] = useState<Partial<EditForm>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [playerBuyIn, setPlayerBuyIn] = useState<BuyInStatus>({ isPaid: false, date: null });
  const [playerFinesSummary, setPlayerFinesSummary] = useState<FinesSummary>({
    total_fines: 0, paid_fines: 0, outstanding_fines: 0, confirmed_rounds: 0, total_rounds_with_fines: 0,
  });
  const [profileTab, setProfileTab] = useState('stats');
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [busy, setBusy] = useState(false); // shared: save / delete / buy-in toggle are mutually exclusive
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // Seed the edit form whenever the managed player (or their data) changes.
  useEffect(() => {
    if (!player) return;
    setFormData({ name: player.name, email: player.email, role: player.role, status: player.status, password: '' });
    setAvatarPreview(player.avatar);
  }, [player]);

  // Load buy-in / fines summary for the selected player + season.
  const playerId = player?.id;
  useEffect(() => {
    if (!playerId || !activeSeason?.id) return;
    let cancelled = false;
    setSummaryLoaded(false);
    Promise.all([
      DB.getPlayerBuyInStatus(playerId, activeSeason.id),
      DB.getPlayerFinesSummary(playerId, activeSeason.id),
    ]).then(([buyIn, fines]) => {
      if (cancelled) return;
      setPlayerBuyIn(buyIn);
      setPlayerFinesSummary(fines);
      setSummaryLoaded(true);
    });
    return () => { cancelled = true; };
  }, [playerId, activeSeason?.id]);

  const { playerScores, roundsPlayed, totalStrokes, totalStableford, avgScore } = usePlayerStats(player?.id ?? '', scores, rounds);

  if (!player) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const updates: PlayerUpdate = { name: formData.name, email: formData.email, status: formData.status };
    if (currentUser.role === 'master' && player.role !== 'master') updates.role = formData.role;
    if (formData.password?.trim()) updates.password = formData.password;
    if (avatarPreview !== player.avatar) updates.avatar = avatarPreview;
    setBusy(true);
    try {
      await DB.updatePlayer(player.id, updates);
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...updates } : p));
      showToast(`${formData.name} updated successfully!`, 'success');
    } finally {
      setBusy(false);
    }
  };

  const canDelete = currentUser.role === 'master' && player.role !== 'master' && player.id !== currentUser.id;

  const handleDeletePlayer = () => {
    confirm(
      `Delete ${player.name}?`,
      `This permanently removes ${player.name} and all their scores and fines. This cannot be undone.`,
      async () => {
        setBusy(true);
        try {
          await DB.deletePlayer(player.id);
          setPlayers(prev => prev.filter(p => p.id !== player.id));
          showToast(`${player.name} deleted`, 'success');
          setManagingPlayerId(null);
        } finally {
          setBusy(false);
        }
      }
    );
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { showToast('Image too large. Max 500KB.', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Editing player details (name/email/password/status/role) is master-only.
  // Admins get view access + the buy-in/fines "mark paid" actions.
  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'rounds', label: 'Rounds' },
    { id: 'fines', label: 'Fines' },
    ...(currentUser.role === 'master' ? [{ id: 'edit', label: 'Edit' }] : []),
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
                  !summaryLoaded ? 'bg-slate-100 text-slate-400' : playerBuyIn.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  Buy-In: {!summaryLoaded ? '…' : playerBuyIn.isPaid ? 'Paid' : 'Due'}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{roundsPlayed}/{rounds.length} Rounds</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Avg {avgScore || '-'}</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">SF {totalStableford || '-'}</span>
            <span className={`px-2.5 py-1 rounded-full font-medium ${!summaryLoaded ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600'}`}>Fines {!summaryLoaded ? '…' : `R${playerFinesSummary.total_fines.toLocaleString()}`}</span>
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
                <SubmitButton
                  type="button"
                  pending={busy}
                  onClick={async () => {
                    if (!activeSeason?.id) return;
                    setBusy(true);
                    try {
                      await DB.markBuyInPaid(player.id, activeSeason.id, !playerBuyIn.isPaid);
                      setPlayerBuyIn({ isPaid: !playerBuyIn.isPaid, date: !playerBuyIn.isPaid ? new Date().toISOString().split('T')[0] : null });
                      showToast(`Buy-in ${!playerBuyIn.isPaid ? 'marked as paid' : 'marked as outstanding'}`, 'success');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] disabled:opacity-60 ${
                    playerBuyIn.isPaid
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {playerBuyIn.isPaid ? 'Paid' : 'Mark Paid'}
                </SubmitButton>
              </div>
            </div>
          )}

          {/* Edit Tab — master only */}
          {profileTab === 'edit' && currentUser.role === 'master' && (
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
                  <input id="pp-avatar-upload" name="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" aria-label="Upload avatar image" />
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
                        onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
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
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as Status }))}
                      className="select select-bordered w-full min-h-[44px]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <SubmitButton type="submit" pending={busy} pendingLabel="Saving…" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60">
                <Save size={16} /> Save Changes
              </SubmitButton>
              {canDelete && (
                <SubmitButton type="button" pending={busy} pendingLabel="Deleting…" onClick={handleDeletePlayer} className="w-full mt-2 bg-white text-red-600 border border-red-200 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60">
                  <Trash2 size={16} /> Delete Player
                </SubmitButton>
              )}
            </form>
          )}
        </div>
      </Card>
      <ConfirmDialogComponent />
    </div>
  );
}

import { useState, useEffect, type FormEvent, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { Save, Camera, Mail, Bell } from 'lucide-react';
import * as DB from '../api';
import type { Player, Season, ScoresMapFull, Round, PlayerUpdate, BuyInStatus, FinesSummary } from '../api';
import { TabBar, Avatar, PlayerRoundsTable, FinesSummaryCards, StatsGrid, usePlayerStats, Card, SubmitButton } from './common';

interface ProfileViewProps {
  currentUser: Player;
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  scores: ScoresMapFull;
  rounds: Round[];
  activeSeason: Season | null;
  showToast: (msg: string, type?: string) => void;
}

export default function ProfileView({ currentUser, setPlayers, scores, rounds, activeSeason, showToast }: ProfileViewProps) {
  const [profileTab, setProfileTab] = useState('stats');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileBuyInStatus, setProfileBuyInStatus] = useState<BuyInStatus>({ isPaid: false, date: null });
  const [profileFinesSummary, setProfileFinesSummary] = useState<FinesSummary>({
    total_fines: 0, paid_fines: 0, outstanding_fines: 0, confirmed_rounds: 0, total_rounds_with_fines: 0,
  });
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [formData, setFormData] = useState({ name: currentUser.name, email: currentUser.email, password: '' });
  const [notifyEmail, setNotifyEmail] = useState(currentUser.notify_email !== 0);
  const [notifyPush, setNotifyPush] = useState(currentUser.notify_push !== 0);

  const toggleNotifyPref = async (field: 'notify_email' | 'notify_push', value: boolean) => {
    const update: PlayerUpdate = { [field]: value ? 1 : 0 };
    await DB.updatePlayer(currentUser.id, update);
    setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...update } : p));
    showToast(`${field === 'notify_email' ? 'Email' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}`);
  };

  useEffect(() => {
    if (!currentUser?.id || !activeSeason?.id) return;
    let cancelled = false;
    setSummaryLoaded(false);
    Promise.all([
      DB.getPlayerBuyInStatus(currentUser.id, activeSeason.id),
      DB.getPlayerFinesSummary(currentUser.id, activeSeason.id),
    ]).then(([buyIn, fines]) => {
      if (cancelled) return;
      setProfileBuyInStatus(buyIn);
      setProfileFinesSummary(fines);
      setSummaryLoaded(true);
    });
    return () => { cancelled = true; };
  }, [activeSeason?.id, currentUser?.id]);

  const { playerScores, roundsPlayed, totalStrokes, totalStableford, avgScore } = usePlayerStats(currentUser.id, scores, rounds);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const updates: PlayerUpdate = { name: formData.name, email: formData.email };
    if (formData.password?.trim()) updates.password = formData.password;
    setSavingProfile(true);
    try {
      await DB.updatePlayer(currentUser.id, updates);
      setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...updates } : p));
      showToast('Profile updated!', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      showToast("File too large for browser storage. Please use a smaller image (<500kb).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const avatar = reader.result as string;
      await DB.updatePlayer(currentUser.id, { avatar });
      setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, avatar } : p));
    };
    reader.readAsDataURL(file);
  };

  const profileTabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'rounds', label: 'Rounds' },
    { id: 'fines', label: 'Fines' },
    { id: 'edit', label: 'Edit' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">My Profile</h2>
      </div>

      <Card>
        {/* Profile Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl ring-2 ring-emerald-200">
                  {currentUser.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 truncate">{currentUser.name}</h3>
              <p className="text-sm text-slate-500 truncate">{currentUser.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold capitalize">{currentUser.role}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${!summaryLoaded ? 'bg-slate-100 text-slate-400' : profileBuyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  Buy-In: {!summaryLoaded ? '…' : profileBuyInStatus.isPaid ? 'Paid' : 'Due'}
                </span>
              </div>
            </div>
          </div>
          {/* Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{roundsPlayed}/{rounds.length} Rounds</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Avg {avgScore || '-'}</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">SF {totalStableford || '-'}</span>
            <span className={`px-2.5 py-1 rounded-full font-medium ${!summaryLoaded ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600'}`}>Fines {!summaryLoaded ? '…' : `R${profileFinesSummary.total_fines.toLocaleString()}`}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-slate-200">
          <TabBar tabs={profileTabs} active={profileTab} onChange={setProfileTab} />
        </div>

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
              <FinesSummaryCards summary={profileFinesSummary} />
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Season Buy-In</p>
                  <p className="text-xs text-slate-500">R{activeSeason?.buy_in_amount?.toLocaleString() || '2,500'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${!summaryLoaded ? 'bg-slate-100 text-slate-400' : profileBuyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {!summaryLoaded ? '…' : profileBuyInStatus.isPaid ? 'Paid' : 'Outstanding'}
                </span>
              </div>
            </div>
          )}

          {/* Edit Tab */}
          {profileTab === 'edit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column — Profile details */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors text-sm text-slate-600 min-h-[44px]">
                    <Camera size={16} /> Change Photo
                    <input id="profile-avatar-upload" name="avatar" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" aria-label="Upload avatar image" />
                  </label>
                </div>
                <div>
                  <label htmlFor="profile-name" className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
                  <input id="profile-name" name="name" required value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input input-bordered w-full min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="profile-email" className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                  <input id="profile-email" name="email" type="email" required value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input input-bordered w-full min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="profile-password" className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
                  <input id="profile-password" name="password" type="password" placeholder="Leave blank to keep current" value={formData.password} onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} className="input input-bordered w-full min-h-[44px]" />
                </div>
                <SubmitButton type="submit" pending={savingProfile} pendingLabel="Saving…" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60">
                  <Save size={16} /> Save Changes
                </SubmitButton>
              </form>

              {/* Right column — Notification preferences (auto-save) */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700">Notification Preferences</p>
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2 text-sm text-slate-600"><Mail size={15} /> Email notifications</span>
                    <span className="relative inline-block w-10 h-6 flex-shrink-0">
                      <input type="checkbox" className="peer sr-only" checked={notifyEmail}
                        onChange={() => { const v = !notifyEmail; setNotifyEmail(v); toggleNotifyPref('notify_email', v); }} />
                      <span className={`block w-10 h-6 rounded-full transition-colors ${notifyEmail ? 'bg-emerald-500' : 'bg-slate-300'} peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400`} />
                      <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${notifyEmail ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2 text-sm text-slate-600"><Bell size={15} /> Push notifications</span>
                    <span className="relative inline-block w-10 h-6 flex-shrink-0">
                      <input type="checkbox" className="peer sr-only" checked={notifyPush}
                        onChange={() => { const v = !notifyPush; setNotifyPush(v); toggleNotifyPref('notify_push', v); }} />
                      <span className={`block w-10 h-6 rounded-full transition-colors ${notifyPush ? 'bg-emerald-500' : 'bg-slate-300'} peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400`} />
                      <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${notifyPush ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </label>
                </div>
                <p className="text-xs text-slate-400">Changes save automatically. In-app notifications are always on.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

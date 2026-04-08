import { useState, useEffect } from 'react';
import { Save, Camera } from 'lucide-react';
import * as DB from '../api.ts';
import { TabBar, Avatar, PlayerRoundsTable, FinesSummaryCards, StatsGrid, usePlayerStats } from './common';

const Card = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>{children}</div>
);

export default function ProfileView({ currentUser, players, setPlayers, scores, rounds, activeSeason, showToast }) {
  const [profileTab, setProfileTab] = useState('stats');
  const [profileBuyInStatus, setProfileBuyInStatus] = useState({ isPaid: false });
  const [profileFinesSummary, setProfileFinesSummary] = useState({ total_fines: 0, paid_fines: 0, outstanding_fines: 0 });
  const [formData, setFormData] = useState({ name: currentUser.name, email: currentUser.email, password: '' });

  useEffect(() => {
    if (currentUser?.id && activeSeason?.id) {
      DB.getPlayerBuyInStatus(currentUser.id, activeSeason.id).then(setProfileBuyInStatus);
      DB.getPlayerFinesSummary(currentUser.id, activeSeason.id).then(setProfileFinesSummary);
    }
  }, [activeSeason?.id, currentUser?.id]);

  const { playerScores, roundsPlayed, totalStrokes, totalStableford, avgScore } = usePlayerStats(currentUser.id, scores, rounds);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updates = { name: formData.name, email: formData.email };
    if (formData.password?.trim()) updates.password = formData.password;
    await DB.updatePlayer(currentUser.id, updates);
    setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...updates } : p));
    showToast('Profile updated!', 'success');
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) {
      showToast("File too large for browser storage. Please use a smaller image (<500kb).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      await DB.updatePlayer(currentUser.id, { avatar: reader.result });
      setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, avatar: reader.result } : p));
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${profileBuyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  Buy-In: {profileBuyInStatus.isPaid ? 'Paid' : 'Due'}
                </span>
              </div>
            </div>
          </div>
          {/* Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{roundsPlayed}/{rounds.length} Rounds</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Avg {avgScore || '-'}</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">SF {totalStableford || '-'}</span>
            <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">Fines R{profileFinesSummary.total_fines.toLocaleString()}</span>
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${profileBuyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {profileBuyInStatus.isPaid ? 'Paid' : 'Outstanding'}
                </span>
              </div>
            </div>
          )}

          {/* Edit Tab */}
          {profileTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 mb-2">
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
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <div className="space-y-3">
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

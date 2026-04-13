// @ts-nocheck — legacy JS patterns; migrate to strict TS in a follow-up pass.
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, UserPlus } from 'lucide-react';
import * as DB from '../api.ts';
import { TabBar, Card } from './common';

const PrizeFields = ({ values, onChange, uncontrolled, prefix = '' }) => {
  const id = (field) => `${prefix}${field}`;
  const bind = (field) => uncontrolled
    ? { id: id(field), name: field, defaultValue: values[field] || '' }
    : { id: id(field), name: field, value: values[field] || '', onChange: e => onChange({ ...values, [field]: e.target.value === '' ? '' : Number(e.target.value) }) };
  return (
    <div className="pt-3 border-t border-slate-200">
      <p className="text-sm font-semibold text-slate-700 mb-3">Prize Pool</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={id('medal_1st')} className="block text-xs text-slate-500 mb-1">Medal 1st (R)</label><input type="number" {...bind('medal_1st')} className="input input-bordered w-full input-sm" /></div>
        <div><label htmlFor={id('medal_2nd')} className="block text-xs text-slate-500 mb-1">Medal 2nd (R)</label><input type="number" {...bind('medal_2nd')} className="input input-bordered w-full input-sm" /></div>
        <div><label htmlFor={id('stableford_1st')} className="block text-xs text-slate-500 mb-1">Stableford 1st (R)</label><input type="number" {...bind('stableford_1st')} className="input input-bordered w-full input-sm" /></div>
        <div><label htmlFor={id('stableford_2nd')} className="block text-xs text-slate-500 mb-1">Stableford 2nd (R)</label><input type="number" {...bind('stableford_2nd')} className="input input-bordered w-full input-sm" /></div>
        <div className="col-span-2"><label htmlFor={id('team_1st')} className="block text-xs text-slate-500 mb-1">Team 1st (R)</label><input type="number" {...bind('team_1st')} className="input input-bordered w-full input-sm" /></div>
      </div>
    </div>
  );
};

export default function SeasonSettings({ activeSeason, allSeasons, players, rounds, showToast, showConfirm, onDataChanged }) {
  const [tab, setTab] = useState(activeSeason ? 'edit' : 'create');
  const [seasonPlayers, setSeasonPlayers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (activeSeason) {
      setEditForm({
        name: activeSeason.name,
        year: activeSeason.year,
        buy_in_amount: activeSeason.buy_in_amount || 2500,
        medal_1st: activeSeason.medal_1st || 0,
        medal_2nd: activeSeason.medal_2nd || 0,
        stableford_1st: activeSeason.stableford_1st || 0,
        stableford_2nd: activeSeason.stableford_2nd || 0,
        team_1st: activeSeason.team_1st || 0,
      });
      DB.getSeasonPlayers(activeSeason.id).then(setSeasonPlayers);
      setTab('edit');
    }
  }, [activeSeason?.id]);

  const enrolledIds = new Set(seasonPlayers.map(sp => sp.player_id));
  const availablePlayers = players.filter(p => !enrolledIds.has(p.id) && p.status === 'active');

  const handleAddToSeason = async (playerId) => {
    await DB.addSeasonPlayer(activeSeason.id, playerId);
    setSeasonPlayers(await DB.getSeasonPlayers(activeSeason.id));
    showToast('Player added to season');
  };

  const handleRemoveFromSeason = async (playerId, playerName) => {
    showConfirm(`Remove ${playerName}?`, 'This will remove them from the season roster. Their scores and fines will remain.', async () => {
      await DB.removeSeasonPlayer(activeSeason.id, playerId);
      setSeasonPlayers(await DB.getSeasonPlayers(activeSeason.id));
      showToast(`${playerName} removed from season`);
    }, 'danger');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await DB.updateSeason(activeSeason.id, {
      name: editForm.name,
      year: Number(editForm.year) || 0,
      buy_in_amount: Number(editForm.buy_in_amount) || 0,
      medal_1st: Number(editForm.medal_1st) || 0,
      medal_2nd: Number(editForm.medal_2nd) || 0,
      stableford_1st: Number(editForm.stableford_1st) || 0,
      stableford_2nd: Number(editForm.stableford_2nd) || 0,
      team_1st: Number(editForm.team_1st) || 0,
    });
    await onDataChanged();
    showToast('Season settings saved');
  };

  const handleCreateSeason = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const fd = new FormData(e.target);
      await DB.createSeason(Number(fd.get('year')), fd.get('name'), Number(fd.get('buy_in_amount')), {
        medal_1st: Number(fd.get('medal_1st')) || 0,
        medal_2nd: Number(fd.get('medal_2nd')) || 0,
        stableford_1st: Number(fd.get('stableford_1st')) || 0,
        stableford_2nd: Number(fd.get('stableford_2nd')) || 0,
        team_1st: Number(fd.get('team_1st')) || 0,
      });
      await onDataChanged();
      showToast(`${fd.get('name')} created!`, 'success');
      setTab('edit');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndSeason = () => {
    const roundCount = rounds?.length || 0;
    const warning = roundCount < 9
      ? `The season has only completed ${roundCount} of 9 rounds. Are you sure you want to end it early?\n\nScores, fines, and standings will be locked. This cannot be undone.`
      : 'Scores, fines, and standings will be locked. You can still view the data but cannot make changes. This cannot be undone.';
    showConfirm(`End ${activeSeason.name}?`, warning, async () => {
      await DB.updateSeason(activeSeason.id, { is_active: false });
      await onDataChanged();
      showToast(`${activeSeason.name} has ended`, 'success');
    }, 'danger');
  };

  const handleOpenSeason = async () => {
    await DB.updateSeason(activeSeason.id, { is_active: true });
    await onDataChanged();
    showToast(`${activeSeason.name} is now active`, 'success');
  };

  const tabs = [];
  if (activeSeason) tabs.push({ id: 'edit', label: 'Settings' }, { id: 'players', label: `Players (${seasonPlayers.length})` });
  tabs.push({ id: 'create', label: '+ New Season' });

  // Shared prize fields renderer


  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Season Settings</h2>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* === Edit Season Tab === */}
      {tab === 'edit' && activeSeason && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${activeSeason.is_active ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100 border border-slate-200'}`}>
            <div>
              <p className="text-sm font-semibold text-slate-800">{activeSeason.name}</p>
              <p className={`text-xs ${activeSeason.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                {activeSeason.is_active ? 'Active' : 'Ended'}
              </p>
            </div>
            {activeSeason.is_active ? (
              <button onClick={handleEndSeason} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors min-h-[40px]">
                End Season
              </button>
            ) : (
              <button onClick={handleOpenSeason} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors min-h-[40px]">
                Reopen Season
              </button>
            )}
          </div>

          {/* Edit Form */}
          <Card>
            <form onSubmit={handleSaveSettings} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="edit-name" className="block text-xs text-slate-500 mb-1">Season Name</label>
                  <input id="edit-name" name="name" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required /></div>
                <div><label htmlFor="edit-year" className="block text-xs text-slate-500 mb-1">Year</label>
                  <input id="edit-year" name="year" type="number" value={editForm.year || ''} onChange={e => setEditForm(p => ({ ...p, year: e.target.value === '' ? '' : Number(e.target.value) }))} className="input input-bordered w-full" required /></div>
              </div>
              <div><label htmlFor="edit-buy-in" className="block text-xs text-slate-500 mb-1">Buy-in Amount (R)</label>
                <input id="edit-buy-in" name="buy_in_amount" type="number" value={editForm.buy_in_amount || ''} onChange={e => setEditForm(p => ({ ...p, buy_in_amount: e.target.value === '' ? '' : Number(e.target.value) }))} className="input input-bordered w-full" required /></div>

              <PrizeFields values={editForm} onChange={setEditForm} prefix="edit-" />

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px]">
                <Save size={16} /> Save Settings
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* === Season Players Tab === */}
      {tab === 'players' && activeSeason && (
        <div className="space-y-4">
          {/* Add Player */}
          {availablePlayers.length > 0 && (
            <Card>
              <div className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Add Player to Season</p>
                <div className="space-y-1.5">
                  {availablePlayers.map(p => (
                    <button key={p.id} onClick={() => handleAddToSeason(p.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50 transition-colors text-left min-h-[44px]">
                      <span className="text-sm text-slate-700">{p.name}</span>
                      <UserPlus size={16} className="text-emerald-500" />
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Enrolled Players */}
          <Card>
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">{activeSeason.name} Roster ({seasonPlayers.length})</p>
            </div>
            <div className="divide-y divide-slate-50">
              {seasonPlayers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No players enrolled yet</div>
              ) : seasonPlayers.map(sp => (
                <div key={sp.player_id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{sp.name}</p>
                    <p className="text-xs text-slate-400">{sp.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sp.buy_in_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {sp.buy_in_paid ? 'Paid' : 'Due'}
                    </span>
                    <button onClick={() => handleRemoveFromSeason(sp.player_id, sp.name)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* === Create New Season Tab === */}
      {tab === 'create' && (
        <Card>
          <form onSubmit={handleCreateSeason} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="new-year" className="block text-xs text-slate-500 mb-1">Year</label>
                <input id="new-year" name="year" type="number" defaultValue={new Date().getFullYear() + 1} className="input input-bordered w-full" required /></div>
              <div><label htmlFor="new-name" className="block text-xs text-slate-500 mb-1">Season Name</label>
                <input id="new-name" name="name" type="text" defaultValue={`GPGA ${new Date().getFullYear() + 1} Season`} className="input input-bordered w-full" required /></div>
            </div>
            <div><label htmlFor="new-buy-in" className="block text-xs text-slate-500 mb-1">Buy-in Amount (R)</label>
              <input id="new-buy-in" name="buy_in_amount" type="number" defaultValue={2500} className="input input-bordered w-full" required /></div>

            <PrizeFields values={{ medal_1st: 3000, medal_2nd: 2000, stableford_1st: 2000, stableford_2nd: 1000, team_1st: 0 }} uncontrolled prefix="new-" />

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
              Creating a new season will deactivate the current one.
            </div>

            <button type="submit" disabled={isCreating}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50">
              <Plus size={16} /> {isCreating ? 'Creating...' : 'Create Season'}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

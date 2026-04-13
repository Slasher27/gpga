import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, Edit, Save, X } from 'lucide-react';
import * as DB from '../api.ts';
import { TabBar, Card } from './common';

// Tiered fine total: first N units at base amount, remainder at tier_amount.
// Mirrors FINE_TOTAL_SQL in server/routes/fines.ts — keep in sync.
function calcFineTotal(quantity, amount, tierThreshold = 0, tierAmount = 0) {
  const qty = Number(quantity) || 0;
  const base = Number(amount) || 0;
  const threshold = Number(tierThreshold) || 0;
  const tier = Number(tierAmount) || 0;
  if (threshold > 0 && qty > threshold) {
    return threshold * base + (qty - threshold) * tier;
  }
  return qty * base;
}

export default function FinancesView({
  leaderboardData, rounds, scores, players, activeSeason,
  isReadOnlySeason, currentUser, showToast,
  onAddFineType, onDeleteFineType, onFinesChanged, fineTypesVersion = 0
}) {
  const isAdmin = currentUser.role === 'master' || currentUser.role === 'admin';
  const sortedByFines = useMemo(() => [...leaderboardData].sort((a, b) => b.totalFines - a.totalFines), [leaderboardData]);
  const totalFinesPot = useMemo(() => leaderboardData.reduce((acc, p) => acc + p.totalFines, 0), [leaderboardData]);
  const mostRecentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  // --- State ---
  const [finesTab, setFinesTab] = useState(() => isAdmin ? 'assign' : 'history');
  const [selectedRound, setSelectedRound] = useState(mostRecentRound?.id || null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [fineTypes, setFineTypes] = useState([]);
  const [playerFines, setPlayerFines] = useState([]);
  const [isRoundConfirmed, setIsRoundConfirmed] = useState(false);
  const [roundFinesData, setRoundFinesData] = useState([]);
  const [roundViewPlayerFilter, setRoundViewPlayerFilter] = useState('all');
  const [expandedRoundViewPlayers, setExpandedRoundViewPlayers] = useState({});
  const [paymentSummaryData, setPaymentSummaryData] = useState([]);
  const [expandedPlayers, setExpandedPlayers] = useState({});
  const [playerRoundFinesCache, setPlayerRoundFinesCache] = useState({});
  const [editingFineType, setEditingFineType] = useState(null);
  const [buyInStatuses, setBuyInStatuses] = useState({});
  const [showOpenFine, setShowOpenFine] = useState(false);
  const [openFineName, setOpenFineName] = useState('');
  const [openFineAmount, setOpenFineAmount] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (mostRecentRound && selectedRound !== mostRecentRound.id) setSelectedRound(mostRecentRound.id);
  }, [rounds.length]);

  useEffect(() => {
    if (activeSeason) {
      DB.getFineTypes(activeSeason.id).then(setFineTypes);
      DB.getSeasonPlayers(activeSeason.id).then(sp => {
        const cache = {};
        for (const p of sp) cache[p.player_id] = { isPaid: p.buy_in_paid, date: p.buy_in_date };
        setBuyInStatuses(cache);
      });
    }
  }, [activeSeason, players.length, fineTypesVersion]);

  useEffect(() => {
    if (selectedPlayer && selectedRound) {
      DB.getPlayerFinesForRound(selectedPlayer, selectedRound).then(setPlayerFines);
    } else setPlayerFines([]);
  }, [selectedPlayer, selectedRound]);

  useEffect(() => {
    if (selectedPlayer && selectedRound) {
      DB.isPlayerRoundConfirmed(selectedPlayer, selectedRound).then(setIsRoundConfirmed);
    } else setIsRoundConfirmed(false);
  }, [selectedPlayer, selectedRound]);

  useEffect(() => {
    if (selectedRound) DB.getRoundFines(selectedRound).then(setRoundFinesData);
  }, [selectedRound]);

  useEffect(() => {
    if (activeSeason) DB.getPaymentSummary(activeSeason.id).then(setPaymentSummaryData);
    setPlayerRoundFinesCache({});
    setExpandedPlayers({});
  }, [activeSeason]);

  // --- Handlers ---
  const refreshTimer = useRef(null);
  const refreshLocalData = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      if (activeSeason) DB.getPaymentSummary(activeSeason.id).then(setPaymentSummaryData);
      if (selectedRound) DB.getRoundFines(selectedRound).then(setRoundFinesData);
      onFinesChanged?.();
    }, 500);
  }, [activeSeason, selectedRound, onFinesChanged]);
  const handleAddFine = async (fineTypeId) => {
    if (!selectedPlayer || !selectedRound) return;
    const existing = playerFines.find(pf => pf.fine_type_id === fineTypeId);
    const newQty = (existing?.quantity || 0) + 1;
    setPlayerFines(prev => {
      const idx = prev.findIndex(pf => pf.fine_type_id === fineTypeId);
      if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...updated[idx], quantity: newQty }; return updated; }
      const ft = fineTypes.find(f => f.id === fineTypeId);
      return [...prev, { fine_type_id: fineTypeId, quantity: 1, amount: ft?.amount || 0, name: ft?.name || '' }];
    });
    await DB.setPlayerFine(selectedPlayer, selectedRound, fineTypeId, newQty);
    refreshLocalData();
  };
  const handleRemoveFine = async (fineTypeId) => {
    if (!selectedPlayer || !selectedRound) return;
    const existing = playerFines.find(pf => pf.fine_type_id === fineTypeId);
    if (!existing || existing.quantity <= 0) return;
    const newQty = existing.quantity - 1;
    setPlayerFines(prev => prev.map(pf => pf.fine_type_id === fineTypeId ? { ...pf, quantity: newQty } : pf).filter(pf => pf.quantity > 0));
    await DB.setPlayerFine(selectedPlayer, selectedRound, fineTypeId, newQty);
    refreshLocalData();
  };
  const handleSaveFineType = async () => {
    if (!editingFineType) return;
    await DB.updateFineType(editingFineType.id, {
      name: editingFineType.name,
      amount: editingFineType.amount,
      sort_order: editingFineType.sort_order,
      description: editingFineType.description,
      tier_threshold: editingFineType.tier_threshold || 0,
      tier_amount: editingFineType.tier_amount || 0
    });
    setFineTypes(prev => prev.map(ft => ft.id === editingFineType.id ? { ...ft, ...editingFineType } : ft).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name)));
    setEditingFineType(null);
    showToast('Fine type updated');
  };
  const handleAddOpenFine = async () => {
    if (!openFineName.trim() || !openFineAmount || !activeSeason || !selectedPlayer || !selectedRound) return;
    const amount = parseInt(openFineAmount);
    if (amount <= 0) return;
    const result = await DB.addFineType(activeSeason.id, openFineName.trim(), amount, '', 999, true);
    await DB.addPlayerFine(selectedPlayer, selectedRound, result.id);
    setFineTypes(prev => [...prev, { id: result.id, name: openFineName.trim(), amount, is_open: 1, sort_order: 999 }]);
    setPlayerFines(await DB.getPlayerFinesForRound(selectedPlayer, selectedRound));
    setOpenFineName(''); setOpenFineAmount(''); setShowOpenFine(false);
    refreshLocalData();
    showToast(`Open fine "${openFineName.trim()}" added`);
  };

  const playerFinesTotal = playerFines.reduce((sum, f) => sum + calcFineTotal(f.quantity, f.amount, f.tier_threshold, f.tier_amount), 0);
  const buyInAmount = activeSeason?.buy_in_amount || 2500;
  const paidBuyIns = Object.values(buyInStatuses).filter(s => s.isPaid).length;
  const totalBuyInPool = paidBuyIns * buyInAmount;
  const finesPaid = paymentSummaryData.reduce((sum, p) => sum + p.paid_fines, 0);
  const finesOutstanding = paymentSummaryData.reduce((sum, p) => sum + p.unpaid_fines, 0);

  // --- Tabs ---
  const tabs = [];
  if (!isReadOnlySeason && isAdmin) tabs.push({ id: 'assign', label: 'Start Fines' }, { id: 'types', label: 'Fine Sheet' });
  tabs.push({ id: 'history', label: 'History' }, { id: 'payments', label: 'Payments' });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Finances</h2>
      </div>

      {/* --- Financial Dashboard --- */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-emerald-600 uppercase font-medium">Buy-In Pool</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">R{totalBuyInPool.toLocaleString()}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{paidBuyIns}/{players.length} paid</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-red-500 uppercase font-medium">Fines Pot</p>
          <p className="text-xl font-bold text-red-700 mt-1">R{finesPaid.toLocaleString()}</p>
          {finesOutstanding > 0 && (
            <p className="text-xs text-red-400 mt-0.5">R{finesOutstanding.toLocaleString()} outstanding</p>
          )}
        </div>
      </div>

      {/* Fines Leaderboard (compact) */}
      <Card>
        <div className="p-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase">Fines Leaderboard</p>
        </div>
        <div className="divide-y divide-slate-50">
          {sortedByFines.slice(0, 8).map((player, idx) => (
            <div key={player.id} className="flex items-center gap-3 px-3 py-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                idx === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{idx + 1}</span>
              <span className="flex-1 text-sm text-slate-800 truncate">{player.name}</span>
              <span className="text-sm font-bold text-red-600 flex-shrink-0">R{player.totalFines.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* --- Tabs --- */}
      <TabBar tabs={tabs} active={finesTab} onChange={setFinesTab} />

      {/* === Start Fines Tab === */}
      {isAdmin && finesTab === 'assign' && (
        <Card>
          <div className="p-4 space-y-4">
            {/* Round + Player selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select id="fines-select-round" value={selectedRound || ''} onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                className="select select-bordered w-full min-h-[44px]" aria-label="Select round">
                <option value="">Select Round</option>
                {rounds.map(r => <option key={r.id} value={r.id}>{r.name} — {r.course_name}</option>)}
              </select>
              <select id="fines-select-player" value={selectedPlayer || ''} onChange={(e) => setSelectedPlayer(e.target.value)}
                className="select select-bordered w-full min-h-[44px]" aria-label="Select player">
                <option value="">Select Player</option>
                {players.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedPlayer && selectedRound ? (
              <>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700">{players.find(p => p.id === selectedPlayer)?.name}</p>
                    <button onClick={() => { setSelectedPlayer(null); setPlayerFines([]); }} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="font-bold text-red-600">R{playerFinesTotal}</p>
                </div>

                {/* Confirmed banner */}
                {isRoundConfirmed && (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-slate-600">Fines confirmed — reopen to edit</p>
                  </div>
                )}

                {/* Standard fines */}
                <div className={`space-y-1.5 max-h-[50vh] overflow-y-auto ${isRoundConfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
                  {fineTypes.filter(ft => !ft.is_open).map(ft => {
                    const qty = playerFines.find(pf => pf.fine_type_id === ft.id)?.quantity || 0;
                    const rowTotal = calcFineTotal(qty, ft.amount, ft.tier_threshold, ft.tier_amount);
                    const hasTier = Number(ft.tier_threshold) > 0;
                    return (
                      <div key={ft.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{ft.name}</p>
                          <p className="text-[10px] text-slate-400">
                            R{ft.amount}{hasTier && <> · R{ft.tier_amount} after {ft.tier_threshold}</>}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleRemoveFine(ft.id)} disabled={qty === 0} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 transition-colors font-bold min-h-[36px]">-</button>
                        <span className="w-6 text-center font-bold text-sm text-slate-800">{qty}</span>
                        <button type="button" onClick={() => handleAddFine(ft.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors font-bold min-h-[36px]">+</button>
                        <span className="w-14 text-right text-sm font-semibold text-slate-600">R{rowTotal}</span>
                      </div>
                    );
                  })}

                  {/* Open fines already assigned */}
                  {fineTypes.filter(ft => ft.is_open).map(ft => {
                    const qty = playerFines.find(pf => pf.fine_type_id === ft.id)?.quantity || 0;
                    if (qty === 0) return null;
                    const rowTotal = calcFineTotal(qty, ft.amount, ft.tier_threshold, ft.tier_amount);
                    return (
                      <div key={ft.id} className="flex items-center gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{ft.name} <span className="text-[10px] text-slate-400">open</span></p>
                          <p className="text-[10px] text-slate-400">R{ft.amount}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveFine(ft.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-bold min-h-[36px]">-</button>
                        <span className="w-6 text-center font-bold text-sm text-slate-800">{qty}</span>
                        <button type="button" onClick={() => handleAddFine(ft.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors font-bold min-h-[36px]">+</button>
                        <span className="w-14 text-right text-sm font-semibold text-slate-600">R{rowTotal}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Open Fine form — only when not confirmed */}
                {!isRoundConfirmed && (
                  showOpenFine ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <input id="open-fine-name" name="open-fine-name" aria-label="Fine name" value={openFineName} onChange={e => setOpenFineName(e.target.value)} placeholder="Fine name"
                        className="input input-bordered input-sm flex-1 min-h-[36px]" autoComplete="off" />
                      <input id="open-fine-amount" name="open-fine-amount" aria-label="Fine amount" type="number" value={openFineAmount} onChange={e => setOpenFineAmount(e.target.value)} placeholder="R" min="1"
                        className="input input-bordered input-sm w-20 min-h-[36px]" autoComplete="off" />
                      <button onClick={handleAddOpenFine} disabled={!openFineName.trim() || !openFineAmount}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-30 min-h-[36px]">Add</button>
                      <button onClick={() => { setShowOpenFine(false); setOpenFineName(''); setOpenFineAmount(''); }}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 min-h-[36px]"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowOpenFine(true)} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 min-h-[44px]">
                      + Open Fine
                    </button>
                  )
                )}

                {/* Confirm / Reopen */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                  <button onClick={async () => {
                    await DB.confirmPlayerRoundFines(selectedPlayer, selectedRound, !isRoundConfirmed);
                    setIsRoundConfirmed(!isRoundConfirmed);
                    showToast(isRoundConfirmed ? 'Fines reopened' : 'Fines confirmed!', isRoundConfirmed ? 'info' : 'success');
                  }} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                    isRoundConfirmed ? 'bg-slate-500 text-white hover:bg-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}>
                    {isRoundConfirmed ? 'Reopen' : 'Confirm'}
                  </button>
                  {isRoundConfirmed && <span className="text-xs text-slate-500 font-medium">Confirmed</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Select a round and player to start fines</p>
            )}
          </div>
        </Card>
      )}

      {/* === Fine Sheet Tab (with inline edit) === */}
      {isAdmin && finesTab === 'types' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{fineTypes.filter(ft => !ft.is_open).length} fines</p>
            <button onClick={onAddFineType} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]">
              <Plus size={16} /> Add Fine
            </button>
          </div>
          <Card>
            <div className="divide-y divide-slate-50">
              {fineTypes.filter(ft => !ft.is_open).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No fines on the sheet yet</div>
              ) : fineTypes.filter(ft => !ft.is_open).map(ft => (
                <div key={ft.id} className="flex items-center gap-3 p-3">
                  {editingFineType?.id === ft.id ? (
                    <>
                      <div className="flex-1 flex flex-wrap gap-2">
                        <input id="edit-ft-order" name="sort_order" aria-label="Sort order" type="number" value={editingFineType.sort_order} onChange={e => setEditingFineType(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                          className="input input-bordered input-sm w-14 min-h-[36px] text-center" min="0" placeholder="#" autoComplete="off" />
                        <input id="edit-ft-name" name="fine_name" aria-label="Fine name" value={editingFineType.name} onChange={e => setEditingFineType(prev => ({ ...prev, name: e.target.value }))}
                          className="input input-bordered input-sm flex-1 min-w-[120px] min-h-[36px]" autoComplete="off" />
                        <input id="edit-ft-amount" name="fine_amount" aria-label="Fine amount" type="number" value={editingFineType.amount} onChange={e => setEditingFineType(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="input input-bordered input-sm w-20 min-h-[36px]" min="0" autoComplete="off" />
                        <input id="edit-ft-description" name="fine_description" aria-label="Fine description" value={editingFineType.description || ''} onChange={e => setEditingFineType(prev => ({ ...prev, description: e.target.value }))}
                          className="input input-bordered input-sm w-full min-h-[36px]" placeholder="Description (optional)" autoComplete="off" />
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-[10px] text-slate-400 uppercase font-medium">Tier</span>
                          <input id="edit-ft-tier-threshold" name="tier_threshold" aria-label="Tier threshold" type="number" value={editingFineType.tier_threshold || 0} onChange={e => setEditingFineType(prev => ({ ...prev, tier_threshold: Number(e.target.value) }))}
                            className="input input-bordered input-sm w-16 min-h-[36px] text-center" min="0" placeholder="after" autoComplete="off" />
                          <span className="text-[10px] text-slate-400">then R</span>
                          <input id="edit-ft-tier-amount" name="tier_amount" aria-label="Tier amount" type="number" value={editingFineType.tier_amount || 0} onChange={e => setEditingFineType(prev => ({ ...prev, tier_amount: Number(e.target.value) }))}
                            className="input input-bordered input-sm w-20 min-h-[36px]" min="0" autoComplete="off" />
                          <span className="text-[10px] text-slate-400">each</span>
                        </div>
                      </div>
                      <button onClick={handleSaveFineType} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 min-h-[36px] min-w-[36px] flex items-center justify-center"><Save size={16} /></button>
                      <button onClick={() => setEditingFineType(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 min-h-[36px] min-w-[36px] flex items-center justify-center"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-400 w-6 text-center flex-shrink-0">{ft.sort_order || 0}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{ft.name}</p>
                        {ft.description && <p className="text-[10px] text-slate-400 truncate">{ft.description}</p>}
                        {Number(ft.tier_threshold) > 0 && (
                          <p className="text-[10px] text-emerald-600 truncate">R{ft.tier_amount} each after {ft.tier_threshold}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-red-600 flex-shrink-0">R{ft.amount}</span>
                      <button onClick={() => setEditingFineType({ id: ft.id, name: ft.name, amount: ft.amount, sort_order: ft.sort_order || 0, description: ft.description || '', tier_threshold: Number(ft.tier_threshold) || 0, tier_amount: Number(ft.tier_amount) || 0 })}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => onDeleteFineType(ft.id, ft.name)}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* === History Tab === */}
      {finesTab === 'history' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Fines History</h3>
            <p className="text-xs text-slate-500 mt-1">Round-by-round fines breakdown</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select id="fines-select-round" value={selectedRound || ''} onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                className="select select-bordered w-full min-h-[44px]" aria-label="Select round">
                <option value="">Select Round</option>
                {rounds.map(r => <option key={r.id} value={r.id}>{r.name} ({r.date})</option>)}
              </select>
              <select id="fines-filter-player" value={roundViewPlayerFilter} onChange={(e) => setRoundViewPlayerFilter(e.target.value)}
                className="select select-bordered w-full min-h-[44px]" aria-label="Filter by player">
                <option value="all">All Players</option>
                {players.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {selectedRound ? (() => {
              if (roundFinesData.length === 0) return <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">No fines recorded for this round</div>;
              const playerSummary = {}, playerFineDetails = {};
              roundFinesData.forEach(f => {
                if (!playerSummary[f.player_id]) { playerSummary[f.player_id] = { player_id: f.player_id, player_name: f.player_name, total_fines: 0, total_amount: 0 }; playerFineDetails[f.player_id] = []; }
                const total = calcFineTotal(f.quantity, f.amount, f.tier_threshold, f.tier_amount);
                playerSummary[f.player_id].total_fines += Number(f.quantity);
                playerSummary[f.player_id].total_amount += total;
                playerFineDetails[f.player_id].push({ name: f.name, quantity: f.quantity, amount: f.amount, total });
              });
              let arr = Object.values(playerSummary);
              if (roundViewPlayerFilter !== 'all') arr = arr.filter(s => s.player_id === roundViewPlayerFilter);
              if (arr.length === 0) return <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">No fines for selected player</div>;
              arr.sort((a, b) => b.total_amount - a.total_amount);

              return <div className="space-y-3">{arr.map((s, idx) => {
                const expanded = expandedRoundViewPlayers[s.player_id];
                return (
                  <div key={s.player_id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-4 bg-white cursor-pointer hover:bg-slate-50" onClick={() => setExpandedRoundViewPlayers(prev => ({ ...prev, [s.player_id]: !expanded }))}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{s.player_name}</p>
                            <p className="text-xs text-slate-500">{s.total_fines} fines</p>
                          </div>
                        </div>
                        <p className="font-bold text-red-600 text-sm">R{s.total_amount.toLocaleString()}</p>
                      </div>
                    </div>
                    {expanded && (
                      <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-2">
                        {playerFineDetails[s.player_id].map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div><p className="text-sm font-medium text-slate-700">{f.name}</p><p className="text-xs text-slate-500">{f.quantity} x R{f.amount}</p></div>
                            <p className="text-sm font-bold text-red-600">R{f.total.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}</div>;
            })() : <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">Select a round to view fines</div>}
          </div>
        </Card>
      )}

      {/* === Payments Tab === */}
      {finesTab === 'payments' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Payment Tracking</h3>
            <p className="text-xs text-slate-500 mt-1">Click a player to expand round details</p>
          </div>
          <div className="divide-y divide-slate-100">
            {paymentSummaryData.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No payment data for this season</div>
            ) : paymentSummaryData.map((summary, idx) => {
              const playerRounds = playerRoundFinesCache[summary.player_id] || [];
              const isExpanded = expandedPlayers[summary.player_id];
              return (
                <div key={summary.player_id} className="hover:bg-slate-50">
                  <div className="p-4 cursor-pointer select-none" onClick={async () => {
                    if (!isExpanded && !playerRoundFinesCache[summary.player_id]) {
                      const data = await DB.getPlayerRoundFines(summary.player_id, activeSeason?.id);
                      setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: data }));
                    }
                    setExpandedPlayers(prev => ({ ...prev, [summary.player_id]: !isExpanded }));
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                          summary.payment_percentage === 100 ? 'bg-emerald-100 text-emerald-700' :
                          summary.payment_percentage >= 50 ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'
                        }`}>{idx + 1}</div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{summary.player_name}</p>
                          <p className="text-xs text-slate-500">{summary.payment_percentage}% paid</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-emerald-600">R{summary.paid_fines.toLocaleString()}</p>
                        <p className="font-bold text-red-600">R{summary.unpaid_fines.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="ml-9">
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden flex">
                        {summary.paid_fines > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${summary.payment_percentage}%` }} />}
                        {summary.unpaid_fines > 0 && <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - summary.payment_percentage}%` }} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && playerRounds.length > 0 && (
                    <div className="px-4 pb-4 bg-slate-50/50">
                      <div className="ml-9 space-y-2">
                        {playerRounds.map(round => (
                          <div key={round.round_id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-2.5 h-2.5 rounded-full ${round.paid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div><p className="text-sm font-medium text-slate-700">{round.round_name}</p><p className="text-xs text-slate-500">{round.round_date}</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-800">R{round.total_amount.toLocaleString()}</span>
                              {isAdmin ? (
                                <button onClick={async (e) => {
                                  e.stopPropagation();
                                  await DB.markRoundFinesPaid(summary.player_id, round.round_id, !round.paid);
                                  const updated = await DB.getPlayerRoundFines(summary.player_id, activeSeason?.id);
                                  setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: updated }));
                                  DB.getPaymentSummary(activeSeason?.id).then(setPaymentSummaryData);
                                  showToast(`${round.round_name} marked as ${!round.paid ? 'paid' : 'unpaid'}`, !round.paid ? 'success' : 'info');
                                }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  round.paid ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
                                }`}>
                                  {round.paid ? 'Paid' : 'Mark Paid'}
                                </button>
                              ) : (
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${round.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {round.paid ? 'Paid' : 'Unpaid'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

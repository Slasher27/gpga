import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import * as DB from '../api.ts';
import { TabBar } from './common';

const Card = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>{children}</div>
);

export default function FinesView({
  leaderboardData, rounds, scores, players, activeSeason,
  isReadOnlySeason, currentUser, showToast,
  onAddFineType, onDeleteFineType
}) {
  const isAdmin = currentUser.role === 'master' || currentUser.role === 'admin';
  const sortedByFines = [...leaderboardData].sort((a, b) => b.totalFines - a.totalFines);
  const mostRecentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const [finesTab, setFinesTab] = useState(() =>
    currentUser.role === 'player' ? 'leaderboard' : 'assign'
  );
  const [selectedRound, setSelectedRound] = useState(mostRecentRound?.id || null);
  const [selectedPlayer, setSelectedPlayer] = useState(() =>
    localStorage.getItem('gpga_selected_player') || null
  );
  const [fineTypes, setFineTypes] = useState([]);
  const [playerFines, setPlayerFines] = useState([]);
  const [expandedPlayers, setExpandedPlayers] = useState({});
  const [roundViewPlayerFilter, setRoundViewPlayerFilter] = useState('all');
  const [expandedRoundViewPlayers, setExpandedRoundViewPlayers] = useState({});
  const [isRoundConfirmed, setIsRoundConfirmed] = useState(false);
  const [roundFinesData, setRoundFinesData] = useState([]);
  const [paymentSummaryData, setPaymentSummaryData] = useState([]);
  const [playerRoundFinesCache, setPlayerRoundFinesCache] = useState({});

  useEffect(() => {
    if (mostRecentRound && selectedRound !== mostRecentRound.id) {
      setSelectedRound(mostRecentRound.id);
    }
  }, [rounds.length]);

  useEffect(() => {
    if (activeSeason) {
      DB.getFineTypes(activeSeason.id).then(types => setFineTypes(types));
    }
  }, [activeSeason]);

  useEffect(() => {
    if (selectedPlayer && selectedRound) {
      DB.getPlayerFinesForRound(selectedPlayer, selectedRound).then(fines => setPlayerFines(fines));
    } else {
      setPlayerFines([]);
    }
  }, [selectedPlayer, selectedRound, scores]);

  useEffect(() => {
    if (selectedPlayer && selectedRound) {
      DB.isPlayerRoundConfirmed(selectedPlayer, selectedRound).then(v => setIsRoundConfirmed(v));
    } else {
      setIsRoundConfirmed(false);
    }
  }, [selectedPlayer, selectedRound, playerFines]);

  useEffect(() => {
    if (selectedRound) {
      DB.getRoundFines(selectedRound).then(data => setRoundFinesData(data));
    }
  }, [selectedRound, scores]);

  useEffect(() => {
    DB.getPaymentSummary().then(data => setPaymentSummaryData(data));
  }, [scores]);

  const handleRoundChange = (roundId) => {
    setSelectedRound(roundId);
    localStorage.setItem('gpga_selected_round', roundId.toString());
  };

  const handlePlayerChange = (playerId) => {
    setSelectedPlayer(playerId);
    localStorage.setItem('gpga_selected_player', playerId);
  };

  const handleAddFine = async (fineTypeId) => {
    if (!selectedPlayer || !selectedRound) return;
    await DB.addPlayerFine(selectedPlayer, selectedRound, fineTypeId);
    const updatedFines = await DB.getPlayerFinesForRound(selectedPlayer, selectedRound);
    setPlayerFines(updatedFines);
  };

  const handleRemoveFine = async (fineTypeId) => {
    if (!selectedPlayer || !selectedRound) return;
    await DB.removePlayerFine(selectedPlayer, selectedRound, fineTypeId);
    const updatedFines = await DB.getPlayerFinesForRound(selectedPlayer, selectedRound);
    setPlayerFines(updatedFines);
  };

  const totalFines = playerFines.reduce((sum, fine) => sum + (fine.amount * fine.quantity), 0);

  const finesTabs = [];
  if (!isReadOnlySeason && isAdmin) {
    finesTabs.push({ id: 'assign', label: 'Assign' }, { id: 'types', label: 'Fine Sheet' });
  }
  finesTabs.push({ id: 'leaderboard', label: 'Ranking' }, { id: 'roundview', label: 'Rounds' }, { id: 'payments', label: 'Payments' });

  const selectStyle = {
    backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
    backgroundPosition: "right 0.75rem center",
    backgroundSize: "1.25em 1.25em",
    backgroundRepeat: "no-repeat"
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Fines</h2>
      </div>

      <TabBar tabs={finesTabs} active={finesTab} onChange={setFinesTab} />

      {/* Assign Fines Tab */}
      {isAdmin && finesTab === 'assign' && (
        <Card>
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              {mostRecentRound ? (
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-medium">
                  {mostRecentRound.name} — {mostRecentRound.course_name}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-400">No rounds yet</div>
              )}
              <select
                id="fines-select-player"
                name="fines-select-player"
                value={selectedPlayer || ''}
                onChange={(e) => handlePlayerChange(e.target.value)}
                className="select select-bordered w-full min-h-[44px]"
                aria-label="Select player"
              >
                <option value="">Select Player</option>
                {players.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedPlayer && selectedRound ? (
              <>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">{players.find(p => p.id === selectedPlayer)?.name}</p>
                  <p className="font-bold text-red-600">R{totalFines}</p>
                </div>

                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {fineTypes.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No fines on the sheet yet</p>
                  ) : (
                    fineTypes.map(ft => {
                      const quantity = playerFines.find(pf => pf.fine_type_id === ft.id)?.quantity || 0;
                      return (
                        <div key={ft.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{ft.name}</p>
                            <p className="text-[10px] text-slate-400">R{ft.amount}</p>
                          </div>
                          <button type="button" onClick={() => handleRemoveFine(ft.id)} disabled={quantity === 0} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 transition-colors font-bold min-h-[36px]" aria-label="Remove fine">-</button>
                          <span className="w-6 text-center font-bold text-sm text-slate-800">{quantity}</span>
                          <button type="button" onClick={() => handleAddFine(ft.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors font-bold min-h-[36px]" aria-label="Add fine">+</button>
                          <span className="w-14 text-right text-sm font-semibold text-slate-600">R{quantity * ft.amount}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                  <button
                    onClick={async () => {
                      await DB.confirmPlayerRoundFines(selectedPlayer, selectedRound, !isRoundConfirmed);
                      setIsRoundConfirmed(!isRoundConfirmed);
                      showToast(isRoundConfirmed ? 'Fines reopened' : 'Fines confirmed!', isRoundConfirmed ? 'info' : 'success');
                    }}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                      isRoundConfirmed ? 'bg-slate-500 text-white hover:bg-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isRoundConfirmed ? 'Reopen' : 'Confirm'}
                  </button>
                  {isRoundConfirmed && <span className="text-xs text-slate-500 font-medium">Confirmed</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Select a player to assign fines</p>
            )}
          </div>
        </Card>
      )}

      {/* Fine Sheet Tab */}
      {isAdmin && finesTab === 'types' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{fineTypes.length} fines</p>
            <button onClick={onAddFineType} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]">
              <Plus size={16} /> Add Fine
            </button>
          </div>
          <Card>
            <div className="divide-y divide-slate-50">
              {fineTypes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No fines on the sheet yet</div>
              ) : (
                fineTypes.map(ft => (
                  <div key={ft.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ft.name}</p>
                      {ft.description && <p className="text-[10px] text-slate-400 truncate">{ft.description}</p>}
                    </div>
                    <span className="text-sm font-bold text-red-600 flex-shrink-0">R{ft.amount}</span>
                    <button
                      onClick={() => onDeleteFineType(ft.id, ft.name)}
                      className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                      aria-label={`Delete ${ft.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Leaderboard Tab */}
      {finesTab === 'leaderboard' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700">Fines Leaderboard</h3>
            <p className="text-xs text-slate-500 mt-1">Total outstanding per player</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {sortedByFines.map((player, idx) => (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden
                    ${idx === 0 ? 'bg-red-100 text-red-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'}`}>
                    {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" alt="" /> : idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{player.name}</p>
                    <p className="text-xs text-slate-500">{player.roundsPlayed} rounds played</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">R {player.totalFines.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Round View Tab */}
      {finesTab === 'roundview' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Round-Based Fines View</h3>
            <p className="text-xs text-slate-500 mt-1">View historical fines summary by round</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fines-select-round" className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Round</label>
                <select
                  id="fines-select-round"
                  name="fines-select-round"
                  value={selectedRound || ''}
                  onChange={(e) => handleRoundChange(parseInt(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                  style={selectStyle}
                >
                  <option value="">-- Select Round --</option>
                  {rounds.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.course} ({r.date})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fines-filter-player" className="block text-xs font-bold text-slate-500 uppercase mb-2">Filter by Player</label>
                <select
                  id="fines-filter-player"
                  name="fines-filter-player"
                  value={roundViewPlayerFilter}
                  onChange={(e) => setRoundViewPlayerFilter(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                  style={selectStyle}
                >
                  <option value="all">All Players</option>
                  {players.filter(p => p.status === 'active').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRound ? (
              <div className="space-y-3">
                {(() => {
                  const roundFines = roundFinesData;
                  if (roundFines.length === 0) {
                    return (
                      <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                        No fines recorded for this round
                      </div>
                    );
                  }

                  const playerSummary = {};
                  const playerFineDetails = {};
                  roundFines.forEach(fine => {
                    if (!playerSummary[fine.player_id]) {
                      playerSummary[fine.player_id] = { player_id: fine.player_id, player_name: fine.player_name, total_fines: 0, total_amount: 0 };
                      playerFineDetails[fine.player_id] = [];
                    }
                    playerSummary[fine.player_id].total_fines += fine.quantity;
                    playerSummary[fine.player_id].total_amount += (fine.quantity * fine.amount);
                    playerFineDetails[fine.player_id].push({ name: fine.name, quantity: fine.quantity, amount: fine.amount, total: fine.quantity * fine.amount });
                  });

                  let summaryArray = Object.values(playerSummary);
                  if (roundViewPlayerFilter !== 'all') {
                    summaryArray = summaryArray.filter(s => s.player_id === roundViewPlayerFilter);
                  }
                  if (summaryArray.length === 0) {
                    return (
                      <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                        No fines for selected player in this round
                      </div>
                    );
                  }

                  summaryArray.sort((a, b) => b.total_amount - a.total_amount);

                  return summaryArray.map((summary, idx) => {
                    const isExpanded = expandedRoundViewPlayers[summary.player_id] || false;
                    const fineDetails = playerFineDetails[summary.player_id];
                    return (
                      <div key={summary.player_id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div
                          className="p-4 bg-white cursor-pointer select-none hover:bg-slate-50"
                          onClick={() => setExpandedRoundViewPlayers(prev => ({ ...prev, [summary.player_id]: !isExpanded }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <ChevronDown size={20} className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                idx === 0 ? 'bg-red-100 text-red-700' :
                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                idx === 2 ? 'bg-slate-200 text-slate-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{summary.player_name}</p>
                                <p className="text-xs text-slate-500">{summary.total_fines} fines</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="font-bold text-red-600">R{summary.total_amount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-200">
                            <div className="p-4 space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-3">Fine Breakdown</p>
                              {fineDetails.map((fine, fineIdx) => (
                                <div key={fineIdx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">{fine.name}</p>
                                    <p className="text-xs text-slate-500">Qty: {fine.quantity} x R{fine.amount.toLocaleString()}</p>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-red-600">R{fine.total.toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                Select a round to view fines summary
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Payments Tab */}
      {finesTab === 'payments' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Payment Tracking</h3>
            <p className="text-xs text-slate-500 mt-1">Mark rounds as paid when players settle their fines. Click player name to expand.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(() => {
              const paymentSummary = paymentSummaryData;
              if (paymentSummary.length === 0) {
                return <div className="p-8 text-center text-slate-400">No payment data available</div>;
              }
              return paymentSummary.map((summary, idx) => {
                const playerRounds = playerRoundFinesCache[summary.player_id] || [];
                const isExpanded = expandedPlayers[summary.player_id] || false;
                return (
                  <div key={summary.player_id} className="hover:bg-slate-50">
                    <div
                      className="p-4 cursor-pointer select-none"
                      onClick={async () => {
                        if (!isExpanded && !playerRoundFinesCache[summary.player_id]) {
                          const rounds = await DB.getPlayerRoundFines(summary.player_id);
                          setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: rounds }));
                        }
                        setExpandedPlayers(prev => ({ ...prev, [summary.player_id]: !isExpanded }));
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <ChevronDown size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            summary.payment_percentage === 100 ? 'bg-emerald-100 text-emerald-700' :
                            summary.payment_percentage >= 50 ? 'bg-slate-200 text-slate-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{summary.player_name}</p>
                            <p className="text-xs text-slate-500">
                              {playerRounds.length} rounds - {summary.payment_percentage}% paid
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Paid:</span>
                            <span className="text-sm font-bold text-emerald-600">R{summary.paid_fines.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Outstanding:</span>
                            <span className="text-sm font-bold text-red-600">R{summary.unpaid_fines.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-9">
                        <div className="w-full bg-slate-200 rounded-full h-5 overflow-hidden flex">
                          {summary.paid_fines > 0 && (
                            <div
                              className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                              style={{ width: `${summary.payment_percentage}%` }}
                            >
                              {summary.payment_percentage >= 15 && `${summary.payment_percentage}%`}
                            </div>
                          )}
                          {summary.unpaid_fines > 0 && (
                            <div
                              className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                              style={{ width: `${100 - summary.payment_percentage}%` }}
                            >
                              {(100 - summary.payment_percentage) >= 15 && `${100 - summary.payment_percentage}%`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && playerRounds.length > 0 && (
                      <div className="px-4 pb-4 space-y-2 bg-slate-50/50">
                        <div className="ml-9 space-y-2">
                          {playerRounds.map(round => (
                            <div
                              key={round.round_id}
                              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-3 h-3 rounded-full ${round.paid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-700">{round.round_name}</p>
                                  <p className="text-xs text-slate-500">{round.round_date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-800">R{round.total_amount.toLocaleString()}</span>
                                {isAdmin ? (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await DB.markRoundFinesPaid(summary.player_id, round.round_id, !round.paid);
                                      const updated = await DB.getPlayerRoundFines(summary.player_id);
                                      setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: updated }));
                                      showToast(
                                        `${round.round_name} marked as ${!round.paid ? 'paid' : 'unpaid'} for ${summary.player_name}`,
                                        !round.paid ? 'success' : 'info'
                                      );
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                      round.paid ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                  >
                                    {round.paid ? 'Paid' : 'Mark Paid'}
                                  </button>
                                ) : (
                                  <span className={`px-4 py-2 rounded-lg text-xs font-medium ${
                                    round.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
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
              });
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}

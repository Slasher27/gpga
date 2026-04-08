import { useState, useEffect } from 'react';
import { Plus, Save, Edit, Trash2, MapPin, Calendar } from 'lucide-react';
import * as DB from '../api.ts';
import { Card } from './common';

export default function RoundsView({ rounds, scores, setScores, players, activeSeason, isReadOnlySeason, showToast, onAddRound, onEditRound, onDeleteRound }) {
  // Auto-select latest round
  const [selectedRound, setSelectedRound] = useState(rounds[rounds.length - 1]?.id);
  const [editScores, setEditScores] = useState({});
  const [editingPlayers, setEditingPlayers] = useState({});

  useEffect(() => {
    setEditScores({});
    setEditingPlayers({});
  }, [selectedRound]);

  // Auto-select latest when rounds change
  useEffect(() => {
    if (rounds.length > 0) setSelectedRound(rounds[rounds.length - 1].id);
  }, [rounds.length]);

  const handleScoreChange = (pid, field, val) => {
    setEditScores(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [field]: val === '' ? '' : parseInt(val) }
    }));
  };

  const getPlayerValues = (playerId) => {
    const current = scores[playerId]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };
    const edited = editScores[playerId] || {};
    const gross = edited.gross !== undefined ? edited.gross : ((current.strokes || 0) + (current.handicap || 0)) || '';
    const hc = edited.handicap !== undefined ? edited.handicap : current.handicap || '';
    const sf = edited.stableford !== undefined ? edited.stableford : current.stableford || '';
    const grossNum = Number(gross) || 0;
    const hcNum = Number(hc) || 0;
    const net = grossNum > 0 ? grossNum - hcNum : '';
    return { gross, hc, sf, net };
  };

  const savePlayerScore = async (playerId, playerName) => {
    const vals = getPlayerValues(playerId);
    const net = Number(vals.net) || 0;
    const hc = Number(vals.hc) || 0;
    const sf = Number(vals.sf) || 0;

    if (net <= 0) { showToast('Enter a gross score first', 'error'); return; }

    await DB.updateScore(playerId, selectedRound, net, hc, sf);
    setScores(prev => {
      const updated = { ...prev };
      if (!updated[playerId]) updated[playerId] = {};
      updated[playerId] = { ...updated[playerId], [selectedRound]: { ...updated[playerId][selectedRound], strokes: net, handicap: hc, stableford: sf } };
      return updated;
    });
    setEditScores(prev => { const s = { ...prev }; delete s[playerId]; return s; });
    setEditingPlayers(prev => ({ ...prev, [playerId]: false }));
    showToast(`Saved scores for ${playerName}!`);
  };

  const editAllPlayers = () => {
    setEditingPlayers(players.filter(p => p.status === 'active').reduce((acc, p) => { acc[p.id] = true; return acc; }, {}));
  };

  const saveAllPlayers = async () => {
    let savedCount = 0;
    for (const p of players.filter(pl => pl.status === 'active')) {
      if (!editingPlayers[p.id]) continue;
      const vals = getPlayerValues(p.id);
      const net = Number(vals.net) || 0;
      const hc = Number(vals.hc) || 0;
      const sf = Number(vals.sf) || 0;
      if (net > 0) {
        await DB.updateScore(p.id, selectedRound, net, hc, sf);
        savedCount++;
      }
    }
    setScores(prev => {
      const updated = { ...prev };
      for (const p of players.filter(pl => pl.status === 'active')) {
        if (!editingPlayers[p.id]) continue;
        const vals = getPlayerValues(p.id);
        const net = Number(vals.net) || 0;
        if (net > 0) {
          if (!updated[p.id]) updated[p.id] = {};
          updated[p.id] = { ...updated[p.id], [selectedRound]: { ...updated[p.id][selectedRound], strokes: net, handicap: Number(vals.hc) || 0, stableford: Number(vals.sf) || 0 } };
        }
      }
      return updated;
    });
    setEditScores({});
    setEditingPlayers({});
    showToast(`Saved scores for ${savedCount} player${savedCount !== 1 ? 's' : ''}!`);
  };

  const isAnyPlayerEditing = Object.values(editingPlayers).some(v => v);
  const currentRound = rounds.find(r => r.id === selectedRound);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Rounds</h2>
        {!isReadOnlySeason && (
          <button onClick={onAddRound} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]">
            <Plus size={16} /> Add Round
          </button>
        )}
      </div>

      {/* Round Cards */}
      {rounds.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <Calendar size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">No rounds yet</h3>
            <p className="text-xs text-slate-400">Create your first round to start entering scores</p>
          </div>
        </Card>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {rounds.map(r => {
            const isActive = selectedRound === r.id;
            const hasScores = players.some(p => scores[p.id]?.[r.id]?.strokes > 0);
            return (
              <button key={r.id} onClick={() => setSelectedRound(r.id)}
                className={`flex-shrink-0 rounded-lg text-left transition-all min-w-[140px] p-3 ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                }`}>
                <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-800'}`}>{r.name}</p>
                <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{r.course_name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar size={10} className={isActive ? 'text-emerald-200' : 'text-slate-300'} />
                  <span className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{r.date}</span>
                  {hasScores && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-200' : 'bg-emerald-400'}`} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Round Detail */}
      {currentRound && (
        <>
          {/* Info Bar */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5 text-sm">
            <div className="flex items-center gap-3 text-slate-600 min-w-0">
              <MapPin size={14} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{currentRound.course_name}</span>
              <span className="text-slate-300">|</span>
              <Calendar size={14} className="flex-shrink-0 text-slate-400" />
              <span>{currentRound.date}</span>
            </div>
            {!isReadOnlySeason && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onEditRound(currentRound)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Edit round">
                  <Edit size={14} />
                </button>
                <button onClick={() => onDeleteRound(currentRound.id, currentRound.name)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Delete round">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Scores Card */}
          <Card>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Scores — {currentRound.name}</h3>
              {!isReadOnlySeason && (
                !isAnyPlayerEditing ? (
                  <button onClick={editAllPlayers} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 min-h-[36px]">
                    <Edit size={13} /> Edit All
                  </button>
                ) : (
                  <button onClick={saveAllPlayers} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 min-h-[36px]">
                    <Save size={13} /> Save All
                  </button>
                )
              )}
            </div>

            <div className="divide-y divide-slate-50">
              {players.filter(p => p.status === 'active').map(p => {
                const isEditing = editingPlayers[p.id];
                const isEdited = editScores[p.id] !== undefined;
                const vals = getPlayerValues(p.id);

                return (
                  <div key={p.id} className={`p-3 ${isEdited ? 'bg-emerald-50/50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                      {!isReadOnlySeason && (
                        !isEditing ? (
                          <button onClick={() => setEditingPlayers(prev => ({ ...prev, [p.id]: true }))} className="text-xs text-emerald-600 font-semibold min-h-[32px] px-2">Edit</button>
                        ) : (
                          <button onClick={() => savePlayerScore(p.id, p.name)} className="text-xs text-emerald-600 font-semibold min-h-[32px] px-2">Save</button>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label htmlFor={`score-${p.id}-gross`} className="text-[10px] text-slate-400 uppercase block mb-0.5">Gross</label>
                        <input
                          type="number" min="50" max="150"
                          id={`score-${p.id}-gross`} name={`score-${p.id}-gross`}
                          value={vals.gross}
                          onChange={(e) => handleScoreChange(p.id, 'gross', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                          placeholder="85"
                        />
                      </div>
                      <div>
                        <label htmlFor={`score-${p.id}-hc`} className="text-[10px] text-slate-400 uppercase block mb-0.5">HC</label>
                        <input
                          type="number" min="0" max="36"
                          id={`score-${p.id}-hc`} name={`score-${p.id}-hc`}
                          value={vals.hc}
                          onChange={(e) => handleScoreChange(p.id, 'handicap', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                          placeholder="12"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-0.5">Net</label>
                        <div className="w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border border-slate-200 bg-slate-100 text-slate-700 font-semibold flex items-center justify-center">
                          {vals.net || '-'}
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`score-${p.id}-sf`} className="text-[10px] text-slate-400 uppercase block mb-0.5">SF</label>
                        <input
                          type="number" min="0" max="50"
                          id={`score-${p.id}-sf`} name={`score-${p.id}-sf`}
                          value={vals.sf}
                          onChange={(e) => handleScoreChange(p.id, 'stableford', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                          placeholder="36"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

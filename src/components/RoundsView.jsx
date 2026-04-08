import { useState, useEffect } from 'react';
import { Plus, Save, Edit, Trash2, MapPin, Calendar } from 'lucide-react';
import * as DB from '../api.ts';

const Card = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>{children}</div>
);

export default function RoundsView({ rounds, scores, setScores, players, activeSeason, isReadOnlySeason, showToast, onAddRound, onEditRound, onDeleteRound }) {
  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id);
  const [editScores, setEditScores] = useState({});
  const [editingPlayers, setEditingPlayers] = useState({});

  useEffect(() => {
    setEditScores({});
    setEditingPlayers({});
  }, [selectedRound]);

  const handleScoreChange = (pid, field, val) => {
    setEditScores(prev => ({
      ...prev,
      [pid]: {
        ...(prev[pid] || {}),
        [field]: val === '' ? '' : parseInt(val)
      }
    }));
  };

  const savePlayerScore = async (playerId, playerName) => {
    const scoreData = editScores[playerId];
    if (!scoreData) {
      showToast('No changes to save', 'error');
      return;
    }

    const currentScore = scores[playerId]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };

    const strokes = scoreData.strokes !== undefined ? Number(scoreData.strokes) || 0 : Number(currentScore.strokes) || 0;
    const handicap = scoreData.handicap !== undefined ? Number(scoreData.handicap) || 0 : Number(currentScore.handicap) || 0;
    const stableford = scoreData.stableford !== undefined ? Number(scoreData.stableford) || 0 : Number(currentScore.stableford) || 0;

    await DB.updateScore(playerId, selectedRound, strokes, handicap, stableford);

    setScores(prev => {
      const updated = { ...prev };
      if (!updated[playerId]) updated[playerId] = {};
      updated[playerId] = { ...updated[playerId], [selectedRound]: { strokes, handicap, stableford } };
      return updated;
    });

    setEditScores(prev => {
      const newState = { ...prev };
      delete newState[playerId];
      return newState;
    });

    setEditingPlayers(prev => ({ ...prev, [playerId]: false }));
    showToast(`Saved scores for ${playerName}!`);
  };

  const toggleEditPlayer = (playerId) => {
    setEditingPlayers(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const editAllPlayers = () => {
    const allPlayerIds = players.filter(p => p.status === 'active').reduce((acc, p) => {
      acc[p.id] = true;
      return acc;
    }, {});
    setEditingPlayers(allPlayerIds);
  };

  const saveAllPlayers = async () => {
    let savedCount = 0;
    const activePlayers = players.filter(p => p.status === 'active');

    for (const player of activePlayers) {
      if (editingPlayers[player.id]) {
        const scoreData = editScores[player.id];
        const currentScore = scores[player.id]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };

        const strokes = scoreData?.strokes !== undefined ? Number(scoreData.strokes) || 0 : Number(currentScore.strokes) || 0;
        const handicap = scoreData?.handicap !== undefined ? Number(scoreData.handicap) || 0 : Number(currentScore.handicap) || 0;
        const stableford = scoreData?.stableford !== undefined ? Number(scoreData.stableford) || 0 : Number(currentScore.stableford) || 0;

        await DB.updateScore(player.id, selectedRound, strokes, handicap, stableford);
        savedCount++;
      }
    }

    setScores(prev => {
      const updated = { ...prev };
      for (const [pid, vals] of Object.entries(editScores)) {
        if (!updated[pid]) updated[pid] = {};
        const s = Number(vals.strokes) || 0;
        const h = Number(vals.handicap) || 0;
        const sf = Number(vals.stableford) || 0;
        if (s > 0) updated[pid] = { ...updated[pid], [selectedRound]: { strokes: s, handicap: h, stableford: sf } };
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
          <button
            onClick={onAddRound}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus size={16} /> Add Round
          </button>
        )}
      </div>

      {/* Round Selector — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {rounds.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRound(r.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
              selectedRound === r.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {r.name}
          </button>
        ))}
        {rounds.length === 0 && <p className="text-sm text-slate-400 py-2">No rounds created yet</p>}
      </div>

      {/* Round Info Bar */}
      {currentRound && (
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
      )}

      {/* Scores Card */}
      {currentRound && (
        <Card>
          {/* Scores Header */}
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

          {/* Score Rows */}
          <div className="divide-y divide-slate-50">
            {players.filter(p => p.status === 'active').map(p => {
              const currentScore = scores[p.id]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };
              const isEditing = editingPlayers[p.id];
              const isEdited = editScores[p.id] !== undefined;

              const getDisplayValue = (field, currentValue) => {
                if (editScores[p.id]?.[field] !== undefined) {
                  return editScores[p.id][field] === '' ? '' : editScores[p.id][field];
                }
                return isEditing && currentValue === 0 ? '' : currentValue;
              };

              return (
                <div key={p.id} className={`p-3 ${isEdited ? 'bg-emerald-50/50' : ''}`}>
                  {/* Player Name + Action */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                    {!isReadOnlySeason && (
                      !isEditing ? (
                        <button onClick={() => toggleEditPlayer(p.id)} className="text-xs text-emerald-600 font-semibold min-h-[32px] px-2">Edit</button>
                      ) : (
                        <button onClick={() => savePlayerScore(p.id, p.name)} className="text-xs text-emerald-600 font-semibold min-h-[32px] px-2">Save</button>
                      )
                    )}
                  </div>
                  {/* Score Inputs */}
                  {(() => {
                    const netVal = getDisplayValue('strokes', currentScore.strokes);
                    const hcVal = getDisplayValue('handicap', currentScore.handicap);
                    const gross = (Number(netVal) || 0) > 0 && (Number(hcVal) || 0) !== 0
                      ? (Number(netVal) || 0) + (Number(hcVal) || 0)
                      : (Number(netVal) || 0) > 0 ? Number(netVal) : '';
                    return (
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-0.5">Gross</label>
                          <div className="w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border border-slate-200 bg-slate-100 text-slate-500 flex items-center justify-center">
                            {gross || '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-0.5">Net</label>
                          <input
                            type="number" min="40" max="150"
                            id={`score-${p.id}-strokes`} name={`score-${p.id}-strokes`}
                            value={netVal}
                            onChange={(e) => handleScoreChange(p.id, 'strokes', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                            placeholder="72"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-0.5">HC</label>
                          <input
                            type="number" min="-5" max="36"
                            id={`score-${p.id}-hc`} name={`score-${p.id}-hc`}
                            value={hcVal}
                            onChange={(e) => handleScoreChange(p.id, 'handicap', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-0.5">SF</label>
                          <input
                            type="number" min="0" max="50"
                            id={`score-${p.id}-sf`} name={`score-${p.id}-sf`}
                            value={getDisplayValue('stableford', currentScore.stableford)}
                            onChange={(e) => handleScoreChange(p.id, 'stableford', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                            placeholder="36"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

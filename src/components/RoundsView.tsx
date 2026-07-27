import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Plus, Save, Edit, Trash2, MapPin, Calendar, Lock, CheckCircle, Trophy } from 'lucide-react';
import * as DB from '../api';
import type { Round, Player, Season, ScoresMapFull } from '../api';
import { Card, SubmitButton } from './common';

type ScoreField = 'gross' | 'handicap' | 'stableford';
type ScoreEdit = Partial<Record<ScoreField, number | string>>;

interface RoundsViewProps {
  rounds: Round[];
  scores: ScoresMapFull;
  setScores: Dispatch<SetStateAction<ScoresMapFull>>;
  players: Player[];
  activeSeason: Season | null;
  isReadOnlySeason: boolean;
  isAdmin: boolean;
  showToast: (msg: string, type?: string) => void;
  onAddRound: () => void;
  onEditRound: (round: Round) => void;
  onDeleteRound: (id: number, name: string) => void;
  onCloseRound: (id: number, name: string) => void;
}

export default function RoundsView({ rounds, scores, setScores, players, isReadOnlySeason, isAdmin, showToast, onAddRound, onEditRound, onDeleteRound, onCloseRound }: RoundsViewProps) {
  // Auto-select latest round
  const latestRoundId = rounds[rounds.length - 1]?.id;
  const [selectedRound, setSelectedRound] = useState<number | undefined>(latestRoundId);
  const [editScores, setEditScores] = useState<Record<string, ScoreEdit>>({});
  const [editingPlayers, setEditingPlayers] = useState<Record<string, boolean>>({});
  const [savingScores, setSavingScores] = useState(false);

  useEffect(() => {
    setEditScores({});
    setEditingPlayers({});
  }, [selectedRound]);

  // Auto-select latest when the newest round changes
  useEffect(() => {
    if (latestRoundId != null) setSelectedRound(latestRoundId);
  }, [latestRoundId]);

  const handleScoreChange = (pid: string, field: ScoreField, val: string) => {
    setEditScores(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [field]: val === '' ? '' : parseInt(val) }
    }));
  };

  const getPlayerValues = (playerId: string) => {
    const current = (selectedRound != null ? scores[playerId]?.[selectedRound] : undefined) || { strokes: 0, handicap: 0, stableford: 0 };
    const edited = editScores[playerId] || {};
    const gross = edited.gross !== undefined ? edited.gross : ((current.strokes || 0) + (current.handicap || 0)) || '';
    const hc = edited.handicap !== undefined ? edited.handicap : current.handicap || '';
    const sf = edited.stableford !== undefined ? edited.stableford : current.stableford || '';
    const grossNum = Number(gross) || 0;
    const hcNum = Number(hc) || 0;
    const net = grossNum > 0 ? grossNum - hcNum : '';
    return { gross, hc, sf, net };
  };

  const savePlayerScore = async (playerId: string, playerName: string) => {
    if (selectedRound == null) return;
    const vals = getPlayerValues(playerId);
    const net = Number(vals.net) || 0;
    const hc = Number(vals.hc) || 0;
    const sf = Number(vals.sf) || 0;
    const hadScore = (scores[playerId]?.[selectedRound]?.strokes ?? 0) > 0;

    if (net <= 0 && !hadScore) { showToast('Enter a gross score first', 'error'); return; }
    // A stored 0 stableford would count as the player's worst round AND poison
    // the teams-comp day-minimum — require it alongside the gross score.
    if (net > 0 && sf <= 0) { showToast(`Enter a stableford score for ${playerName}`, 'error'); return; }

    setSavingScores(true);
    try {
      if (net <= 0) {
        // Gross cleared on an existing entry — remove the score (server
        // deletes the row) so the round no longer counts as played for them.
        await DB.updateScore(playerId, selectedRound, 0, 0, 0);
        setScores(prev => ({
          ...prev,
          [playerId]: { ...prev[playerId], [selectedRound]: { ...prev[playerId]?.[selectedRound], strokes: 0, handicap: 0, stableford: 0 } },
        }));
        showToast(`Cleared scores for ${playerName}`);
      } else {
        await DB.updateScore(playerId, selectedRound, net, hc, sf);
        setScores(prev => {
          const updated = { ...prev };
          if (!updated[playerId]) updated[playerId] = {};
          updated[playerId] = { ...updated[playerId], [selectedRound]: { ...updated[playerId][selectedRound], strokes: net, handicap: hc, stableford: sf } };
          return updated;
        });
        showToast(`Saved scores for ${playerName}!`);
      }
      setEditScores(prev => { const s = { ...prev }; delete s[playerId]; return s; });
      setEditingPlayers(prev => ({ ...prev, [playerId]: false }));
    } catch {
      showToast('Could not save score — check your connection', 'error');
    } finally {
      setSavingScores(false);
    }
  };

  const editAllPlayers = () => {
    setEditingPlayers(players.filter(p => p.status === 'active').reduce((acc: Record<string, boolean>, p) => { acc[p.id] = true; return acc; }, {}));
  };

  const saveAllPlayers = async () => {
    if (selectedRound == null) return;
    // Collect everything to save once, then write in parallel — a sequential
    // await-in-loop here means one network round-trip per player on mobile.
    const toSave = players
      .filter(pl => pl.status === 'active' && editingPlayers[pl.id])
      .map(p => {
        const vals = getPlayerValues(p.id);
        return { id: p.id, name: p.name, net: Number(vals.net) || 0, hc: Number(vals.hc) || 0, sf: Number(vals.sf) || 0 };
      })
      .filter(s => s.net > 0);

    const missingSf = toSave.find(s => s.sf <= 0);
    if (missingSf) { showToast(`Enter a stableford score for ${missingSf.name}`, 'error'); return; }

    setSavingScores(true);
    try {
      // allSettled so one failed write doesn't hide the ones that succeeded —
      // successes are applied locally and only the failures need a retry.
      const results = await Promise.allSettled(toSave.map(s => DB.updateScore(s.id, selectedRound, s.net, s.hc, s.sf)));
      const saved = toSave.filter((_, i) => results[i].status === 'fulfilled');
      const failed = toSave.filter((_, i) => results[i].status === 'rejected');

      setScores(prev => {
        const updated = { ...prev };
        for (const s of saved) {
          if (!updated[s.id]) updated[s.id] = {};
          updated[s.id] = { ...updated[s.id], [selectedRound]: { ...updated[s.id][selectedRound], strokes: s.net, handicap: s.hc, stableford: s.sf } };
        }
        return updated;
      });
      setEditScores(prev => { const next = { ...prev }; for (const s of saved) delete next[s.id]; return next; });
      setEditingPlayers(prev => { const next = { ...prev }; for (const s of saved) next[s.id] = false; return next; });
      if (failed.length > 0) {
        showToast(`Saved ${saved.length}, but ${failed.length} failed (${failed.map(s => s.name).join(', ')}) — retry`, 'error');
      } else {
        showToast(`Saved scores for ${saved.length} player${saved.length !== 1 ? 's' : ''}!`);
      }
    } finally {
      setSavingScores(false);
    }
  };

  const isAnyPlayerEditing = Object.values(editingPlayers).some(v => v);
  const currentRound = rounds.find(r => r.id === selectedRound);

  // Winning order for the selected round: lowest saved net first (ties: higher
  // stableford, then name), unscored players at the bottom. Sorted on SAVED
  // scores only so rows don't jump around while values are being typed.
  const sortedPlayers = useMemo(() => {
    const active = players.filter(p => p.status === 'active');
    if (selectedRound == null) return active;
    return [...active].sort((a, b) => {
      const sa = scores[a.id]?.[selectedRound], sb = scores[b.id]?.[selectedRound];
      const na = sa?.strokes || Infinity;
      const nb = sb?.strokes || Infinity;
      return na - nb || ((sb?.stableford || 0) - (sa?.stableford || 0)) || a.name.localeCompare(b.name);
    });
  }, [players, scores, selectedRound]);
  // Players get a read-only Rounds view; management UI is admin + active season only.
  const canManage = isAdmin && !isReadOnlySeason;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Rounds</h2>
        {canManage && (
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
        /* The card row is absolutely positioned inside a fixed-height scroll
           wrapper: Blink propagates in-flow content's preferred width through
           scroll containers into the mobile layout-viewport calculation, so a
           wide in-flow row makes phones zoom the whole page out (shrinking the
           fixed navs). Absolute positioning is the only reliable opt-out —
           overflow clipping, contain, and grid minmax all fail. h matches the
           card height (p-3 + three text rows). */
        <div className="relative h-[84px] overflow-x-auto scrollbar-hide">
          <div className="absolute inset-y-0 left-0 flex gap-2 w-max">
          {rounds.map(r => {
            const isActive = selectedRound === r.id;
            const hasScores = players.some(p => (scores[p.id]?.[r.id]?.strokes ?? 0) > 0);
            return (
              <button key={r.id} onClick={() => setSelectedRound(r.id)}
                className={`flex-shrink-0 rounded-lg text-left transition-all min-w-[140px] p-3 ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                }`}>
                <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-800'}`}>{r.name}{isActive && <span className="sr-only"> (selected)</span>}</p>
                <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{r.course_name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar size={10} className={isActive ? 'text-emerald-200' : 'text-slate-500'} />
                  <span className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{r.date}</span>
                  {r.closed ? <Lock size={10} className={`ml-auto ${isActive ? 'text-emerald-200' : 'text-slate-400'}`} /> : hasScores && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-200' : 'bg-emerald-400'}`}><span className="sr-only">Scores entered</span></span>}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* Round Detail */}
      {currentRound && (
        <>
          {/* Info Bar */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin size={14} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{currentRound.course_name}</span>
              <span className="text-slate-300">|</span>
              <Calendar size={14} className="flex-shrink-0 text-slate-400" />
              <span>{currentRound.date}</span>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                {!currentRound.closed && (
                  <>
                    <button onClick={() => onEditRound(currentRound)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-colors min-h-[36px] flex items-center gap-1.5" aria-label="Edit round">
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => onDeleteRound(currentRound.id, currentRound.name)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-white border border-slate-200 hover:bg-red-50 transition-colors min-h-[36px] flex items-center gap-1.5" aria-label="Delete round">
                      <Trash2 size={13} /> Delete
                    </button>
                    <button onClick={() => onCloseRound(currentRound.id, currentRound.name)} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors min-h-[36px] flex items-center gap-1.5" aria-label="Close round">
                      <CheckCircle size={13} /> Close Round
                    </button>
                  </>
                )}
                {/* !! — closed is 0/1; a bare 0 would render as a literal "0" */}
                {!!currentRound.closed && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 flex items-center gap-1.5">
                    <Lock size={13} /> Closed
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Scores Card */}
          <Card>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Scores — {currentRound.name}</h3>
              {canManage && !currentRound.closed && (
                !isAnyPlayerEditing ? (
                  <button onClick={editAllPlayers} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 min-h-[36px]">
                    <Edit size={13} /> Edit All
                  </button>
                ) : (
                  <SubmitButton type="button" pending={savingScores} pendingLabel="Saving…" onClick={saveAllPlayers} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 min-h-[36px] disabled:opacity-60">
                    <Save size={13} /> Save All
                  </SubmitButton>
                )
              )}
            </div>

            <div className="divide-y divide-slate-50">
              {sortedPlayers.map((p, idx) => {
                const isEditing = editingPlayers[p.id];
                const isEdited = editScores[p.id] !== undefined;
                const vals = getPlayerValues(p.id);
                // Scored players are sorted to the top, so idx is the position.
                const hasSaved = selectedRound != null && (scores[p.id]?.[selectedRound]?.strokes ?? 0) > 0;

                return (
                  <div key={p.id} className={`p-3 ${isEdited ? 'bg-emerald-50/50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800 text-sm flex items-center gap-2 min-w-0">
                        {hasSaved && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {idx + 1}
                          </span>
                        )}
                        <span className="truncate">{p.name}</span>
                        {hasSaved && idx === 0 && (
                          <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Trophy size={12} className="text-amber-500" />
                            <span className="sr-only">Round winner</span>
                          </span>
                        )}
                      </span>
                      {canManage && !currentRound.closed && (
                        !isEditing ? (
                          <button onClick={() => setEditingPlayers(prev => ({ ...prev, [p.id]: true }))} className="text-xs text-emerald-600 font-semibold min-h-[44px] px-3">Edit</button>
                        ) : (
                          <SubmitButton type="button" pending={savingScores} onClick={() => savePlayerScore(p.id, p.name)} className="text-xs text-emerald-600 font-semibold min-h-[44px] px-3 disabled:opacity-60">Save</SubmitButton>
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
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
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
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                          placeholder="12"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Net</span>
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
                          className={`w-full text-center rounded-lg px-2 py-2 text-sm min-h-[40px] border ${isEditing ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
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

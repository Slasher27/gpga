import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import * as DB from '../../api';
import type { Player, Season } from '../../api';
import { Card, useConfirm } from '../common';
import { drawTeams, type Partnership } from './teamDraw.utils';
import PartnershipCard, { type TileState } from './PartnershipCard';

type Phase = 'idle' | 'running' | 'done';

const labelFor = (p: Partnership) => `Four-Ball ${p.fourball} · Team ${p.team}`;

// Browser-only persistence of the most recent completed draw, so it survives
// navigating away / refresh. Not a server save — replaced by New Draw, wiped by Clear.
const STORAGE_KEY = 'gpga_teamdraw_latest';

function loadStored(seasonId: number, rosterIds: Set<string>): Partnership[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { seasonId: number; partnerships: Partnership[] };
    if (parsed.seasonId !== seasonId || parsed.partnerships?.length !== 4) return null;
    const ids = parsed.partnerships.flatMap((p) => [p.player1_id, p.player2_id]);
    // Discard if the roster changed and a drawn player is no longer in it.
    if (ids.length !== 8 || !ids.every((id) => rosterIds.has(id))) return null;
    return parsed.partnerships;
  } catch {
    return null;
  }
}

// Standalone, admin-only live draw tool. Nothing is persisted — it shuffles
// the active season's 8 players into two four-balls of cart partners.
export default function TeamDrawPage({
  players,
  activeSeason,
}: {
  players: Player[];
  activeSeason: Season | null;
}) {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<Player[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Partnership[]>([]);
  const [revealStep, setRevealStep] = useState(0); // player-slots locked (0..8)
  const [auto, setAuto] = useState(true);
  const [gateOpen, setGateOpen] = useState(true);
  const [resetting, setResetting] = useState(false); // brief spin so the reset visibly registers
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const { confirm, confirmDialog } = useConfirm();

  const playerById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // Load the active season's roster.
  useEffect(() => {
    if (!activeSeason) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPhase('idle');
    setResult([]);
    setRevealStep(0);
    DB.getSeasonPlayers(activeSeason.id).then((seasonPlayers) => {
      if (cancelled) return;
      const ids = new Set(seasonPlayers.map((s) => s.player_id));
      const r = players.filter((p) => ids.has(p.id) && p.status === 'active');
      setRoster(r);
      // Restore the last completed draw for this season, if still valid.
      const stored = loadStored(activeSeason.id, new Set(r.map((p) => p.id)));
      if (stored) {
        setResult(stored);
        setRevealStep(8);
        setPhase('done');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSeason, players]);

  // Drive phase transitions / manual pacing off revealStep.
  useEffect(() => {
    if (phase !== 'running') return;
    if (revealStep >= 8) {
      setPhase('done');
    } else if (revealStep > 0 && revealStep % 2 === 0 && !auto) {
      setGateOpen(false);
    }
  }, [revealStep, phase, auto]);

  // Persist a completed draw (browser-only) so it survives navigation/refresh.
  useEffect(() => {
    if (phase === 'done' && result.length === 4 && activeSeason) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ seasonId: activeSeason.id, partnerships: result })
      );
    }
  }, [phase, result, activeSeason]);

  const lockedIds = new Set<string>();
  for (let g = 0; g < revealStep && g < result.length * 2; g++) {
    const p = result[Math.floor(g / 2)];
    lockedIds.add(g % 2 === 0 ? p.player1_id : p.player2_id);
  }
  const candidates = roster.filter((p) => !lockedIds.has(p.id));

  const startDraw = (autoMode: boolean) => {
    setAuto(autoMode);
    setResult(drawTeams(roster));
    setRevealStep(0);
    setGateOpen(true);
    setPhase('running');
  };

  const handleNewDraw = () => startDraw(auto);

  const clearDraw = () => {
    localStorage.removeItem(STORAGE_KEY);
    setResult([]);
    setRevealStep(0);
    setGateOpen(true);
    setPhase('idle');
  };

  // Start fresh from the idle screen — wipe any saved/lingering draw so the next
  // run is a clean slate. (A real page reload would restore the saved draw, so
  // a soft reset is the correct "refresh" here.)
  const handleRefresh = () => {
    clearDraw();
    setResetting(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setResetting(false), 600);
  };

  const handleClear = () =>
    confirm(
      'Clear the draw?',
      'This removes the current teams and returns to the start.',
      clearDraw
    );

  const tileFor = (g: number): TileState => {
    if (!result.length) return { kind: 'empty' };
    const part = result[Math.floor(g / 2)];
    const id = g % 2 === 0 ? part.player1_id : part.player2_id;
    if (g < revealStep) {
      const player = playerById.get(id);
      return player ? { kind: 'locked', player } : { kind: 'empty' };
    }
    if (phase === 'running' && g === revealStep && gateOpen) {
      const finalPlayer = playerById.get(id);
      if (finalPlayer) {
        return {
          kind: 'spinning',
          candidates: candidates.length ? candidates : [finalPlayer],
          finalPlayer,
          onLockIn: () => setRevealStep((s) => s + 1),
        };
      }
    }
    return { kind: 'empty' };
  };

  const atPartnershipBreak =
    phase === 'running' && !auto && !gateOpen && revealStep < 8;

  const announce = result
    .slice(0, Math.floor(revealStep / 2))
    .map((p) => {
      const a = playerById.get(p.player1_id)?.name ?? '';
      const b = playerById.get(p.player2_id)?.name ?? '';
      return `${labelFor(p)}: ${a} and ${b}.`;
    })
    .join(' ');

  const notReady =
    !activeSeason || (!loading && roster.length !== 8);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Team Draw</h2>
        <span className="text-xs text-slate-400">{activeSeason?.name}</span>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {loading ? (
        <Card>
          <p className="p-8 text-center text-slate-400 text-sm">Loading players…</p>
        </Card>
      ) : notReady ? (
        <Card>
          <div className="p-8 text-center space-y-1">
            <p className="text-sm font-bold text-slate-700">
              {!activeSeason ? 'No active season' : 'Need exactly 8 players'}
            </p>
            <p className="text-xs text-slate-400">
              {!activeSeason
                ? 'Activate a season to run the team draw.'
                : `${roster.length} enrolled for ${activeSeason?.name}. The draw needs exactly 8.`}
            </p>
          </div>
        </Card>
      ) : phase === 'idle' ? (
        <Card>
          <div className="p-8 text-center">
            <h3 className="text-2xl font-bold text-slate-800 mb-1">
              The Draw is About to Begin…
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              8 players · 2 four-balls · 4 cart partnerships
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Reset draw"
                title="Start fresh — clears the last saved draw"
                className="inline-flex items-center justify-center bg-slate-100 text-slate-500 px-4 rounded-lg hover:bg-slate-200 transition-colors min-h-[48px] min-w-[48px]"
              >
                <RefreshCw size={18} className={resetting ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => startDraw(true)}
                className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors min-h-[48px]"
              >
                Draw All Teams
              </button>
              <button
                type="button"
                onClick={() => startDraw(false)}
                className="w-full sm:w-auto bg-slate-100 text-slate-600 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors min-h-[48px]"
              >
                Single Team Draw
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.map((p, i) => (
              <PartnershipCard
                key={`${p.fourball}-${p.team}`}
                label={labelFor(p)}
                slotA={tileFor(i * 2)}
                slotB={tileFor(i * 2 + 1)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {atPartnershipBreak && (
              <button
                type="button"
                onClick={() => setGateOpen(true)}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors min-h-[48px]"
              >
                Draw Next Team
              </button>
            )}
            {phase === 'done' && (
              <>
                <button
                  type="button"
                  onClick={handleNewDraw}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors min-h-[48px]"
                >
                  New Draw
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-slate-100 text-slate-600 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors min-h-[48px]"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}

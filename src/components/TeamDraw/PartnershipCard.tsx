import { Avatar, Card } from '../common';
import type { Player } from '../../api';
import SlotReel from './SlotReel';

export type TileState =
  | { kind: 'empty' }
  | { kind: 'spinning'; candidates: Player[]; finalPlayer: Player; onLockIn: () => void }
  | { kind: 'locked'; player: Player };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// App palette only (emerald / slate / white).
const CONFETTI = ['#10b981', '#34d399', '#a7f3d0', '#64748b'];

function Tile({ state }: { state: TileState }) {
  if (state.kind === 'locked') {
    return (
      <div className="td-pop flex items-center gap-3 rounded-lg px-3 py-2.5 bg-emerald-50 border border-emerald-200">
        <Avatar src={state.player.avatar} name={state.player.name} size="sm" />
        <span className="font-bold text-base text-emerald-700 truncate">
          {state.player.name}
        </span>
      </div>
    );
  }
  if (state.kind === 'spinning') {
    return (
      <SlotReel
        candidates={state.candidates}
        finalPlayer={state.finalPlayer}
        onLockIn={state.onLockIn}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex items-center rounded-lg px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-400 italic text-sm h-[58px]"
    >
      Awaiting draw…
    </div>
  );
}

export default function PartnershipCard({
  label,
  slotA,
  slotB,
}: {
  label: string;
  slotA: TileState;
  slotB: TileState;
}) {
  const bothLocked = slotA.kind === 'locked' && slotB.kind === 'locked';
  const showConfetti = bothLocked && !prefersReducedMotion();

  return (
    <Card className={`relative overflow-hidden ${bothLocked ? 'border-emerald-300 ring-1 ring-emerald-200' : ''}`}>
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">{label}</p>
        <div className="space-y-2">
          <Tile state={slotA} />
          <Tile state={slotB} />
        </div>
      </div>

      {showConfetti && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="td-confetti-piece"
              style={{
                left: `${8 + i * 7}%`,
                top: '12%',
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 6) * 60}ms`,
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../common';
import type { Player } from '../../api';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// One spinning slot: rapidly cycles through `candidates`, decelerates, then
// locks on `finalPlayer` and calls onLockIn once. Decorative — aria-hidden.
export default function SlotReel({
  candidates,
  finalPlayer,
  onLockIn,
}: {
  candidates: Player[];
  finalPlayer: Player;
  onLockIn: () => void;
}) {
  const [shown, setShown] = useState<Player>(candidates[0] ?? finalPlayer);
  const [locked, setLocked] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setShown(finalPlayer);
      setLocked(true);
      onLockIn();
    };

    if (prefersReducedMotion() || candidates.length === 0) {
      timers.push(setTimeout(finish, 250));
      return () => timers.forEach(clearTimeout);
    }

    // Decelerating cycle: start fast, lengthen the gap each tick, then lock.
    let i = 0;
    let delay = 60;
    const tick = () => {
      setShown(candidates[i % candidates.length]);
      i++;
      delay += 14;
      if (delay < 240) {
        timers.push(setTimeout(tick, delay));
      } else {
        timers.push(setTimeout(finish, 220));
      }
    };
    timers.push(setTimeout(tick, delay));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${
        locked
          ? 'td-pop bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <Avatar src={shown.avatar} name={shown.name} size="sm" />
      <span
        className={`font-bold text-base truncate ${
          locked ? 'text-emerald-700' : 'text-slate-400'
        }`}
      >
        {shown.name}
      </span>
    </div>
  );
}

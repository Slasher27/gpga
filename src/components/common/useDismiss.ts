import { useEffect, type RefObject } from 'react';

/**
 * Dismiss-on-Escape (and optional outside pointer-down) for popovers, menus
 * and drop-ups. Listeners are only attached while `active`, so closed
 * components add no global handlers.
 *
 * Pass a `ref` to also close when the user clicks/taps outside that element;
 * omit it when an explicit backdrop already handles outside dismissal.
 */
export function useDismiss(
  onDismiss: () => void,
  active: boolean,
  ref?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (ref && ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    if (ref) document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (ref) document.removeEventListener('mousedown', onPointerDown);
    };
  }, [active, onDismiss, ref]);
}

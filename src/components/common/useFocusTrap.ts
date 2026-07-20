import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal-dialog focus behavior shared by Modal and DatePicker: moves focus into
 * the dialog (skipping close buttons), traps Tab, closes on Escape, locks body
 * scroll, and restores focus to the trigger on close.
 */
export function useFocusTrap(boxRef: RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  // Keep the latest onClose without making it an effect dependency — otherwise an
  // inline onClose (new ref every render) would re-run the effect on every parent
  // re-render and yank focus back to the first field while the user is typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const box = boxRef.current;
    const triggerEl = document.activeElement as HTMLElement | null;

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog (first field, not a close button)
    const focusables = box ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables.find(el => !el.getAttribute('aria-label')?.startsWith('Close')) ?? box;
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      triggerEl?.focus?.();
    };
  }, [active, boxRef]);
}

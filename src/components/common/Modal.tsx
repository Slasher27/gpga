import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showClose = true,
  titleHidden = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  showClose?: boolean;
  titleHidden?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Keep the latest onClose without making it an effect dependency — otherwise an
  // inline onClose (new ref every render) would re-run the effect on every parent
  // re-render and yank focus back to the first field while the user is typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const box = boxRef.current;
    const triggerEl = document.activeElement as HTMLElement | null;

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog (first field, not the close button)
    const focusables = box ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables.find(el => el.getAttribute('aria-label') !== 'Close') ?? box;
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
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="modal modal-open">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-box ${size === 'md' ? 'max-w-md' : ''}`}
      >
        {showClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            <X size={18} />
          </button>
        )}
        <h3 id={titleId} className={titleHidden ? 'sr-only' : 'font-bold text-lg mb-4'}>{title}</h3>
        <div>{children}</div>
      </div>
      <button type="button" aria-label="Close dialog" className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

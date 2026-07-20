import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap';

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

  useFocusTrap(boxRef, isOpen, onClose);

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

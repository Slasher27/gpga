import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button type="button" onClick={onClose} aria-label="Close" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <X size={18} />
        </button>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div>{children}</div>
      </div>
      <button type="button" aria-label="Close dialog" className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

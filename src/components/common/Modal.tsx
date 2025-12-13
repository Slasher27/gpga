import React from 'react';
import { X } from 'lucide-react';
import type { ModalProps } from '../../types';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <X size={18} />
        </button>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div>{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

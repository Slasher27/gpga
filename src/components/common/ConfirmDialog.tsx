import React from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md" showClose={false} titleHidden>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <Trash2 size={48} className="text-red-500" />
        </div>

        <h3 className="font-bold text-xl mb-2">{title}</h3>

        <p className="text-slate-600 mb-6">{message}</p>

        <div className="flex gap-3 w-full">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
            {cancelText}
          </button>
          <button type="button" onClick={handleConfirm} className="btn btn-error flex-1">
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Convenience hook for confirmation dialogs
export const useConfirm = () => {
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const confirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={confirmState.isOpen}
      onClose={closeConfirm}
      onConfirm={confirmState.onConfirm}
      title={confirmState.title}
      message={confirmState.message}
    />
  );

  return { confirm, ConfirmDialogComponent };
};

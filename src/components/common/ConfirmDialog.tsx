import React from 'react';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    if (icon) return icon;
    if (type === 'danger') return <Trash2 size={48} className="text-red-500" />;
    if (type === 'warning') return <AlertTriangle size={48} className="text-amber-500" />;
    return <XCircle size={48} className="text-blue-500" />;
  };

  const getButtonClasses = () => {
    if (type === 'danger') return 'btn btn-error';
    if (type === 'warning') return 'btn btn-warning';
    return 'btn btn-primary';
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4">
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="font-bold text-xl mb-2">{title}</h3>

          {/* Message */}
          <p className="text-slate-600 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`${getButtonClasses()} flex-1`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

// Convenience hook for confirmation dialogs
export const useConfirm = () => {
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
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
      type={confirmState.type}
    />
  );

  return { confirm, ConfirmDialogComponent };
};

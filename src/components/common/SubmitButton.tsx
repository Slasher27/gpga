import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  pendingLabel?: ReactNode;
}

// Async-aware button: while `pending`, it disables itself (prevents double
// submit) and shows a spinner. Styling is delegated via `className` so it
// matches the existing buttons it replaces. Defaults to type="button".
export default function SubmitButton({
  pending = false,
  pendingLabel,
  children,
  type = 'button',
  disabled,
  className = '',
  ...rest
}: SubmitButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || pending} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {pendingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

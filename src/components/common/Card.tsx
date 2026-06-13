import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card border border-slate-200 ${className}`}>{children}</div>;
}

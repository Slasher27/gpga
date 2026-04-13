import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card bg-base-100 border border-slate-200 ${className}`}>{children}</div>;
}

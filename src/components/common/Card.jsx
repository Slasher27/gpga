export default function Card({ children, className = "" }) {
  return <div className={`card bg-base-100 border border-slate-200 ${className}`}>{children}</div>;
}

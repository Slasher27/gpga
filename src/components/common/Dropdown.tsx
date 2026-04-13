import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption<T = string | number> {
  value: T;
  label: string;
}

export default function Dropdown<T extends string | number = string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropUp(rect.bottom + 150 > window.innerHeight);
    }
    setOpen(!open);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button onClick={handleToggle} type="button"
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
        <span className="truncate">{selected?.label || '—'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 w-full bg-white border border-slate-200 rounded-lg overflow-hidden ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  o.value === value ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

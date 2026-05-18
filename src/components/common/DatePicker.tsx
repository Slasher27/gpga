import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { formatDate as formatDisplay } from './SharedUI';

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
}: {
  value: string | null | undefined;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };


  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const handleDateSelect = (date: Date) => {
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const isToday = (date: Date | null) => !!date && date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date | null) => !!value && !!date && formatDate(date) === value;

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (value) setCurrentMonth(new Date(value));
          setIsOpen(true);
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-sm text-left hover:border-slate-400 focus:border-emerald-500 focus:outline-none transition-colors min-h-[44px]"
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={18} className="text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Select date"
        >
          <button type="button" aria-label="Close date picker" className="absolute inset-0 bg-slate-900/50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md sm:max-w-xs bg-white shadow-xl rounded-t-2xl sm:rounded-xl border border-slate-200 flex flex-col max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {/* Header — month nav (fixed, doesn't scroll) */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="font-semibold text-sm text-slate-800">{monthName}</div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Scrollable area — grid + weekdays. Scrolls internally if the
                panel is taller than the viewport (e.g. short phones). */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3">
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1 pb-1">
                {days.map((date, idx) => {
                  if (!date) return <div key={idx} className="aspect-square" />;
                  const selected = isSelected(date);
                  const today = isToday(date);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      className={`aspect-square min-h-[36px] rounded-lg text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : today
                          ? 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer — today + cancel (fixed, doesn't scroll) */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDateSelect(new Date())}
                className="flex-1 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-h-[44px]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

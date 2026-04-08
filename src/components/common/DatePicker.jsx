import { useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

export default function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const handleDateSelect = (date) => {
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const isToday = (date) => date && date.toDateString() === new Date().toDateString();
  const isSelected = (date) => value && date && formatDate(date) === value;

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}
        className="input input-bordered w-full flex items-center justify-between cursor-pointer focus-within:input-primary">
        <span className={value ? '' : 'opacity-50'}>{value ? formatDisplayDate(value) : placeholder}</span>
        <Calendar size={18} className="opacity-50" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 p-3 bg-base-100 border border-base-300 rounded-lg shadow-xl w-64">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="btn btn-ghost btn-xs btn-circle">
                <ChevronDown size={14} className="rotate-90" />
              </button>
              <div className="font-semibold text-sm">{monthName}</div>
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="btn btn-ghost btn-xs btn-circle">
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[10px] font-semibold opacity-60 py-0.5">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((date, idx) => (
                <div key={idx}>
                  {date ? (
                    <button type="button" onClick={() => handleDateSelect(date)}
                      className={`btn btn-xs w-full h-7 min-h-0 text-xs ${
                        isSelected(date) ? 'btn-primary' : isToday(date) ? 'btn-outline btn-primary' : 'btn-ghost'
                      }`}>
                      {date.getDate()}
                    </button>
                  ) : <div />}
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-base-300">
              <button type="button" onClick={() => handleDateSelect(new Date())} className="btn btn-xs btn-ghost w-full">Today</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

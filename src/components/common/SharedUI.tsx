import { useMemo } from 'react';
import { X, Search } from 'lucide-react';
import type { GolfCourse, Round, FinesSummary, ScoresMap } from '../../api';

// --- timeAgo ---
// Relative time string. `long` => "5m ago" + date fallback past 7d (full page),
// otherwise compact "5m" (notification dropdown).
export function timeAgo(date: string, long = false): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return long ? 'just now' : 'now';
  if (mins < 60) return `${mins}m${long ? ' ago' : ''}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h${long ? ' ago' : ''}`;
  const days = Math.floor(hrs / 24);
  if (long && days >= 7) return new Date(date).toLocaleDateString();
  return `${days}d${long ? ' ago' : ''}`;
}

// --- formatDate ---
// Friendly date used app-wide, e.g. "May 24, 2026". Shared by DatePicker
// and Dashboard so the format stays consistent in one place.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// --- EmptyRow ---
// Compact, consistent inline empty/placeholder used inside cards & lists.
export function EmptyRow({ children }: { children: string }) {
  return <div className="p-8 text-center text-slate-400 text-sm">{children}</div>;
}

// --- TabBar ---
export interface TabDef {
  id: string;
  label: string;
}

export const TabBar = ({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) => (
  <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 min-w-[60px] px-3 py-3 text-sm font-medium text-center transition-colors whitespace-nowrap min-h-[44px] ${
          active === tab.id
            ? 'text-emerald-600 border-b-2 border-emerald-600'
            : 'text-slate-600 hover:text-slate-800'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// --- Avatar ---
type AvatarSize = 'sm' | 'md' | 'lg';

export const Avatar = ({ src, name, size = 'md' }: { src?: string | null; name: string; size?: AvatarSize }) => {
  const sizes: Record<AvatarSize, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-xl',
  };
  const initials = name.split(' ').map((n) => n.charAt(0)).slice(0, 2).join('');
  if (src) return <img src={src} alt="" className={`${sizes[size]} rounded-full object-cover`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold`}>
      {initials}
    </div>
  );
};

// --- fileToAvatarDataUrl ---
// Avatars are stored inline in the players row and refetched on every load, so a
// raw phone photo (hundreds of KB) would bloat every players fetch. Downscale to a
// small JPEG thumbnail (longest side <= `max`px) before saving — typically a few KB.
// Rendered with object-cover in a circle, so plain aspect-preserving downscale is enough.
export async function fileToAvatarDataUrl(file: File, max = 128, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image');
  if (file.size > 15_000_000) throw new Error('Image is too large (max 15MB)');

  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = original;
  });

  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return original; // canvas unsupported — keep the original rather than fail
  ctx.fillStyle = '#fff'; // JPEG has no alpha; flatten any transparency to white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// --- PlayerRoundsTable ---
type PlayerScoreMap = Record<number, { strokes?: number; handicap?: number; stableford?: number }>;

export const PlayerRoundsTable = ({ rounds, playerScores }: { rounds: Round[]; playerScores: PlayerScoreMap }) => (
  <div className="overflow-x-auto -mx-4">
    {rounds.length > 0 ? (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-600 uppercase border-b border-slate-100">
            <th scope="col" className="px-4 py-2 font-medium">Round</th>
            <th scope="col" className="px-4 py-2 font-medium">Course</th>
            <th scope="col" className="px-4 py-2 font-medium text-center">Net</th>
            <th scope="col" className="px-4 py-2 font-medium text-center">HC</th>
            <th scope="col" className="px-4 py-2 font-medium text-center">SF</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => {
            const s = playerScores[r.id];
            return (
              <tr key={r.id} className={`border-b border-slate-50 ${!s?.strokes ? 'opacity-30' : ''}`}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{r.course_name}</td>
                <td className="px-4 py-2.5 text-center font-bold text-slate-800">{s?.strokes || '-'}</td>
                <td className="px-4 py-2.5 text-center text-slate-600">{s?.handicap || '-'}</td>
                <td className="px-4 py-2.5 text-center text-slate-600">{s?.stableford || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    ) : (
      <div className="py-12 text-center text-slate-400">No rounds this season</div>
    )}
  </div>
);

// --- FinesSummaryCards ---
export const FinesSummaryCards = ({ summary }: { summary: FinesSummary }) => (
  <div className="grid grid-cols-3 gap-3">
    <div className="bg-red-50 rounded-lg p-3 text-center">
      <p className="text-xs text-red-500">Total</p>
      <p className="text-lg font-bold text-red-700 mt-0.5">R{summary.total_fines.toLocaleString()}</p>
    </div>
    <div className="bg-emerald-50 rounded-lg p-3 text-center">
      <p className="text-xs text-emerald-500">Paid</p>
      <p className="text-lg font-bold text-emerald-700 mt-0.5">R{summary.paid_fines.toLocaleString()}</p>
    </div>
    <div className="bg-slate-100 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">Outstanding</p>
      <p className="text-lg font-bold text-slate-700 mt-0.5">R{summary.outstanding_fines.toLocaleString()}</p>
    </div>
  </div>
);

// --- StatsGrid ---
export const StatsGrid = ({
  roundsPlayed,
  totalRounds,
  avgScore,
  totalStrokes,
  totalStableford,
}: {
  roundsPlayed: number;
  totalRounds: number;
  avgScore: number;
  totalStrokes: number;
  totalStableford: number;
}) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">Rounds</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">
        {roundsPlayed} <span className="text-sm font-normal text-slate-400">/ {totalRounds}</span>
      </p>
    </div>
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">Average</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{avgScore || '-'}</p>
    </div>
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">Total Strokes</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{totalStrokes || '-'}</p>
    </div>
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">Stableford</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{totalStableford || '-'}</p>
    </div>
  </div>
);

// --- CourseSelector ---
export const CourseSelector = ({
  courses,
  selected,
  onSelect,
  searchTerm,
  onSearchChange,
}: {
  courses: GolfCourse[];
  selected: GolfCourse | null;
  onSelect: (c: GolfCourse) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
}) => {
  const filtered = useMemo(() => {
    if (!searchTerm) return courses;
    const term = searchTerm.toLowerCase();
    return courses.filter((c) => c.name.toLowerCase().includes(term) || c.location.toLowerCase().includes(term));
  }, [courses, searchTerm]);

  return (
    <>
      <div className="form-control">
        <label htmlFor="course-search" className="block text-sm font-semibold text-slate-700 mb-1">
          <span className="flex items-center gap-2">
            <span>Golf Course</span>
            {selected && <span className="badge badge-success badge-sm">{selected.name}</span>}
          </span>
        </label>
        <div className="input input-bordered w-full flex items-center gap-2 focus-within:border-emerald-500">
          <Search size={16} className="opacity-70" />
          <input
            id="course-search"
            name="course-search"
            type="search"
            autoComplete="off"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="grow"
            placeholder="Search courses..."
          />
          {searchTerm && (
            <button type="button" onClick={() => onSearchChange('')} className="btn btn-ghost btn-xs btn-circle" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {searchTerm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-slate-100 rounded-lg">
          {filtered.length > 0 ? (
            filtered.map((course) => (
              <button
                type="button"
                key={course.id}
                onClick={() => onSelect(course)}
                className={`text-left w-full rounded-lg p-3 transition-all border ${
                  selected?.id === course.id ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-tight">{course.name}</span>
                  {selected?.id === course.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`block text-xs mt-1 ${selected?.id === course.id ? 'opacity-90' : 'text-slate-500'}`}>{course.location}</span>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${selected?.id === course.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>Par {course.par}</span>
              </button>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-slate-400 text-sm">No courses found</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// --- usePlayerStats hook ---
type ScoreWithFines = { strokes?: number; handicap?: number; stableford?: number; fines?: number };

export function usePlayerStats(playerId: string, scores: ScoresMap | Record<string, Record<number, ScoreWithFines>>, rounds: Round[]) {
  return useMemo(() => {
    const playerScores = (scores[playerId] || {}) as Record<number, ScoreWithFines>;
    const seasonRoundIds = new Set(rounds.map((r) => r.id));
    let roundsPlayed = 0, totalStrokes = 0, totalStableford = 0, totalFines = 0;
    for (const [rid, s] of Object.entries(playerScores)) {
      if (!seasonRoundIds.has(Number(rid))) continue;
      const strokes = s.strokes || 0;
      if (strokes > 0) {
        roundsPlayed++;
        totalStrokes += strokes;
        totalStableford += s.stableford || 0;
      }
      totalFines += s.fines || 0;
    }
    const avgScore = roundsPlayed > 0 ? Math.round(totalStrokes / roundsPlayed) : 0;
    return { playerScores, roundsPlayed, totalStrokes, totalStableford, totalFines, avgScore };
  }, [playerId, scores, rounds]);
}

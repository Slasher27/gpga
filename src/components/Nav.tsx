import { useState, useCallback, type ReactNode } from 'react';
import { Trophy, LogOut, Download, EllipsisVertical } from 'lucide-react';
import { Avatar, Dropdown, NotificationPanel, useDismiss } from './common';
import type { Player, Season } from '../api';

export interface NavItem {
  id: string;
  icon: ReactNode;
  label: string;
}

interface TopBarProps {
  currentUser: Player;
  activeSeason: Season | null;
  allSeasons: Season[];
  handleSeasonSwitch: (seasonId: number) => void;
  handleLogout: () => void;
  setNavView: (id: string) => void;
  canInstall: boolean;
  onInstall: () => void;
}

interface SidebarProps {
  view: string;
  setNavView: (id: string) => void;
  navItems: NavItem[];
  activeSeason: Season | null;
}

interface MobileNavProps {
  view: string;
  setNavView: (id: string) => void;
  navItems: NavItem[];
}

// Top bar — desktop: offset by sidebar width. Mobile: full width.
export function TopBar({ currentUser, activeSeason, allSeasons, handleSeasonSwitch, handleLogout, setNavView, canInstall, onInstall }: TopBarProps) {
  return (
    <div className="fixed top-0 right-0 left-0 md:left-16 lg:left-56 bg-white border-b border-slate-200 z-30 px-4 md:px-6 py-2 flex items-center justify-between h-14">
      {/* Mobile logo */}
      <h1 className="md:hidden text-base font-bold text-slate-800 flex items-center gap-1.5">
        <Trophy className="text-emerald-500" size={18} />
        GPGA
      </h1>
      <div className="hidden md:block" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {allSeasons.length > 1 && (
          <Dropdown
            label="Season"
            value={activeSeason?.id}
            options={allSeasons.map(s => ({ value: s.id, label: String(s.year) }))}
            onChange={(id) => handleSeasonSwitch(Number(id))}
          />
        )}
        {canInstall && (
          <button onClick={onInstall} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors sm:flex sm:items-center sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold sm:bg-emerald-50 sm:hover:bg-emerald-100" aria-label="Install app">
            <Download size={16} />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}
        <NotificationPanel playerId={currentUser?.id} seasonId={activeSeason?.id ?? null} onViewAll={() => setNavView('notifications')} />
        <button onClick={() => setNavView('profile')} className="p-1 rounded-full hover:ring-2 hover:ring-emerald-200 transition-all" aria-label="Profile">
          <Avatar src={currentUser?.avatar} name={currentUser?.name || '?'} size="sm" />
        </button>
        <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

// Side nav — slim icon rail on tablet (md), full labelled sidebar on desktop (lg+).
export function DesktopSidebar({ view, setNavView, navItems, activeSeason }: SidebarProps) {
  return (
    <div className="hidden md:flex md:w-16 lg:w-56 bg-white border-r border-slate-200 flex-col h-full fixed left-0 top-0 z-40 overflow-y-auto">
      <div className="p-3 lg:p-5 pb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 justify-center lg:justify-start">
          <Trophy className="text-emerald-500" size={22} />
          <span className="sr-only lg:not-sr-only">GPGA</span>
        </h1>
        <p className="hidden lg:block text-xs text-slate-400 mt-1">{activeSeason?.name || 'No Season'}</p>
      </div>

      <nav className="flex-1 px-2 lg:px-3 space-y-1">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setNavView(item.id)} title={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm justify-center lg:justify-start ${
              view === item.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}>
            {item.icon}
            <span className="sr-only lg:not-sr-only">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Mobile bottom tab bar. Up to 4 primary tabs; any extra (role-dependent)
// collapse into a ⋮ "More" drop-up so nothing becomes unreachable on phones.
export function MobileBottomNav({ view, setNavView, navItems }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasOverflow = navItems.length > 5;
  const primary = hasOverflow ? navItems.slice(0, 4) : navItems.slice(0, 5);
  const overflow = hasOverflow ? navItems.slice(4) : [];
  const moreActive = overflow.some(i => i.id === view);

  const go = (id: string) => { setNavView(id); setMoreOpen(false); };
  useDismiss(useCallback(() => setMoreOpen(false), []), moreOpen);

  return (
    <div className="md:hidden">
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed right-2 z-50 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-52 bg-white border border-slate-200 rounded-lg overflow-hidden">
            {overflow.map(item => (
              <button key={item.id} type="button" onClick={() => go(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                  view === item.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {primary.map(item => (
            <button key={item.id} type="button" onClick={() => go(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[64px] transition-colors ${
                view === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}>
              {item.icon}
              <span className="text-[11px] font-medium leading-none mt-1">{item.label}</span>
              {view === item.id && <span className="sr-only">(current)</span>}
            </button>
          ))}
          {hasOverflow && (
            <button type="button" onClick={() => setMoreOpen(o => !o)} aria-label="More"
              className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[64px] transition-colors ${
                moreActive || moreOpen ? 'text-emerald-600' : 'text-slate-400'
              }`}>
              <EllipsisVertical size={20} />
              <span className="text-[11px] font-medium leading-none mt-1">More</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

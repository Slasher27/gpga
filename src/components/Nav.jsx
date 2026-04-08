import { Trophy, Settings, LogOut, Download } from 'lucide-react';
import { Avatar, Dropdown, NotificationPanel } from './common';

// Top bar — desktop: offset by sidebar width. Mobile: full width.
export function TopBar({ currentUser, activeSeason, allSeasons, handleSeasonSwitch, handleLogout, setNavView, canInstall, onInstall }) {
  return (
    <div className="fixed top-0 right-0 left-0 md:left-56 bg-white border-b border-slate-200 z-30 px-4 md:px-6 py-2 flex items-center justify-between h-14">
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
        <NotificationPanel playerId={currentUser?.id} seasonId={activeSeason?.id} onViewAll={() => setNavView('notifications')} />
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

// Sidebar — desktop only, just navigation
export function DesktopSidebar({ view, setNavView, navItems, activeSeason, allSeasons, isAdmin }) {
  return (
    <div className="hidden md:flex w-56 bg-white border-r border-slate-200 flex-col h-full fixed left-0 top-0 z-40 overflow-y-auto">
      <div className="p-5 pb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="text-emerald-500" size={22} />
          GPGA
        </h1>
        <p className="text-xs text-slate-400 mt-1">{activeSeason?.name || 'No Season'}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setNavView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
              view === item.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button onClick={() => setNavView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                view === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <Settings size={20} /> Season Settings
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

// Mobile bottom tab bar
export function MobileBottomNav({ view, setNavView, navItems }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
      <div className="flex">
        {navItems.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => setNavView(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[44px] transition-colors ${
              view === item.id ? 'text-emerald-600' : 'text-slate-400'
            }`}>
            {item.icon}
            <span className="text-[10px] font-medium leading-none mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

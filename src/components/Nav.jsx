import { Trophy, Plus, XCircle, LogOut } from 'lucide-react';
import { Avatar } from './common';

export function DesktopSidebar({ view, setNavView, navItems, currentUser, activeSeason, allSeasons, handleSeasonSwitch, handleLogout, isMaster, handleEndSeason, onNewSeason }) {
  return (
    <div className="hidden md:flex w-56 bg-white border-r border-slate-200 flex-col h-full fixed left-0 top-0 z-40">
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

        {isMaster && (
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
            <button onClick={onNewSeason} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <Plus size={20} /> New Season
            </button>
            {activeSeason?.is_active === 1 && (
              <button onClick={handleEndSeason} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                <XCircle size={20} /> End Season
              </button>
            )}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-3">
        {allSeasons.length > 1 && (
          <select id="season-switcher" name="season-switcher" aria-label="Select season" value={activeSeason?.id || ''}
            onChange={(e) => handleSeasonSwitch(Number(e.target.value))}
            className="w-full text-xs rounded-lg px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 focus:border-emerald-500 focus:outline-none min-h-[36px]">
            {allSeasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.is_active ? '' : ' (ended)'}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-3 px-2">
          <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav({ view, setNavView, navItems, activeSeason, allSeasons, handleSeasonSwitch, handleLogout }) {
  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-30">
        <h1 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Trophy className="text-emerald-500" size={18} />
          GPGA
        </h1>
        <div className="flex items-center gap-2">
          {allSeasons.length > 1 && (
            <select id="mobile-season-switcher" name="mobile-season-switcher" aria-label="Select season"
              value={activeSeason?.id || ''} onChange={(e) => handleSeasonSwitch(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none">
              {allSeasons.map(s => (
                <option key={s.id} value={s.id}>{s.year}{s.is_active ? '' : ' (ended)'}</option>
              ))}
            </select>
          )}
          <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
        <div className="flex">
          {navItems.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => setNavView(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 min-h-[56px] transition-colors ${
                view === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

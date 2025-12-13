import React from 'react';
import {
  Trophy, Users, Banknote, Calendar, TrendingUp, User,
  LogOut, Moon, Sun, RefreshCw
} from 'lucide-react';
import { useAuth, useTheme } from '../../hooks';
import type { Player, ViewKey } from '../../types';

interface SidebarProps {
  view: ViewKey;
  setView: (view: ViewKey) => void;
  players: Player[];
  currentUserId: string;
  onUserSwitch: (userId: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  setView,
  players,
  currentUserId,
  onUserSwitch,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const currentUser = players.find(p => p.id === currentUserId) || players[0];

  const handleNavClick = (viewId: ViewKey) => {
    setView(viewId);
    localStorage.setItem('gpga_current_view', viewId);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ icon, label, id }: { icon: React.ReactNode; label: string; id: ViewKey }) => (
    <button
      onClick={() => handleNavClick(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        view === id ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-slate-900 text-slate-300 flex flex-col h-full fixed left-0 top-0 overflow-y-auto z-40 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="text-emerald-500" />
            GPGA 2025
          </h1>
          <p className="text-xs text-slate-500 mt-2">Season Manager (TypeScript)</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<TrendingUp />} label="Leaderboard" id="dashboard" />

          {currentUser?.role === 'player' && (
            <NavItem icon={<User />} label="My Profile" id="profile" />
          )}

          {currentUser?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Admin</p>
              </div>
              <NavItem icon={<Banknote />} label="Manage Fines" id="fines" />
              <NavItem icon={<Calendar />} label="Manage Rounds" id="rounds" />
              <NavItem icon={<Users />} label="Manage Players" id="players" />
            </>
          )}
        </nav>

        {/* Dev Tool: User Switcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <label className="text-xs text-slate-500 block mb-2">Simulate Login As:</label>
          <div className="relative">
            <select
              className="w-full bg-slate-800 text-slate-300 text-xs rounded p-2 appearance-none cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none"
              value={currentUserId}
              onChange={(e) => onUserSwitch(e.target.value)}
            >
              {players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-2 pointer-events-none">
              <RefreshCw size={12} className="text-slate-500" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                {currentUser?.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'emerald' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'emerald' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Trophy,
  Users,
  Banknote,
  Settings,
  Plus,
  Save,
  X,
  TrendingUp,
  User,
  Camera,
  Trash2,
  RefreshCw,
  Edit,
  MoreVertical,
  ChevronDown,
  Search,
  Calendar,
  MapPin,
  LogOut,
  Eye,
  EyeOff,
  Moon,
  Sun,
  CheckCircle,
  XCircle,
  Menu,
  DollarSign,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as DB from './api.ts';
import {
  DashboardSkeleton,
  useConfirm,
  NoPlayersEmptyState,
  NoRoundsEmptyState,
  NoScoresEmptyState,
  NoFinesEmptyState
} from './components/common';

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type = 'neutral' }) => {
  const styles = {
    neutral: 'badge badge-ghost',
    success: 'badge badge-success',
    danger: 'badge badge-error',
    warning: 'badge badge-warning'
  };
  return <span className={`${styles[type]} badge-sm`}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <X size={18} />
        </button>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div>{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

const DatePicker = ({ value, onChange, placeholder = 'Select date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleDateSelect = (date) => {
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const isToday = (date) => {
    const today = new Date();
    return date && date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!value || !date) return false;
    return formatDate(date) === value;
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input input-bordered w-full flex items-center justify-between cursor-pointer focus-within:input-primary"
      >
        <span className={value ? '' : 'opacity-50'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar size={18} className="opacity-50" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 mt-1 p-3 bg-base-100 border border-base-300 rounded-lg shadow-xl w-64">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <ChevronDown size={14} className="rotate-90" />
              </button>
              <div className="font-semibold text-sm">{monthName}</div>
              <button
                type="button"
                onClick={nextMonth}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[10px] font-semibold opacity-60 py-0.5">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((date, idx) => (
                <div key={idx}>
                  {date ? (
                    <button
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      className={`btn btn-xs w-full h-7 min-h-0 text-xs ${
                        isSelected(date)
                          ? 'btn-primary'
                          : isToday(date)
                          ? 'btn-outline btn-primary'
                          : 'btn-ghost'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div></div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-base-300">
              <button
                type="button"
                onClick={() => handleDateSelect(new Date())}
                className="btn btn-xs btn-ghost w-full"
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('gpga_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('gpga_remembered_email') !== null;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await DB.authenticateUser(email, password);

      if (user) {
        DB.setAuthenticated(true);
        DB.setCurrentUserId(user.id);

        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('gpga_remembered_email', email);
        } else {
          localStorage.removeItem('gpga_remembered_email');
        }

        onLogin(user);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-full">
                <Trophy size={48} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">GPGA</h1>
            <p className="text-emerald-100">Golf Pro Golf Association</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Sign In</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="your.email@example.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-700">
                Remember my email
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 text-center mb-2 font-semibold">Demo Credentials</p>
              <p className="text-xs text-slate-500 text-center">
                Use any player's email with password: <span className="font-mono font-semibold">password</span>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Manage scores, fines, and leaderboards for your golf league
        </p>
      </div>
    </div>
  );
};

export default function GPGAManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gpga_theme') || 'emerald';
  });
  const [view, setView] = useState(() => {
    return localStorage.getItem('gpga_current_view') || 'dashboard';
  });
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [scores, setScores] = useState({});
  const [currentUserId, setCurrentUserId] = useState('1');
  const [dbReady, setDbReady] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);

  // UI States
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isAddRoundModalOpen, setIsAddRoundModalOpen] = useState(false);
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false);
  const [isEditRoundModalOpen, setIsEditRoundModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [isAddFineTypeModalOpen, setIsAddFineTypeModalOpen] = useState(false);
  const [deleteRoundConfirm, setDeleteRoundConfirm] = useState(null); // { id, name }
  const [managingPlayerId, setManagingPlayerId] = useState(null); // For full player profile page
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Golf course selection states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [golfCourses, setGolfCourses] = useState([]);

  // Buy-in status cache for Players Directory view
  const [directoryBuyInCache, setDirectoryBuyInCache] = useState({});

  // Date picker state
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Season management
  const [allSeasons, setAllSeasons] = useState([]);
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Confirmation dialog hook
  const { confirm: showConfirm, ConfirmDialogComponent } = useConfirm();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'emerald' ? 'forest' : 'emerald';
    setTheme(newTheme);
    localStorage.setItem('gpga_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Set theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initialize database and load data
  useEffect(() => {
    const initDB = async () => {
      try {
        await DB.initDatabase();

        // Check if user is authenticated
        const authenticated = DB.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          await loadData();
          const userId = DB.getCurrentUserId();
          setCurrentUserId(userId);
        }

        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initDB();
  }, []);

  // Load data from database
  const loadData = async () => {
    try {
      // Get active season
      const season = await DB.getActiveSeason();
      setActiveSeason(season);

      // Load all seasons
      const seasonsData = await DB.getAllSeasons();
      setAllSeasons(seasonsData);

      // Load players
      const playersData = await DB.getAllPlayers();
      setPlayers(playersData);

      // Load rounds for active season
      const roundsData = season ? await DB.getAllRounds(season.id) : await DB.getAllRounds();
      setRounds(roundsData);

      // Load golf courses
      const coursesData = await DB.getAllGolfCourses();
      setGolfCourses(coursesData);

      // Load scores (strokes only)
      const scoresData = await DB.getAllScores();

      // Load fines separately
      const finesData = await DB.getPlayerFinesByRound();

      // Merge scores and fines
      const mergedData = { ...scoresData };
      Object.keys(finesData).forEach(playerId => {
        if (!mergedData[playerId]) mergedData[playerId] = {};
        Object.keys(finesData[playerId]).forEach(roundId => {
          if (!mergedData[playerId][roundId]) {
            mergedData[playerId][roundId] = { strokes: 0, fines: 0 };
          }
          mergedData[playerId][roundId].fines = finesData[playerId][roundId];
        });
      });

      setScores(mergedData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const currentUser = players.find(p => p.id === currentUserId) || players[0];

  // Refresh fines data when navigating away from fines view
  useEffect(() => {
    const previousView = localStorage.getItem('gpga_previous_view');
    if (previousView === 'fines' && view !== 'fines') {
      // Only reload fines data, not everything
      DB.getPlayerFinesByRound().then(finesData => {
        setScores(prev => {
          const merged = { ...prev };
          Object.keys(finesData).forEach(pid => {
            if (!merged[pid]) merged[pid] = {};
            Object.keys(finesData[pid]).forEach(rid => {
              if (!merged[pid][rid]) merged[pid][rid] = { strokes: 0, fines: 0 };
              merged[pid][rid] = { ...merged[pid][rid], fines: finesData[pid][rid] };
            });
          });
          return merged;
        });
      });
    }
    localStorage.setItem('gpga_previous_view', view);
  }, [view]);

  // Load buy-in status cache for Players Directory view
  useEffect(() => {
    let cancelled = false;
    const loadDirectoryBuyIn = async () => {
      if (!activeSeason?.id || players.length === 0) return;
      const results = await Promise.all(
        players.map(p => DB.getPlayerBuyInStatus(p.id, activeSeason.id).then(status => [p.id, status]))
      );
      if (cancelled) return;
      const cache = {};
      for (const [id, status] of results) cache[id] = status;
      setDirectoryBuyInCache(cache);
    };
    loadDirectoryBuyIn();
    return () => { cancelled = true; };
  }, [activeSeason?.id]); // Only reload on season change

  // Filter golf courses based on search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return golfCourses;
    const term = searchTerm.toLowerCase();
    return golfCourses.filter(course =>
      course.name.toLowerCase().includes(term) ||
      course.location.toLowerCase().includes(term)
    );
  }, [golfCourses, searchTerm]);

  // Calculate next round number
  const nextRoundName = useMemo(() => {
    if (rounds.length === 0) return 'Round 1';

    // Extract round numbers from existing rounds
    const roundNumbers = rounds
      .map(r => {
        const match = r.name.match(/Round (\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);

    if (roundNumbers.length === 0) return `Round ${rounds.length + 1}`;

    const maxRound = Math.max(...roundNumbers);
    return `Round ${maxRound + 1}`;
  }, [rounds]);

  // -- Calculations --
  const leaderboardData = useMemo(() => {
    const totalRoundsCreated = rounds.length; // How many rounds have been created so far

    return players.map(player => {
      const pScores = scores[player.id] || {};
      let totalStrokes = 0;
      let totalStableford = 0;
      let totalFines = 0;
      let roundsPlayed = 0;
      let worstRound = 0;
      let worstStableford = 999;

      rounds.forEach(r => {
        if (pScores[r.id]) {
          const s = pScores[r.id].strokes || 0;
          const sf = pScores[r.id].stableford || 0;
          const f = pScores[r.id].fines || 0;

          // Always count fines, even if no score entered
          totalFines += f;

          if (s > 0) {
            totalStrokes += s;
            totalStableford += sf;
            roundsPlayed++;
            if (s > worstRound) worstRound = s;
            if (sf < worstStableford) worstStableford = sf;
          }
        }
      });

      // Disqualified if missed more than 1 round
      const roundsMissed = totalRoundsCreated - roundsPlayed;
      const isDisqualified = roundsMissed > 1;

      // Player can drop worst round if they haven't missed any rounds
      const hasntMissedAnyRound = roundsPlayed === totalRoundsCreated;
      const canDropWorstRound = hasntMissedAnyRound && roundsPlayed > 0;
      const netTotal = canDropWorstRound ? totalStrokes - worstRound : totalStrokes;
      const netStableford = canDropWorstRound ? totalStableford - worstStableford : totalStableford;

      return {
        ...player,
        totalStrokes,
        totalStableford,
        netTotal,
        netStableford,
        worstRound: canDropWorstRound ? worstRound : 0,
        worstStableford: canDropWorstRound ? worstStableford : 0,
        totalFines,
        roundsPlayed,
        roundsMissed,
        isDisqualified,
        pScores,
        canDropWorstRound
      };
    }).sort((a, b) => {
        // DQ'd players always sort below qualifying players
        if (a.isDisqualified && !b.isDisqualified) return 1;
        if (!a.isDisqualified && b.isDisqualified) return -1;
        if (a.netTotal === 0 && b.netTotal === 0) return 0;
        if (a.netTotal === 0) return 1;
        if (b.netTotal === 0) return -1;
        return a.netTotal - b.netTotal;
    });
  }, [players, scores, rounds]);

  // -- Handlers --

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newId = Date.now().toString();

    const newPlayer = {
      id: newId,
      name: formData.get('name'),
      email: formData.get('email'),
      role: 'player',
      status: 'active',
      avatar: null
    };

    await DB.addPlayer(newPlayer);
    setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
    setIsAddPlayerModalOpen(false);
    showToast(`Player ${newPlayer.name} added successfully!`);
  };

  const handleUpdateProfile = async (e, setIsEditing) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedName = formData.get('name');
    const updatedEmail = formData.get('email');
    const updatedPassword = formData.get('password');

    const updates = {
      name: updatedName,
      email: updatedEmail
    };

    // Only update password if a new one was entered
    if (updatedPassword && updatedPassword.trim() !== '') {
      updates.password = updatedPassword;
    }

    await DB.updatePlayer(currentUser.id, updates);

    setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, name: updatedName, email: updatedEmail, ...(updatedPassword ? { password: updatedPassword } : {}) } : p));
    showToast("Profile updated successfully!");

    // Exit edit mode after saving
    if (setIsEditing) {
      setIsEditing(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
         showToast("File too large for browser storage. Please use a smaller image (<500kb).", "error");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        await DB.updatePlayer(currentUser.id, { avatar: reader.result });
        setPlayers(prev => prev.map(p => p.id === currentUser.id ? { ...p, avatar: reader.result } : p));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetData = () => {
    showConfirm(
      'Reset All Data?',
      'This will wipe all players, rounds, scores, and fines. The database will be reset to default seed data. This action cannot be undone.',
      () => {
        DB.resetDatabase();
      },
      'danger'
    );
  };

  const handleUserSwitch = (userId) => {
    setCurrentUserId(userId);
    DB.setCurrentUserId(userId);
  };

  const handleLogin = async (user) => {
    setIsAuthenticated(true);
    setCurrentUserId(user.id);
    await loadData();
  };

  const handleLogout = () => {
    DB.logout();
    setIsAuthenticated(false);
    setCurrentUserId('1');
    setView('dashboard');
  };

  // Show login page if not authenticated
  if (!isAuthenticated && dbReady) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show loading state while DB or player data is not ready
  if (!dbReady || !currentUser || players.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // -- Views --

  const Sidebar = () => (
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
      <div className="p-6 pb-3">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Trophy className="text-emerald-500" />
          GPGA
        </h1>
        {allSeasons.length > 1 ? (
          <select
            id="season-switcher"
            name="season-switcher"
            aria-label="Select season"
            value={activeSeason?.id || ''}
            onChange={async (e) => {
              const seasonId = Number(e.target.value);
              const season = allSeasons.find(s => s.id === seasonId);
              if (season) {
                setActiveSeason(season);
                const roundsData = await DB.getAllRounds(season.id);
                setRounds(roundsData);
                const scoresData = await DB.getAllScores();
                const finesData = await DB.getPlayerFinesByRound();
                const mergedData = { ...scoresData };
                Object.keys(finesData).forEach(pid => {
                  if (!mergedData[pid]) mergedData[pid] = {};
                  Object.keys(finesData[pid]).forEach(rid => {
                    if (!mergedData[pid][rid]) mergedData[pid][rid] = { strokes: 0, fines: 0 };
                    mergedData[pid][rid].fines = finesData[pid][rid];
                  });
                });
                setScores(mergedData);
              }
            }}
            className="mt-2 w-full bg-slate-800 text-slate-300 text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            {allSeasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-slate-500 mt-2">{activeSeason?.name || 'No Season'}</p>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <NavItem icon={<TrendingUp />} label="Leaderboard" id="dashboard" />
        <NavItem icon={<User />} label="My Profile" id="profile" />

        {currentUser.role === 'player' && (
          <NavItem icon={<Banknote />} label="View Fines" id="fines" />
        )}

        {(currentUser.role === 'master' || currentUser.role === 'admin') && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {currentUser.role === 'master' ? 'Master Admin' : 'Admin'}
              </p>
            </div>
            <NavItem icon={<Banknote />} label="Manage Fines" id="fines" />
            <NavItem icon={<Calendar />} label="Manage Rounds" id="rounds" />
            {currentUser.role === 'master' && (
              <>
                <NavItem icon={<Users />} label="Manage Players" id="admin" />
                <button
                  onClick={() => setIsNewSeasonModalOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-slate-800"
                >
                  <Plus size={18} />
                  <span className="font-medium text-sm">New Season</span>
                </button>
              </>
            )}
          </>
        )}
      </nav>

      {/* Dev Tool: User Switcher */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <label htmlFor="user-switcher" className="text-xs text-slate-500 block mb-2">Simulate Login As:</label>
        <div className="relative">
          <select
            id="user-switcher"
            name="user-switcher"
            className="w-full bg-slate-800 text-slate-300 text-xs rounded p-2 appearance-none cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none"
            value={currentUserId}
            onChange={(e) => handleUserSwitch(e.target.value)}
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
          {currentUser.avatar ? (
             <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 capitalize">
              {currentUser.role === 'master' ? 'Master' : currentUser.role}
            </p>
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
            onClick={handleLogout}
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

  const NavItem = ({ icon, label, id }) => (
    <button
      onClick={() => {
        setView(id);
        localStorage.setItem('gpga_current_view', id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        view === id ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800'
      }`}
    >
      {React.cloneElement(icon, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  const DashboardView = () => {
    const [leaderboardTab, setLeaderboardTab] = useState('medal');
    const [teamsData, setTeamsData] = useState([]);

    // Load teams for active season
    useEffect(() => {
      if (activeSeason) {
        DB.getTeams(activeSeason.id).then(data => setTeamsData(data));
      }
    }, [activeSeason]);

    // Calculate team leaderboard (combined stableford, ALL rounds count)
    const teamLeaderboard = useMemo(() => {
      if (!teamsData.length || !rounds.length) return [];

      return teamsData.map(team => {
        const p1Scores = scores[team.player1_id] || {};
        const p2Scores = scores[team.player2_id] || {};
        let total = 0;
        const roundTotals = {};

        rounds.forEach(r => {
          const p1sf = p1Scores[r.id]?.stableford || 0;
          const p2sf = p2Scores[r.id]?.stableford || 0;
          const combined = p1sf + p2sf;
          roundTotals[r.id] = combined;
          total += combined;
        });

        return { ...team, roundTotals, total };
      }).sort((a, b) => b.total - a.total);
    }, [teamsData, scores, rounds]);

    // Sort leaderboard based on selected tab
    const sortedLeaderboard = useMemo(() => {
      if (leaderboardTab === 'stableford') {
        // Stableford: Higher points is better, sort descending
        // DQ'd players always sort below qualifying players
        return [...leaderboardData].sort((a, b) => {
          if (a.isDisqualified && !b.isDisqualified) return 1;
          if (!a.isDisqualified && b.isDisqualified) return -1;
          if (a.netStableford === 0 && b.netStableford === 0) return 0;
          if (a.netStableford === 0) return 1;
          if (b.netStableford === 0) return -1;
          return b.netStableford - a.netStableford; // Descending
        });
      }
      // Medal is already sorted correctly (ascending)
      return leaderboardData;
    }, [leaderboardTab, leaderboardData]);

    const stablefordSorted = useMemo(() => {
      return [...leaderboardData].sort((a, b) => {
        if (a.isDisqualified && !b.isDisqualified) return 1;
        if (!a.isDisqualified && b.isDisqualified) return -1;
        if (a.netStableford === 0 && b.netStableford === 0) return 0;
        if (a.netStableford === 0) return 1;
        if (b.netStableford === 0) return -1;
        return b.netStableford - a.netStableford;
      });
    }, [leaderboardData]);

    const finesSorted = useMemo(() =>
      [...leaderboardData].sort((a, b) => b.totalFines - a.totalFines),
    [leaderboardData]);

    const totalFinesPot = leaderboardData.reduce((acc, curr) => acc + curr.totalFines, 0);

    // Empty state for new season
    if (rounds.length === 0) {
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-slate-800">{activeSeason?.name || 'Season'}</h2>
          <Card>
            <div className="p-8 md:p-12 text-center">
              <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">Season hasn't started yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No rounds have been played. Once the first round is created and scores are entered, the leaderboard will appear here.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    // Rank badge helper
    const RankBadge = ({ idx, dq }) => (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
        dq ? 'bg-slate-100 text-slate-400' :
        idx === 0 ? 'bg-yellow-400 text-yellow-900' :
        idx === 1 ? 'bg-slate-300 text-slate-700' :
        idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}>{dq ? '-' : idx + 1}</span>
    );

    // Player name cell helper
    const PlayerCell = ({ player }) => (
      <div className="flex items-center gap-2 min-w-0">
        <span className={`truncate ${player.isDisqualified ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
          {player.name}
        </span>
        {player.isDisqualified && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold flex-shrink-0">DQ</span>}
      </div>
    );

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Header + Season Summary */}
        <div>
          <h2 className="text-xl font-bold text-slate-800">{activeSeason?.name || 'Leaderboard'}</h2>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">Medal: {leaderboardData[0]?.name || '-'} ({leaderboardData[0]?.netTotal || '-'})</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Stableford: {stablefordSorted[0]?.name || '-'} ({stablefordSorted[0]?.netStableford || '-'})</span>
            {teamLeaderboard.length > 0 && (
              <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-semibold">Teams: {teamLeaderboard[0].name} ({teamLeaderboard[0].total})</span>
            )}
            <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-semibold">Fines Pot: R{totalFinesPot.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          {[
            { id: 'medal', label: 'Medal' },
            { id: 'stableford', label: 'Stableford' },
            { id: 'teams', label: 'Teams' },
            { id: 'fines', label: 'Fines' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLeaderboardTab(tab.id)}
              className={`flex-1 min-w-[70px] px-3 py-3 text-sm font-medium text-center transition-colors whitespace-nowrap min-h-[44px] ${
                leaderboardTab === tab.id
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Medal Tab */}
        {leaderboardTab === 'medal' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Player</th>
                    {rounds.map((r, i) => (
                      <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                    ))}
                    <th className="px-3 py-3 text-center bg-slate-100">Total</th>
                    <th className="px-3 py-3 text-center text-red-400">Drop</th>
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaderboardData.map((player, idx) => (
                    <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
                      <td className="px-3 py-3"><PlayerCell player={player} /></td>
                      {rounds.map(r => (
                        <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                          {player.pScores[r.id]?.strokes || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStrokes || '-'}</td>
                      <td className="px-3 py-3 text-center text-red-400 text-xs">{player.canDropWorstRound ? `-${player.worstRound}` : '-'}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netTotal || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Stableford Tab */}
        {leaderboardTab === 'stableford' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Player</th>
                    {rounds.map((r, i) => (
                      <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                    ))}
                    <th className="px-3 py-3 text-center bg-slate-100">Total</th>
                    <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stablefordSorted.map((player, idx) => (
                    <tr key={player.id} className={`${player.isDisqualified ? 'opacity-50' : idx === 0 ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3"><RankBadge idx={idx} dq={player.isDisqualified} /></td>
                      <td className="px-3 py-3"><PlayerCell player={player} /></td>
                      {rounds.map(r => (
                        <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                          {player.pScores[r.id]?.stableford || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-semibold bg-slate-50">{player.totalStableford || '-'}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{player.netStableford || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Teams Tab */}
        {leaderboardTab === 'teams' && (
          <Card>
            {teamLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No teams set up for this season</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-left w-10">#</th>
                      <th className="px-3 py-3 text-left">Team</th>
                      {rounds.map((r, i) => (
                        <th key={r.id} className="px-1.5 py-3 text-center text-xs">R{i+1}</th>
                      ))}
                      <th className="px-3 py-3 text-center font-bold bg-emerald-50 text-emerald-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {teamLeaderboard.map((team, idx) => (
                      <tr key={team.id} className={idx === 0 ? 'bg-purple-50/30' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-3"><RankBadge idx={idx} /></td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-800">{team.name}</p>
                          <p className="text-xs text-slate-400">{team.player1_name} & {team.player2_name}</p>
                        </td>
                        {rounds.map(r => (
                          <td key={r.id} className="px-1.5 py-3 text-center text-slate-600 text-xs">
                            {team.roundTotals[r.id] || <span className="text-slate-300">-</span>}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{team.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Fines Tab */}
        {leaderboardTab === 'fines' && (
          <div className="space-y-4">
            {/* Fines Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-xs text-red-500 uppercase font-medium">Fines Pot</p>
                <p className="text-2xl font-bold text-red-700 mt-1">R{totalFinesPot.toLocaleString()}</p>
                <p className="text-xs text-red-400 mt-1">{rounds.length} rounds</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-500 uppercase font-medium">Most Fines</p>
                <p className="text-lg font-bold text-amber-700 mt-1">{finesSorted[0]?.name || '-'}</p>
                <p className="text-xs text-amber-500 mt-1">R{finesSorted[0]?.totalFines?.toLocaleString() || '0'}</p>
              </div>
            </div>

            {/* Fines Ranking */}
            <Card>
              <div className="divide-y divide-slate-50">
                {finesSorted.map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-3 p-3">
                    <RankBadge idx={idx} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{player.name}</p>
                      <p className="text-xs text-slate-400">{player.roundsPlayed} rounds</p>
                    </div>
                    <p className="font-bold text-red-600 text-sm flex-shrink-0">R{player.totalFines.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chart */}
            {rounds.length > 0 && (
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase font-medium mb-3">Fines per Round</p>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer>
                    <LineChart data={rounds}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#94a3b8" tickFormatter={v => v.replace('Round ', 'R')} />
                      <YAxis tick={{fontSize: 11}} stroke="#94a3b8" />
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                      <Line type="monotone" dataKey={(r) => players.reduce((acc, p) => acc + (scores[p.id]?.[r.id]?.fines || 0), 0)} name="Total Fines" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const FinesView = () => {
    const sortedByFines = [...leaderboardData].sort((a,b) => b.totalFines - a.totalFines);
    const [finesTab, setFinesTab] = useState(() => {
      // Players start on leaderboard, admins/master on assign
      return currentUser.role === 'player' ? 'leaderboard' : 'assign';
    });
    const [isPending, startTransition] = useTransition();

    // Get the most recent round (last in the array)
    const mostRecentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

    const [selectedRound, setSelectedRound] = useState(mostRecentRound?.id || null);
    const [selectedPlayer, setSelectedPlayer] = useState(() => {
      return localStorage.getItem('gpga_selected_player') || null;
    });
    const [fineTypes, setFineTypes] = useState([]);
    const [playerFines, setPlayerFines] = useState([]);
    const [expandedPlayers, setExpandedPlayers] = useState({});
    const [roundViewPlayerFilter, setRoundViewPlayerFilter] = useState('all');
    const [expandedRoundViewPlayers, setExpandedRoundViewPlayers] = useState({});
    const [isRoundConfirmed, setIsRoundConfirmed] = useState(false);
    const [roundFinesData, setRoundFinesData] = useState([]);
    const [paymentSummaryData, setPaymentSummaryData] = useState([]);
    const [playerRoundFinesCache, setPlayerRoundFinesCache] = useState({});

    // Update selected round when a new round is created
    useEffect(() => {
      if (mostRecentRound && selectedRound !== mostRecentRound.id) {
        setSelectedRound(mostRecentRound.id);
      }
    }, [rounds.length]);

    useEffect(() => {
      if (activeSeason) {
        DB.getFineTypes(activeSeason.id).then(types => setFineTypes(types));
      }
    }, [activeSeason]);

    useEffect(() => {
      if (selectedPlayer && selectedRound) {
        DB.getPlayerFinesForRound(selectedPlayer, selectedRound).then(fines => setPlayerFines(fines));
      } else {
        setPlayerFines([]);
      }
    }, [selectedPlayer, selectedRound, scores]);

    // Load confirmed status for selected player+round
    useEffect(() => {
      if (selectedPlayer && selectedRound) {
        DB.isPlayerRoundConfirmed(selectedPlayer, selectedRound).then(v => setIsRoundConfirmed(v));
      } else {
        setIsRoundConfirmed(false);
      }
    }, [selectedPlayer, selectedRound, playerFines]);

    // Load round fines data for the round view tab
    useEffect(() => {
      if (selectedRound) {
        DB.getRoundFines(selectedRound).then(data => setRoundFinesData(data));
      }
    }, [selectedRound, scores]);

    // Load payment summary for the payment tab
    useEffect(() => {
      DB.getPaymentSummary().then(data => setPaymentSummaryData(data));
    }, [scores]);

    const handleRoundChange = (roundId) => {
      setSelectedRound(roundId);
      localStorage.setItem('gpga_selected_round', roundId.toString());
    };

    const handlePlayerChange = (playerId) => {
      setSelectedPlayer(playerId);
      localStorage.setItem('gpga_selected_player', playerId);
    };

    const handleAddFine = async (fineTypeId) => {
      if (!selectedPlayer || !selectedRound) return;
      await DB.addPlayerFine(selectedPlayer, selectedRound, fineTypeId);

      // Only update local player fines - smooth UX, no jumping
      const updatedFines = await DB.getPlayerFinesForRound(selectedPlayer, selectedRound);
      setPlayerFines(updatedFines);
    };

    const handleRemoveFine = async (fineTypeId) => {
      if (!selectedPlayer || !selectedRound) return;
      await DB.removePlayerFine(selectedPlayer, selectedRound, fineTypeId);

      // Only update local player fines - smooth UX, no jumping
      const updatedFines = await DB.getPlayerFinesForRound(selectedPlayer, selectedRound);
      setPlayerFines(updatedFines);
    };

    const totalFines = playerFines.reduce((sum, fine) => sum + (fine.amount * fine.quantity), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Fines Management</h2>
            <p className="text-slate-500">Track and manage fines for {activeSeason?.year}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          {/* Admin/Master Only Tabs */}
          {(currentUser.role === 'master' || currentUser.role === 'admin') && (
            <>
              <button
                onClick={() => setFinesTab('assign')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  finesTab === 'assign'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Assign Fines
              </button>
              <button
                onClick={() => setFinesTab('types')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  finesTab === 'types'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Fine Sheet
              </button>
            </>
          )}

          {/* Tabs visible to all roles */}
          <button
            onClick={() => setFinesTab('leaderboard')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              finesTab === 'leaderboard'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setFinesTab('roundview')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              finesTab === 'roundview'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Round View
          </button>
          <button
            onClick={() => setFinesTab('payments')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              finesTab === 'payments'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payments
          </button>
        </div>

        {/* Tab Content */}

        {/* Admin/Master Only Tabs */}
        {(currentUser.role === 'master' || currentUser.role === 'admin') && (
          <>
            {/* Assign Fines Tab */}
            {finesTab === 'assign' && (
              <Card>
                <div className="p-4 border-b border-slate-100 bg-blue-50">
                  <h3 className="font-semibold text-blue-800">Assign Fines</h3>
                  <p className="text-xs text-blue-600 mt-1">Add or remove fines for players</p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Round Display and Player Selector - Single Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Round Display - Auto-selected to most recent */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Round</label>
                      {mostRecentRound ? (
                        <div className="w-full bg-emerald-50 text-emerald-800 border-2 border-emerald-200 rounded-lg px-4 py-3 font-semibold">
                          {mostRecentRound.name} - {mostRecentRound.course}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-3">
                          No rounds created yet
                        </div>
                      )}
                    </div>

                    {/* Player Selector */}
                    <div>
                      <label htmlFor="fines-select-player" className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Player</label>
                      <select
                        id="fines-select-player"
                        name="fines-select-player"
                        value={selectedPlayer || ''}
                        onChange={(e) => handlePlayerChange(e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-no-repeat bg-right"
                        style={{backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.75rem center", backgroundSize: "1.5em 1.5em"}}
                      >
                        <option value="">-- Select Player --</option>
                        {players.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fine Assignment */}
                  {selectedPlayer && selectedRound ? (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-slate-700">
                          Fines for {players.find(p => p.id === selectedPlayer)?.name}
                        </h4>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-bold text-red-600 text-lg">R{totalFines}</p>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto" style={{scrollBehavior: 'auto'}}>
                        {fineTypes.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">No fines on the fine sheet. Create the fine sheet first.</p>
                        ) : (
                          fineTypes.map(ft => {
                            const playerFine = playerFines.find(pf => pf.fine_type_id === ft.id);
                            const quantity = playerFine?.quantity || 0;

                            return (
                              <div key={ft.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-700">{ft.name}</p>
                                  <p className="text-xs text-slate-500">R{ft.amount} each</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFine(ft.id)}
                                    disabled={quantity === 0}
                                    className="w-8 h-8 flex items-center justify-center rounded-md bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-bold text-slate-800">{quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddFine(ft.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                                  >
                                    +
                                  </button>
                                  <span className="w-16 text-right font-semibold text-slate-600">
                                    R{quantity * ft.amount}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Finish Button - Below fines list */}
                      {(() => {
                        return (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <button
                              onClick={async () => {
                                await DB.confirmPlayerRoundFines(selectedPlayer, selectedRound, !isRoundConfirmed);
                                setIsRoundConfirmed(!isRoundConfirmed);
                                showToast(
                                  isRoundConfirmed
                                    ? 'Fines reopened for editing'
                                    : 'Fines confirmed!',
                                  isRoundConfirmed ? 'info' : 'success'
                                );
                              }}
                              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                isRoundConfirmed
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isRoundConfirmed ? 'Reopen' : 'Finish'}
                            </button>
                            {isRoundConfirmed && (
                              <span className="ml-3 text-xs text-amber-600">
                                ✓ Confirmed
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-sm text-slate-400 text-center py-8">Select a round and player to assign fines</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Fine Sheet Tab */}
            {finesTab === 'types' && (
              <Card>
                <div className="p-4 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-emerald-800">Fine Sheet</h3>
                    <p className="text-xs text-emerald-600 mt-1">Manage season fine sheet for {activeSeason?.year} - All players are subject to these fines</p>
                  </div>
                  <button
                    onClick={() => setIsAddFineTypeModalOpen(true)}
                    className="bg-emerald-600 text-white px-3 py-1 rounded-md flex items-center gap-2 hover:bg-emerald-700 text-sm"
                  >
                    <Plus size={14} /> Add Fine
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {fineTypes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p>No fines on the sheet yet.</p>
                      <p className="text-xs mt-2">Click "Add Fine" to add fines to the season sheet.</p>
                    </div>
                  ) : (
                    fineTypes.map(ft => (
                      <div key={ft.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{ft.name}</p>
                          {ft.description && <p className="text-xs text-slate-500">{ft.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-600">R{ft.amount}</span>
                          <button
                            onClick={() => handleDeleteFineType(ft.id, ft.name)}
                            className="p-1 hover:bg-red-50 rounded transition-colors text-slate-400 hover:text-red-600"
                            title="Delete Fine"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Shared Tabs - Visible to All Roles */}

        {/* Leaderboard Tab */}
        {finesTab === 'leaderboard' && (
              <Card>
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">Fines Leaderboard</h3>
                  <p className="text-xs text-slate-500 mt-1">Total outstanding per player</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {sortedByFines.map((player, idx) => (
                    <div key={player.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden
                          ${idx === 0 ? 'bg-red-100 text-red-700' :
                            idx === 1 ? 'bg-orange-100 text-orange-700' :
                            idx === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" alt="" /> : idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{player.name}</p>
                          <p className="text-xs text-slate-500">{player.roundsPlayed} rounds played</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">R {player.totalFines.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Round View Tab - Aggregated fines per player per round */}
            {finesTab === 'roundview' && (
              <Card>
                <div className="p-4 border-b border-slate-100 bg-purple-50">
                  <h3 className="font-semibold text-purple-800">Round-Based Fines View</h3>
                  <p className="text-xs text-purple-600 mt-1">View historical fines summary by round</p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Filters - Round and Player */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fines-select-round" className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Round</label>
                      <select
                        id="fines-select-round"
                        name="fines-select-round"
                        value={selectedRound || ''}
                        onChange={(e) => handleRoundChange(parseInt(e.target.value))}
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                        style={{backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.75rem center", backgroundSize: "1.25em 1.25em", backgroundRepeat: "no-repeat"}}
                      >
                        <option value="">-- Select Round --</option>
                        {rounds.map(r => (
                          <option key={r.id} value={r.id}>{r.name} - {r.course} ({r.date})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="fines-filter-player" className="block text-xs font-bold text-slate-500 uppercase mb-2">Filter by Player</label>
                      <select
                        id="fines-filter-player"
                        name="fines-filter-player"
                        value={roundViewPlayerFilter}
                        onChange={(e) => setRoundViewPlayerFilter(e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                        style={{backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.75rem center", backgroundSize: "1.25em 1.25em", backgroundRepeat: "no-repeat"}}
                      >
                        <option value="all">All Players</option>
                        {players.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Display aggregated fines for the selected round */}
                  {selectedRound ? (
                    <div className="space-y-3">
                      {(() => {
                        const roundFines = roundFinesData;

                        if (roundFines.length === 0) {
                          return (
                            <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                              No fines recorded for this round
                            </div>
                          );
                        }

                        // Aggregate fines by player
                        const playerSummary = {};
                        const playerFineDetails = {};

                        roundFines.forEach(fine => {
                          if (!playerSummary[fine.player_id]) {
                            playerSummary[fine.player_id] = {
                              player_id: fine.player_id,
                              player_name: fine.player_name,
                              total_fines: 0,
                              total_amount: 0
                            };
                            playerFineDetails[fine.player_id] = [];
                          }
                          playerSummary[fine.player_id].total_fines += fine.quantity;
                          playerSummary[fine.player_id].total_amount += (fine.quantity * fine.amount);
                          playerFineDetails[fine.player_id].push({
                            name: fine.name,
                            quantity: fine.quantity,
                            amount: fine.amount,
                            total: fine.quantity * fine.amount
                          });
                        });

                        // Convert to array and filter by selected player
                        let summaryArray = Object.values(playerSummary);
                        if (roundViewPlayerFilter !== 'all') {
                          summaryArray = summaryArray.filter(s => s.player_id === roundViewPlayerFilter);
                        }

                        if (summaryArray.length === 0) {
                          return (
                            <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                              No fines for selected player in this round
                            </div>
                          );
                        }

                        // Sort by amount descending
                        summaryArray.sort((a, b) => b.total_amount - a.total_amount);

                        return summaryArray.map((summary, idx) => {
                          const isExpanded = expandedRoundViewPlayers[summary.player_id] || false;
                          const fineDetails = playerFineDetails[summary.player_id];

                          return (
                            <div key={summary.player_id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              {/* Player Summary Header - Clickable */}
                              <div
                                className="p-4 bg-white cursor-pointer select-none hover:bg-slate-50"
                                onClick={() => {
                                  setExpandedRoundViewPlayers(prev => ({
                                    ...prev,
                                    [summary.player_id]: !isExpanded
                                  }));
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <ChevronDown
                                      size={20}
                                      className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      idx === 0 ? 'bg-red-100 text-red-700' :
                                      idx === 1 ? 'bg-orange-100 text-orange-700' :
                                      idx === 2 ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-800 truncate">{summary.player_name}</p>
                                      <p className="text-xs text-slate-500">{summary.total_fines} fines</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <p className="font-bold text-red-600">R{summary.total_amount.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Fine Details */}
                              {isExpanded && (
                                <div className="bg-slate-50 border-t border-slate-200">
                                  <div className="p-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Fine Breakdown</p>
                                    {fineDetails.map((fine, fineIdx) => (
                                      <div
                                        key={fineIdx}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-slate-700">{fine.name}</p>
                                          <p className="text-xs text-slate-500">Qty: {fine.quantity} × R{fine.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right ml-2">
                                          <p className="text-sm font-bold text-red-600">R{fine.total.toLocaleString()}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                      Select a round to view fines summary
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Payment History Tab - Round by Round with Accordion */}
            {finesTab === 'payments' && (
              <Card>
                <div className="p-4 border-b border-slate-100 bg-blue-50">
                  <h3 className="font-semibold text-blue-800">Payment Tracking</h3>
                  <p className="text-xs text-blue-600 mt-1">Mark rounds as paid when players settle their fines. Click player name to expand.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {(() => {
                    const paymentSummary = paymentSummaryData;
                    if (paymentSummary.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400">
                          No payment data available
                        </div>
                      );
                    }
                    return paymentSummary.map((summary, idx) => {
                      const playerRounds = playerRoundFinesCache[summary.player_id] || [];
                      const isExpanded = expandedPlayers[summary.player_id] || false;

                      return (
                        <div key={summary.player_id} className="hover:bg-slate-50">
                          {/* Player Header - Clickable to expand/collapse */}
                          <div
                            className="p-4 cursor-pointer select-none"
                            onClick={async () => {
                              if (!isExpanded && !playerRoundFinesCache[summary.player_id]) {
                                const rounds = await DB.getPlayerRoundFines(summary.player_id);
                                setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: rounds }));
                              }
                              setExpandedPlayers(prev => ({
                                ...prev,
                                [summary.player_id]: !isExpanded
                              }));
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <ChevronDown
                                  size={20}
                                  className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                  summary.payment_percentage === 100 ? 'bg-emerald-100 text-emerald-700' :
                                  summary.payment_percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{summary.player_name}</p>
                                  <p className="text-xs text-slate-500">
                                    {playerRounds.length} rounds • {summary.payment_percentage}% paid
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-600">Paid:</span>
                                  <span className="text-sm font-bold text-emerald-600">R{summary.paid_fines.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-600">Outstanding:</span>
                                  <span className="text-sm font-bold text-red-600">R{summary.unpaid_fines.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Dual Progress Bar */}
                            <div className="ml-9">
                              <div className="w-full bg-slate-200 rounded-full h-5 overflow-hidden flex">
                                {summary.paid_fines > 0 && (
                                  <div
                                    className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                                    style={{width: `${summary.payment_percentage}%`}}
                                  >
                                    {summary.payment_percentage >= 15 && `${summary.payment_percentage}%`}
                                  </div>
                                )}
                                {summary.unpaid_fines > 0 && (
                                  <div
                                    className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                                    style={{width: `${100 - summary.payment_percentage}%`}}
                                  >
                                    {(100 - summary.payment_percentage) >= 15 && `${100 - summary.payment_percentage}%`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Round Breakdown - Collapsible */}
                          {isExpanded && playerRounds.length > 0 && (
                            <div className="px-4 pb-4 space-y-2 bg-slate-50/50">
                              <div className="ml-9 space-y-2">
                                {playerRounds.map(round => (
                                  <div
                                    key={round.round_id}
                                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-3 h-3 rounded-full ${round.paid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-700">{round.round_name}</p>
                                        <p className="text-xs text-slate-500">{round.round_date}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-slate-800">R{round.total_amount.toLocaleString()}</span>
                                      {(currentUser.role === 'master' || currentUser.role === 'admin') ? (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await DB.markRoundFinesPaid(summary.player_id, round.round_id, !round.paid);
                                            const updated = await DB.getPlayerRoundFines(summary.player_id);
                                            setPlayerRoundFinesCache(prev => ({ ...prev, [summary.player_id]: updated }));
                                            showToast(
                                              `${round.round_name} marked as ${!round.paid ? 'paid' : 'unpaid'} for ${summary.player_name}`,
                                              !round.paid ? 'success' : 'info'
                                            );
                                          }}
                                          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            round.paid
                                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                              : 'bg-red-600 text-white hover:bg-red-700'
                                          }`}
                                        >
                                          {round.paid ? '✓ Paid' : 'Mark Paid'}
                                        </button>
                                      ) : (
                                        <span
                                          className={`px-4 py-2 rounded-lg text-xs font-medium ${
                                            round.paid
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : 'bg-red-100 text-red-700'
                                          }`}
                                        >
                                          {round.paid ? '✓ Paid' : '✗ Unpaid'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            )}
      </div>
    );
  };

  // Unified Rounds Management View (combines Create Round + Score Entry)
  const RoundsManagementView = () => {
    const [selectedRound, setSelectedRound] = useState(rounds[0]?.id);
    const [editScores, setEditScores] = useState({});
    const [editingPlayers, setEditingPlayers] = useState({});

    useEffect(() => {
        setEditScores({});
        setEditingPlayers({});
    }, [selectedRound]);

    const handleScoreChange = (pid, field, val) => {
      setEditScores(prev => {
        const currentPlayerScore = prev[pid] || {};
        return {
          ...prev,
          [pid]: {
            ...currentPlayerScore,
            [field]: val === '' ? '' : parseInt(val)
          }
        };
      });
    };

    const savePlayerScore = async (playerId, playerName) => {
      const scoreData = editScores[playerId];
      if (!scoreData) {
        showToast('No changes to save', 'error');
        return;
      }

      const currentScore = scores[playerId]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };

      // Merge edited fields with existing data and ensure they're valid numbers
      const strokes = scoreData.strokes !== undefined ? Number(scoreData.strokes) || 0 : Number(currentScore.strokes) || 0;
      const handicap = scoreData.handicap !== undefined ? Number(scoreData.handicap) || 0 : Number(currentScore.handicap) || 0;
      const stableford = scoreData.stableford !== undefined ? Number(scoreData.stableford) || 0 : Number(currentScore.stableford) || 0;

      await DB.updateScore(playerId, selectedRound, strokes, handicap, stableford);

      setScores(prev => {
        const updated = { ...prev };
        if (!updated[playerId]) updated[playerId] = {};
        updated[playerId] = { ...updated[playerId], [selectedRound]: { strokes, handicap, stableford } };
        return updated;
      });

      // Remove from edit state
      setEditScores(prev => {
        const newState = { ...prev };
        delete newState[playerId];
        return newState;
      });

      // Remove from editing state
      setEditingPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));

      showToast(`Saved scores for ${playerName}!`);
    };

    const toggleEditPlayer = (playerId) => {
      setEditingPlayers(prev => ({
        ...prev,
        [playerId]: !prev[playerId]
      }));
    };

    const editAllPlayers = () => {
      const allPlayerIds = players.filter(p => p.status === 'active').reduce((acc, p) => {
        acc[p.id] = true;
        return acc;
      }, {});
      setEditingPlayers(allPlayerIds);
    };

    const saveAllPlayers = async () => {
      let savedCount = 0;
      const activePlayers = players.filter(p => p.status === 'active');

      for (const player of activePlayers) {
        if (editingPlayers[player.id]) {
          const scoreData = editScores[player.id];
          const currentScore = scores[player.id]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };

          const strokes = scoreData?.strokes !== undefined ? Number(scoreData.strokes) || 0 : Number(currentScore.strokes) || 0;
          const handicap = scoreData?.handicap !== undefined ? Number(scoreData.handicap) || 0 : Number(currentScore.handicap) || 0;
          const stableford = scoreData?.stableford !== undefined ? Number(scoreData.stableford) || 0 : Number(currentScore.stableford) || 0;

          await DB.updateScore(player.id, selectedRound, strokes, handicap, stableford);
          savedCount++;
        }
      }

      setScores(prev => {
        const updated = { ...prev };
        for (const [pid, vals] of Object.entries(editScores)) {
          if (!updated[pid]) updated[pid] = {};
          const s = Number(vals.strokes) || 0;
          const h = Number(vals.handicap) || 0;
          const sf = Number(vals.stableford) || 0;
          if (s > 0) updated[pid] = { ...updated[pid], [selectedRound]: { strokes: s, handicap: h, stableford: sf } };
        }
        return updated;
      });
      setEditScores({});
      setEditingPlayers({});
      showToast(`Saved scores for ${savedCount} player${savedCount !== 1 ? 's' : ''}!`);
    };

    const isAnyPlayerEditing = Object.values(editingPlayers).some(v => v);

    const handleCreateRound = async (e) => {
      e.preventDefault();

      if (!selectedCourse) {
        showToast('Please select a golf course', 'error');
        return;
      }

      if (!activeSeason) {
        showToast('No active season found', 'error');
        return;
      }

      const formData = new FormData(e.target);
      const newRound = {
        name: formData.get('name'),
        date: formData.get('date'),
        courseId: selectedCourse.id,
        courseName: selectedCourse.name
      };

      const result = await DB.addRound(newRound, activeSeason.id);
      setRounds(prev => [...prev, { id: result.id, season_id: activeSeason.id, name: newRound.name, date: newRound.date, course_id: newRound.courseId, course_name: newRound.courseName }]);
      showToast(`Round created successfully at ${selectedCourse.name}!`);
      setShowCreateForm(false);
      setRoundName('');
      setRoundDate('');
      setSelectedCourse(null);
      setSearchTerm('');
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Rounds Management</h2>
            <p className="text-base-content/60 mt-1">Create rounds, select courses, and manage player scores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="space-y-4">
             <div className="card bg-base-100 shadow-xl">
               <div className="card-body">
                 <h3 className="card-title text-lg mb-3">Manage Rounds</h3>
                 <div className="space-y-2">
                   {rounds.map(r => (
                     <div key={r.id} className="flex items-start gap-2">
                       <button
                        onClick={() => setSelectedRound(r.id)}
                        className={`flex-1 text-left px-4 py-3 rounded-lg text-sm transition-all ${
                          selectedRound === r.id
                            ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-md'
                            : 'bg-base-200 hover:bg-base-300 border-2 border-transparent'
                        }`}
                       >
                         <div className="font-semibold">{r.name}</div>
                         <div className={`text-xs mt-1 flex items-center gap-2 ${selectedRound === r.id ? 'opacity-90' : 'opacity-60'}`}>
                           <span>{r.date}</span>
                           {r.course && (
                             <>
                               <span>•</span>
                               <span>{r.course}</span>
                             </>
                           )}
                         </div>
                       </button>
                       <div className="flex flex-col gap-1">
                         <button
                           onClick={() => handleEditRound(r)}
                           className="btn btn-ghost btn-xs btn-square"
                           title="Edit Round"
                         >
                           <Edit size={14} />
                         </button>
                         <button
                           onClick={() => handleDeleteRound(r.id, r.name)}
                           className="btn btn-ghost btn-xs btn-square text-error hover:bg-error hover:text-error-content"
                           title="Delete Round"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                     </div>
                   ))}
                   <button
                     onClick={() => setIsAddRoundModalOpen(true)}
                     className="w-full mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
                   >
                     <Plus size={18} /> Add Round
                   </button>
                 </div>
               </div>
             </div>
          </div>

          {/* Data Entry */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Enter Scores</h3>
                  <p className="text-sm text-slate-500">Editing: {rounds.find(r => r.id === selectedRound)?.name}</p>
                </div>
                <div>
                  {!isAnyPlayerEditing ? (
                    <button
                      onClick={editAllPlayers}
                      className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit All
                    </button>
                  ) : (
                    <button
                      onClick={saveAllPlayers}
                      className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <Save size={16} />
                      Save All
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 overflow-x-auto">
                 <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-3 text-xs font-bold text-slate-500 uppercase px-2 min-w-[700px]">
                   <div>Player</div>
                   <div className="text-center">Medal Score</div>
                   <div className="text-center">Handicap</div>
                   <div className="text-center">Stableford</div>
                   <div className="text-center">Actions</div>
                 </div>

                 {players.filter(p => p.status === 'active').map(p => {
                    const currentScore = scores[p.id]?.[selectedRound] || { strokes: 0, handicap: 0, stableford: 0 };
                    const isEditing = editingPlayers[p.id];
                    const isEdited = editScores[p.id] !== undefined;

                    // Show empty string for 0 values when editing, otherwise show actual value
                    const getDisplayValue = (field, currentValue) => {
                      if (editScores[p.id]?.[field] !== undefined) {
                        return editScores[p.id][field] === '' ? '' : editScores[p.id][field];
                      }
                      return isEditing && currentValue === 0 ? '' : currentValue;
                    };

                    const displayStrokes = getDisplayValue('strokes', currentScore.strokes);
                    const displayHandicap = getDisplayValue('handicap', currentScore.handicap);
                    const displayStableford = getDisplayValue('stableford', currentScore.stableford);

                    return (
                      <div key={p.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-3 items-center p-2 rounded-md border transition-all min-w-[700px] ${isEdited ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="font-medium text-slate-700">{p.name}</div>
                        <div>
                          <input
                            type="number"
                            min="40"
                            max="150"
                            value={displayStrokes}
                            onChange={(e) => handleScoreChange(p.id, 'strokes', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center border-2 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none ${isEditing ? 'border-emerald-500 bg-white' : 'border-slate-400 bg-slate-100'}`}
                            placeholder="72"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="36"
                            value={displayHandicap}
                            onChange={(e) => handleScoreChange(p.id, 'handicap', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center border-2 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none ${isEditing ? 'border-emerald-500 bg-white' : 'border-slate-400 bg-slate-100'}`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={displayStableford}
                            onChange={(e) => handleScoreChange(p.id, 'stableford', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full text-center border-2 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none ${isEditing ? 'border-emerald-500 bg-white' : 'border-slate-400 bg-slate-100'}`}
                            placeholder="36"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {!isEditing ? (
                            <button
                              onClick={() => toggleEditPlayer(p.id)}
                              className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => savePlayerScore(p.id, p.name)}
                              className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Save size={12} />
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    );
                 })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const ProfileView = () => {
    const myStats = leaderboardData.find(p => p.id === currentUser.id);
    const [fineTypes, setFineTypes] = useState([]);
    const [expandedRounds, setExpandedRounds] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [profileBuyInStatus, setProfileBuyInStatus] = useState({ isPaid: false });
    const [profileRoundFines, setProfileRoundFines] = useState({});
    const [profileRoundConfirmed, setProfileRoundConfirmed] = useState({});

    useEffect(() => {
      const loadProfileData = async () => {
        if (activeSeason) {
          const types = await DB.getFineTypes(activeSeason.id);
          setFineTypes(types);
        }
        if (currentUser?.id) {
          const buyIn = await DB.getPlayerBuyInStatus(currentUser.id, activeSeason?.id);
          setProfileBuyInStatus(buyIn);
          const summary = await DB.getPlayerFinesSummary(currentUser.id, activeSeason?.id);
          setProfileFinesSummary(summary);
          // Load fines and confirmed status for each round
          const finesMap = {};
          const confirmedMap = {};
          for (const round of rounds) {
            const playerFines = await DB.getPlayerFinesForRound(currentUser.id, round.id);
            finesMap[round.id] = playerFines;
            confirmedMap[round.id] = playerFines.length > 0 && await DB.isPlayerRoundConfirmed(currentUser.id, round.id);
          }
          setProfileRoundFines(finesMap);
          setProfileRoundConfirmed(confirmedMap);
        }
      };
      loadProfileData();
    }, [activeSeason, currentUser?.id, rounds]);

    const [profileFinesSummary, setProfileFinesSummary] = useState({ total_fines: 0, paid_fines: 0, outstanding_fines: 0 });

    const toggleRound = (roundId) => {
      setExpandedRounds(prev => ({
        ...prev,
        [roundId]: !prev[roundId]
      }));
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Page Header with Season Info */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your account and view your performance</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">Active Season</p>
            <p className="text-lg font-bold text-emerald-700">{activeSeason?.name || activeSeason?.year}</p>
          </div>
        </div>

        <form onSubmit={(e) => handleUpdateProfile(e, setIsEditing)}>
          <Card>
            <div className="p-8">
              {/* Personal Details Section */}
              <div className="flex flex-col md:flex-row gap-8 pb-8 border-b border-slate-200">
                {/* Avatar */}
                <div className="relative group flex-shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-200 flex items-center justify-center">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-400" />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors">
                      <Camera size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  )}
                </div>

                {/* Personal Info */}
                <div className="flex-1 space-y-4">
                  {!isEditing ? (
                    <>
                      {/* View Mode - Show as text */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <p className="text-lg font-semibold text-slate-800">{currentUser.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <p className="text-lg text-slate-700">{currentUser.email}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buy-In</label>
                        <div className="flex items-center gap-2">
                          <p className={`text-lg font-semibold ${profileBuyInStatus.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {profileBuyInStatus.isPaid ? 'Paid' : 'Outstanding'}
                          </p>
                          {profileBuyInStatus.isPaid ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Edit Mode - Show as input fields */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input
                          name="name"
                          defaultValue={currentUser.name}
                          required
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="e.g., John Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          defaultValue={currentUser.email}
                          required
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          New Password <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          name="password"
                          type="password"
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="Leave blank to keep current password"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Edit Button */}
                <div className="flex-shrink-0">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Edit size={16} />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Save size={16} />
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Season Summary */}
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Season Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wide leading-none">Total Medal</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{myStats?.totalStrokes || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wide leading-none">Total Stableford</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{myStats?.totalStableford || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wide leading-none">Last Round</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                      {(() => {
                        const lastRound = rounds[rounds.length - 1];
                        return lastRound && scores[currentUser.id]?.[lastRound.id]?.strokes || '-';
                      })()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wide leading-none">Total Fines</p>
                    <p className="text-xl font-bold text-red-700 mt-1">R{myStats?.totalFines.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </form>

        {/* Payment Summary */}
        <Card className="overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Payment Summary</h3>
                <p className="text-sm text-slate-600 mt-1">{activeSeason?.year} Season</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CreditCard size={24} className="text-white" />
              </div>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const summary = profileFinesSummary;
              const paymentPercentage = summary.total_fines > 0
                ? Math.round((summary.paid_fines / summary.total_fines) * 100)
                : 100;

              return (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle size={20} className="text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide">Paid</p>
                          <p className="text-2xl font-bold text-emerald-800">R{summary.paid_fines.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${paymentPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-5 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <AlertCircle size={20} className="text-red-700" />
                        </div>
                        <div>
                          <p className="text-xs text-red-700 font-bold uppercase tracking-wide">Outstanding</p>
                          <p className="text-2xl font-bold text-red-800">R{summary.outstanding_fines.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${100 - paymentPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Progress Indicator */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Payment Progress</span>
                      <span className="text-2xl font-bold text-slate-800">{paymentPercentage}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${paymentPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {paymentPercentage === 100 ? '🎉 All fines paid!' : `R${summary.outstanding_fines.toLocaleString()} remaining`}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Fines Breakdown Per Round */}
        <Card className="overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Fines Breakdown</h3>
                <p className="text-sm text-slate-600 mt-1">Detailed view per round</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <Banknote size={24} className="text-white" />
              </div>
            </div>
          </div>
          <div className="p-6">
            {rounds.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No rounds available yet</p>
            ) : (
              <div className="space-y-4">
                {rounds.map(round => {
                  const playerFines = profileRoundFines[round.id] || [];
                  const roundTotal = playerFines.reduce((sum, fine) => sum + (fine.amount * fine.quantity), 0);
                  const roundScore = scores[currentUser.id]?.[round.id]?.strokes || 0;
                  const isExpanded = expandedRounds[round.id];
                  const isConfirmed = profileRoundConfirmed[round.id] || false;
                  const isPaid = playerFines.length > 0 && playerFines.every(f => f.paid === 1);

                  // Only show rounds with fines that are confirmed
                  if (playerFines.length === 0 || !isConfirmed) {
                    return null;
                  }

                  return (
                    <div key={round.id} className="group border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all">
                      <button
                        onClick={() => toggleRound(round.id)}
                        className="w-full bg-gradient-to-r from-slate-50 to-white p-4 hover:from-emerald-50/30 hover:to-white transition-all cursor-pointer"
                      >
                        <div className="flex flex-col gap-3">
                          {/* Row 1: Round Info */}
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              isExpanded
                                ? 'bg-emerald-500 shadow-md'
                                : 'bg-slate-200 group-hover:bg-emerald-100'
                            }`}>
                              <ChevronDown
                                size={20}
                                className={`transition-all duration-300 flex-shrink-0 ${
                                  isExpanded ? 'rotate-180 text-white' : 'text-slate-600 group-hover:text-emerald-700'
                                }`}
                              />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{round.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                                <p className="text-xs text-slate-500 truncate">{round.course}</p>
                                <span className="text-slate-300">•</span>
                                <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                                <p className="text-xs text-slate-500">{round.date}</p>
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Scores and Fines */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Score Data */}
                            {scores[currentUser.id]?.[round.id] && (
                              <>
                                <div className="bg-blue-50 px-3 py-2.5 rounded-lg border border-blue-100 h-[60px] flex flex-col justify-center items-center">
                                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide leading-none">Medal</p>
                                  <p className="text-lg font-bold text-blue-700 leading-none mt-1">{scores[currentUser.id][round.id].strokes}</p>
                                </div>
                                <div className="bg-emerald-50 px-3 py-2.5 rounded-lg border border-emerald-100 h-[60px] flex flex-col justify-center items-center">
                                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide leading-none">Stableford</p>
                                  <p className="text-lg font-bold text-emerald-700 leading-none mt-1">{scores[currentUser.id][round.id].stableford}</p>
                                </div>
                              </>
                            )}
                            {/* Fines Amount with Payment Status */}
                            <div className={`px-3 py-2.5 rounded-lg border transition-all h-[60px] flex flex-col justify-center items-center ${
                              isPaid
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <p className={`text-xs font-semibold uppercase tracking-wide leading-none ${
                                isPaid ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                Total Fines
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <p className={`text-lg font-bold leading-none ${
                                  isPaid ? 'text-emerald-700' : 'text-red-700'
                                }`}>
                                  R{roundTotal.toLocaleString()}
                                </p>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isPaid
                                    ? 'bg-emerald-500 border border-emerald-600'
                                    : 'bg-red-500 border border-red-600'
                                }`}>
                                  {isPaid ? (
                                    <span className="text-white text-[10px] font-bold">✓</span>
                                  ) : (
                                    <span className="text-white text-[10px] font-bold">!</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-gradient-to-b from-white to-slate-50/50 border-t border-slate-200 animate-in slide-in-from-top duration-200">
                          {playerFines.length > 0 ? (
                            <div className="p-5">
                              <div className="space-y-3 mb-4">
                                {playerFines.map((fine, idx) => {
                                  const fineType = fineTypes.find(ft => ft.id === fine.fine_type_id);
                                  return (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100 hover:border-red-200 hover:shadow-sm transition-all">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                          <span className="text-red-700 font-bold text-xs">{fine.quantity}</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">
                                          {fineType?.name || 'Unknown Fine'}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-red-700">
                                          R{(fine.amount * fine.quantity).toLocaleString()}
                                        </p>
                                        {fine.quantity > 1 && (
                                          <p className="text-xs text-slate-500">R{fine.amount} each</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-4 rounded-b-xl">
                                <span className="font-bold text-slate-800 text-base">Round Total</span>
                                <span className="font-bold text-red-700 text-xl">R{roundTotal.toLocaleString()}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle size={32} className="text-slate-400" />
                              </div>
                              <p className="text-sm text-slate-500 font-medium">No fines for this round</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const CreateRoundView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [golfCourses, setGolfCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [roundName, setRoundName] = useState('');
    const [roundDate, setRoundDate] = useState('');

    useEffect(() => {
      // Load all golf courses
      const loadCourses = async () => {
        const courses = await DB.getAllGolfCourses();
        setGolfCourses(courses);
      };
      loadCourses();
    }, []);

    const filteredCourses = searchTerm
      ? golfCourses.filter(course =>
          course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.location.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : golfCourses;

    const handleCreateRound = async (e) => {
      e.preventDefault();

      if (!selectedCourse) {
        showToast('Please select a golf course', 'error');
        return;
      }

      if (!activeSeason) {
        showToast('No active season found', 'error');
        return;
      }

      const newRound = {
        name: roundName,
        date: roundDate,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name
      };

      const result = await DB.addRound(newRound, activeSeason.id);
      setRounds(prev => [...prev, { id: result.id, season_id: activeSeason.id, name: newRound.name, date: newRound.date, course_id: newRound.courseId, course_name: newRound.courseName }]);
      showToast(`Round created successfully at ${selectedCourse.name}!`);
      setView('admin');
      localStorage.setItem('gpga_current_view', 'admin');
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Create New Round</h2>
            <p className="text-slate-500">Set up a new round for {activeSeason?.year}</p>
          </div>
          <button
            onClick={() => {
              setView('admin');
              localStorage.setItem('gpga_current_view', 'admin');
            }}
            className="text-slate-600 hover:text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleCreateRound}>
          <Card className="p-6">
            <div className="space-y-6">
              {/* Round Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Round Name</label>
                  <input
                    type="text"
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    required
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., Round 7"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    <Calendar size={14} className="inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={roundDate}
                    onChange={(e) => setRoundDate(e.target.value)}
                    required
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Golf Course Search */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  <Search size={14} className="inline mr-1" />
                  Search Golf Course
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Search by name or location..."
                />
              </div>

              {/* Selected Course Display */}
              {selectedCourse && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-emerald-800">{selectedCourse.name}</p>
                      <p className="text-sm text-emerald-600 flex items-center gap-1 mt-1">
                        <MapPin size={14} />
                        {selectedCourse.location} • Par {selectedCourse.par}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(null)}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Golf Courses List */}
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredCourses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p>No golf courses found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedCourse(course)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          selectedCourse?.id === course.id ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-slate-800">{course.name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin size={12} />
                              {course.location} • Par {course.par}
                            </p>
                          </div>
                          {selectedCourse?.id === course.id && (
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setView('admin');
                    localStorage.setItem('gpga_current_view', 'admin');
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} />
                  Create Round
                </button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (!activeSeason) {
      showToast('No active season found. Please create a season first.', 'error');
      return;
    }

    const roundName = formData.get('name');
    const roundDate = formData.get('date');

    if (!roundName || !roundDate || !selectedCourse) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const newRound = {
      name: roundName,
      date: roundDate,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name
    };

    const result = await DB.addRound(newRound, activeSeason.id);
    setRounds(prev => [...prev, { id: result.id, season_id: activeSeason.id, name: newRound.name, date: newRound.date, course_id: newRound.courseId, course_name: newRound.courseName }]);
    setIsAddRoundModalOpen(false);
    setSelectedCourse(null);
    setSearchTerm('');
    setSelectedDate('');
    showToast(`Round "${newRound.name}" created successfully!`);
  };

  const handleEditPlayer = (player) => {
    setManagingPlayerId(player.id);
  };

  const handleUpdatePlayerSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const updates = {
      name: formData.get('name'),
      email: formData.get('email'),
      status: formData.get('status')
    };

    // Include password if provided
    const newPassword = formData.get('password');
    if (newPassword && newPassword.trim() !== '') {
      updates.password = newPassword;
    }

    // Only master can update roles
    if (currentUser.role === 'master') {
      const newRole = formData.get('role');
      // Prevent changing the master's role
      if (editingPlayer.role !== 'master') {
        updates.role = newRole;
      }
    }

    await DB.updatePlayer(editingPlayer.id, updates);

    setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? { ...p, ...updates } : p));
    setIsEditPlayerModalOpen(false);
    showToast(`Player ${formData.get('name')} updated successfully!`);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (id, name) => {
    showConfirm(
      `Remove ${name}?`,
      `This will permanently remove ${name} and all their scores, fines, and history. This action cannot be undone.`,
      async () => {
        await DB.deletePlayer(id);
        setPlayers(prev => prev.filter(p => p.id !== id));
        showToast(`Player ${name} deleted successfully!`, 'success');
      },
      'danger'
    );
  };

  const handleEditRound = (round) => {
    setEditingRound(round);
    // Find and set the selected course
    const course = golfCourses.find(c => c.id === round.course_id);
    if (course) {
      setSelectedCourse(course);
    }
    setIsEditRoundModalOpen(true);
  };

  const handleUpdateRoundSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const roundUpdates = {
      name: formData.get('name'),
      date: formData.get('date'),
      courseId: selectedCourse?.id,
      courseName: selectedCourse?.name
    };
    await DB.updateRound(editingRound.id, roundUpdates);

    setRounds(prev => prev.map(r => r.id === editingRound.id ? { ...r, name: roundUpdates.name || r.name, date: roundUpdates.date || r.date, course_id: roundUpdates.courseId || r.course_id, course_name: roundUpdates.courseName || r.course_name } : r));
    setIsEditRoundModalOpen(false);
    setSelectedCourse(null);
    setSearchTerm('');
    showToast(`Round "${formData.get('name')}" updated successfully!`);
    setEditingRound(null);
  };

  const handleDeleteRound = (id, name) => {
    setDeleteRoundConfirm({ id, name });
  };

  const confirmDeleteRound = async () => {
    if (deleteRoundConfirm) {
      await DB.deleteRound(deleteRoundConfirm.id);
      setRounds(prev => prev.filter(r => r.id !== deleteRoundConfirm.id));
      showToast(`Round "${deleteRoundConfirm.name}" deleted successfully!`, 'success');
      setDeleteRoundConfirm(null);
    }
  };

  const handleAddFineType = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (!activeSeason) {
      showToast('No active season found. Please create a season first.', 'error');
      return;
    }

    await DB.addFineType(
      activeSeason.id,
      formData.get('name'),
      parseInt(formData.get('amount')),
      formData.get('description')
    );

    setIsAddFineTypeModalOpen(false);
  };

  const handleDeleteFineType = (id, name) => {
    showConfirm(
      `Delete Fine Type "${name}"?`,
      `This will permanently delete this fine type. Any existing fines of this type will remain. This action cannot be undone.`,
      async () => {
        await DB.deleteFineType(id);
        showToast(`Fine type "${name}" deleted`, 'success');
      },
      'danger'
    );
  };

  // Player Management View - Admin CRUD for players
  const PlayerManagementView = () => {
    const [adminTab, setAdminTab] = useState('players');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [teamsList, setTeamsList] = useState([]);
    const [isAddingTeam, setIsAddingTeam] = useState(false);

    useEffect(() => {
      if (activeSeason) DB.getTeams(activeSeason.id).then(setTeamsList);
    }, [activeSeason]);
    const [buyInStatusCache, setBuyInStatusCache] = useState({});
    const [buyInLoaded, setBuyInLoaded] = useState(false);

    useEffect(() => {
      let cancelled = false;
      setBuyInLoaded(false);
      const loadBuyInStatuses = async () => {
        if (!activeSeason?.id || players.length === 0) return;
        const results = await Promise.all(
          players.map(p => DB.getPlayerBuyInStatus(p.id, activeSeason.id).then(status => [p.id, status]))
        );
        if (cancelled) return;
        const cache = {};
        for (const [id, status] of results) cache[id] = status;
        setBuyInStatusCache(cache);
        setBuyInLoaded(true);
      };
      loadBuyInStatuses();
      return () => { cancelled = true; };
    }, [activeSeason?.id]); // Only reload on season change

    // Calculate player statistics (only for current season's rounds)
    const playersWithStats = useMemo(() => {
      const seasonRoundIds = new Set(rounds.map(r => r.id));
      return players.map(player => {
        const playerScores = scores[player.id] || {};
        // Only count scores for rounds in the active season
        let roundsPlayed = 0;
        let totalFines = 0;
        let totalStrokes = 0;
        for (const [roundId, s] of Object.entries(playerScores)) {
          if (!seasonRoundIds.has(Number(roundId))) continue;
          if (s.strokes > 0) {
            roundsPlayed++;
            totalStrokes += s.strokes;
          }
          totalFines += s.fines || 0;
        }
        const avgScore = roundsPlayed > 0 ? Math.round(totalStrokes / roundsPlayed) : 0;

        return {
          ...player,
          roundsPlayed,
          totalFines,
          avgScore
        };
      });
    }, [players, scores, rounds]);

    // Filter and sort players
    const filteredPlayers = useMemo(() => {
      let filtered = playersWithStats.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             p.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'rounds':
            return b.roundsPlayed - a.roundsPlayed;
          case 'fines':
            return b.totalFines - a.totalFines;
          case 'avg':
            return a.avgScore - b.avgScore;
          default:
            return 0;
        }
      });

      return filtered;
    }, [playersWithStats, searchTerm, statusFilter, sortBy]);

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Header: Title + Action Button (consistent across tabs) */}
        <div className="flex items-center justify-between min-h-[44px]">
          <h2 className="text-xl font-bold text-slate-800">Players & Teams</h2>
          {adminTab === 'players' && (
            <button
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]"
            >
              <Plus size={16} /> Add Player
            </button>
          )}
          {adminTab === 'teams' && !isAddingTeam && teamsList.length < 4 && (
            <button
              onClick={() => setIsAddingTeam(true)}
              className="bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]"
            >
              <Plus size={16} /> Add Team
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setAdminTab('players')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-[44px] ${
              adminTab === 'players'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setAdminTab('teams')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-[44px] ${
              adminTab === 'teams'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Teams
          </button>
        </div>

        {/* Players Tab */}
        {adminTab === 'players' && <>

        {/* Player List */}
        {filteredPlayers.length === 0 && players.length === 0 ? (
          <NoPlayersEmptyState onAddPlayer={() => setIsAddPlayerModalOpen(true)} />
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No players match your search.</div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {filteredPlayers.map(p => {
                const buyInStatus = buyInStatusCache[p.id] || { isPaid: false };
                return (
                  <button
                    key={p.id}
                    onClick={() => setManagingPlayerId(p.id)}
                    className="w-full flex items-center gap-3 p-3 md:p-4 hover:bg-slate-50 transition-colors text-left min-h-[64px]"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {p.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm truncate">{p.name}</span>
                        {p.role === 'master' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Master</span>}
                        {p.role === 'admin' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Admin</span>}
                        {p.status === 'inactive' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">Inactive</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{p.email}</p>
                    </div>

                    {/* Quick Stats (desktop) */}
                    <div className="hidden md:flex items-center gap-6 flex-shrink-0 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Rounds</p>
                        <p className="text-sm font-bold text-slate-700">{p.roundsPlayed}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Avg</p>
                        <p className="text-sm font-bold text-slate-700">{p.avgScore || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Fines</p>
                        <p className="text-sm font-bold text-red-600">R{p.totalFines}</p>
                      </div>
                    </div>

                    {/* Buy-In Badge */}
                    <span className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full font-bold ${
                      !buyInLoaded ? 'bg-slate-100 text-slate-400' :
                      buyInStatus.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {!buyInLoaded ? '...' : buyInStatus.isPaid ? 'Paid' : 'Due'}
                    </span>

                    {/* Chevron */}
                    <ChevronDown size={16} className="-rotate-90 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        </>}

        {/* Teams Tab */}
        {adminTab === 'teams' && <TeamManagementSection teams={teamsList} setTeams={setTeamsList} isAddingTeam={isAddingTeam} setIsAddingTeam={setIsAddingTeam} />}
      </div>
    );
  };

  const TeamManagementSection = ({ teams, setTeams, isAddingTeam, setIsAddingTeam }) => {
    const [newTeamName, setNewTeamName] = useState('');
    const [newPlayer1, setNewPlayer1] = useState('');
    const [newPlayer2, setNewPlayer2] = useState('');
    const [editingTeam, setEditingTeam] = useState(null);

    const assignedPlayerIds = teams.flatMap(t => [t.player1_id, t.player2_id]);
    const availablePlayers = players.filter(p => p.status === 'active' && !assignedPlayerIds.includes(p.id));

    const handleAddTeam = async () => {
      if (!newTeamName || !newPlayer1 || !newPlayer2 || !activeSeason) return;
      await DB.createTeam(activeSeason.id, newTeamName, newPlayer1, newPlayer2);
      const updated = await DB.getTeams(activeSeason.id);
      setTeams(updated);
      setNewTeamName('');
      setNewPlayer1('');
      setNewPlayer2('');
      setIsAddingTeam(false);
      showToast('Team created!', 'success');
    };

    const handleDeleteTeam = async (id) => {
      await DB.deleteTeam(id);
      const updated = await DB.getTeams(activeSeason.id);
      setTeams(updated);
      showToast('Team deleted', 'info');
    };

    const handleUpdateTeam = async () => {
      if (!editingTeam) return;
      await DB.updateTeam(editingTeam.id, {
        name: editingTeam.name,
        player1_id: editingTeam.player1_id,
        player2_id: editingTeam.player2_id
      });
      const updated = await DB.getTeams(activeSeason.id);
      setTeams(updated);
      setEditingTeam(null);
      showToast('Team updated!', 'success');
    };

    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">Fixed pairs for {activeSeason?.name || 'the season'}. Combined stableford, all 9 rounds count.</p>
        <Card>
          <div className="divide-y divide-slate-100">
            {teams.map(team => (
              <div key={team.id} className="p-4">
                {editingTeam?.id === team.id ? (
                  <div className="space-y-3">
                    <input
                      id={`edit-team-${team.id}`}
                      name="edit-team-name"
                      value={editingTeam.name}
                      onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                      aria-label="Team name"
                      className="input input-bordered w-full min-h-[44px]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        id={`edit-team-p1-${team.id}`}
                        name="edit-team-p1"
                        value={editingTeam.player1_id}
                        onChange={e => setEditingTeam({ ...editingTeam, player1_id: e.target.value })}
                        aria-label="Player 1"
                        className="select select-bordered w-full min-h-[44px]"
                      >
                        {players.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        id={`edit-team-p2-${team.id}`}
                        name="edit-team-p2"
                        value={editingTeam.player2_id}
                        onChange={e => setEditingTeam({ ...editingTeam, player2_id: e.target.value })}
                        aria-label="Player 2"
                        className="select select-bordered w-full min-h-[44px]"
                      >
                        {players.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdateTeam} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm min-h-[44px] flex items-center justify-center gap-2">
                        <Save size={14} /> Save
                      </button>
                      <button onClick={() => setEditingTeam(null)} className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm min-h-[44px]">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                      {team.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.player1_name} & {team.player2_name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`Edit ${team.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`Delete ${team.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {teams.length === 0 && !isAddingTeam && (
              <div className="p-8 text-center text-slate-400 text-sm">No teams set up yet</div>
            )}

            {isAddingTeam && (
              <div className="p-4 bg-slate-50 space-y-3">
                <input
                  id="team-name"
                  name="team-name"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Team name"
                  aria-label="Team name"
                  className="input input-bordered w-full min-h-[44px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select id="team-p1" name="team-p1" aria-label="Player 1" value={newPlayer1} onChange={e => setNewPlayer1(e.target.value)} className="select select-bordered w-full min-h-[44px]">
                    <option value="">Player 1</option>
                    {availablePlayers.filter(p => p.id !== newPlayer2).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select id="team-p2" name="team-p2" aria-label="Player 2" value={newPlayer2} onChange={e => setNewPlayer2(e.target.value)} className="select select-bordered w-full min-h-[44px]">
                    <option value="">Player 2</option>
                    {availablePlayers.filter(p => p.id !== newPlayer1).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTeam}
                    disabled={!newTeamName || !newPlayer1 || !newPlayer2}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm min-h-[44px] disabled:opacity-50"
                  >
                    Add Team
                  </button>
                  <button
                    onClick={() => setIsAddingTeam(false)}
                    className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Full Player Profile Management Page (master only)
  const PlayerProfilePage = () => {
    const player = players.find(p => p.id === managingPlayerId);
    const [formData, setFormData] = useState({});
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [playerBuyIn, setPlayerBuyIn] = useState({ isPaid: false, date: null });
    const [playerFinesSummary, setPlayerFinesSummary] = useState({ total_fines: 0, paid_fines: 0, outstanding_fines: 0 });

    useEffect(() => {
      if (player) {
        setFormData({ name: player.name, email: player.email, role: player.role, status: player.status, password: '' });
        setAvatarPreview(player.avatar);
        if (activeSeason?.id) {
          DB.getPlayerBuyInStatus(player.id, activeSeason.id).then(setPlayerBuyIn);
          DB.getPlayerFinesSummary(player.id, activeSeason.id).then(setPlayerFinesSummary);
        }
      }
    }, [managingPlayerId, player?.id, activeSeason?.id]);

    if (!player) return null;

    // Calculate stats only from current season's rounds
    const playerScores = scores[player.id] || {};
    const seasonRoundIds = new Set(rounds.map(r => r.id));
    let roundsPlayed = 0, totalStrokes = 0, totalStableford = 0, totalFines = 0;
    for (const [rid, s] of Object.entries(playerScores)) {
      if (!seasonRoundIds.has(Number(rid))) continue;
      if (s.strokes > 0) { roundsPlayed++; totalStrokes += s.strokes; totalStableford += (s.stableford || 0); }
      totalFines += (s.fines || 0);
    }
    const avgScore = roundsPlayed > 0 ? Math.round(totalStrokes / roundsPlayed) : 0;

    const handleSave = async (e) => {
      e.preventDefault();
      const updates = { name: formData.name, email: formData.email, status: formData.status };
      if (currentUser.role === 'master' && player.role !== 'master') updates.role = formData.role;
      if (formData.password?.trim()) updates.password = formData.password;
      if (avatarPreview !== player.avatar) updates.avatar = avatarPreview;
      await DB.updatePlayer(player.id, updates);
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...updates } : p));
      showToast(`${formData.name} updated successfully!`, 'success');
    };

    const handleAvatarChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 500000) { showToast('Image too large. Max 500KB.', 'error'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    };

    const [profileTab, setProfileTab] = useState('stats');

    const tabs = [
      { id: 'stats', label: 'Stats' },
      { id: 'rounds', label: 'Rounds' },
      { id: 'fines', label: 'Fines' },
      { id: 'edit', label: 'Edit' },
    ];

    return (
      <div className="animate-in fade-in duration-300">
        {/* Back Button */}
        <button
          onClick={() => { setManagingPlayerId(null); setView('admin'); }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 min-h-[44px]"
        >
          <ChevronDown size={16} className="rotate-90" /> Back to Players
        </button>

        {/* Unified Profile Card */}
        <Card>
          {/* Profile Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={player.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-200" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl ring-2 ring-emerald-200">
                    {player.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{player.name}</h2>
                <p className="text-sm text-slate-500 truncate">{player.email}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge type={player.role === 'master' || player.role === 'admin' ? 'warning' : 'neutral'}>
                    {player.role === 'master' ? 'Master' : player.role}
                  </Badge>
                  <Badge type={player.status === 'active' ? 'success' : 'danger'}>{player.status}</Badge>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    playerBuyIn.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Buy-In: {playerBuyIn.isPaid ? 'Paid' : 'Due'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stat Pills */}
            <div className="flex flex-wrap gap-2 mt-4 text-xs">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{roundsPlayed}/{rounds.length} Rounds</span>
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Avg {avgScore || '-'}</span>
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">SF {totalStableford || '-'}</span>
              <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">Fines R{playerFinesSummary.total_fines.toLocaleString()}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-t border-b border-slate-200 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id)}
                className={`flex-1 min-w-[80px] px-4 py-3 text-sm font-medium text-center transition-colors whitespace-nowrap min-h-[44px] ${
                  profileTab === tab.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* Stats Tab */}
            {profileTab === 'stats' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Rounds Played</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{roundsPlayed} <span className="text-sm font-normal text-slate-400">/ {rounds.length}</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Average Score</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{avgScore || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Total Strokes</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{totalStrokes || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Stableford Points</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{totalStableford || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rounds Tab */}
            {profileTab === 'rounds' && (
              <div className="overflow-x-auto -mx-4">
                {rounds.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                        <th className="px-4 py-2 font-medium">Round</th>
                        <th className="px-4 py-2 font-medium">Course</th>
                        <th className="px-4 py-2 font-medium text-center">Score</th>
                        <th className="px-4 py-2 font-medium text-center">HC</th>
                        <th className="px-4 py-2 font-medium text-center">SF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map(r => {
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
                  <div className="py-12 text-center text-slate-400">No rounds in this season yet</div>
                )}
              </div>
            )}

            {/* Fines Tab */}
            {profileTab === 'fines' && (
              <div className="space-y-4">
                {/* Fines Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-500">Total</p>
                    <p className="text-lg font-bold text-red-700 mt-0.5">R{playerFinesSummary.total_fines.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-500">Paid</p>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">R{playerFinesSummary.paid_fines.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-500">Outstanding</p>
                    <p className="text-lg font-bold text-amber-700 mt-0.5">R{playerFinesSummary.outstanding_fines.toLocaleString()}</p>
                  </div>
                </div>

                {/* Buy-In */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Season Buy-In</p>
                    <p className="text-xs text-slate-500">R{activeSeason?.buy_in_amount?.toLocaleString() || '2,500'} — {activeSeason?.name}</p>
                    {playerBuyIn.date && <p className="text-xs text-slate-400 mt-0.5">Paid {playerBuyIn.date}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      if (!activeSeason?.id) return;
                      await DB.markBuyInPaid(player.id, activeSeason.id, !playerBuyIn.isPaid);
                      setPlayerBuyIn({ isPaid: !playerBuyIn.isPaid, date: !playerBuyIn.isPaid ? new Date().toISOString().split('T')[0] : null });
                      showToast(`Buy-in ${!playerBuyIn.isPaid ? 'marked as paid' : 'marked as outstanding'}`, 'success');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
                      playerBuyIn.isPaid
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    {playerBuyIn.isPaid ? 'Paid' : 'Mark Paid'}
                  </button>
                </div>
              </div>
            )}

            {/* Edit Tab */}
            {profileTab === 'edit' && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                        {player.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors text-sm text-slate-600 min-h-[44px]">
                    <Camera size={16} /> Change Photo
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="pp-name" className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
                    <input
                      id="pp-name"
                      name="playerName"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input input-bordered w-full min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pp-email" className="text-sm font-medium text-slate-700 mb-1 block">Email Address</label>
                    <input
                      id="pp-email"
                      name="playerEmail"
                      required
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input input-bordered w-full min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pp-password" className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
                    <input
                      id="pp-password"
                      name="playerPassword"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={formData.password || ''}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="input input-bordered w-full min-h-[44px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {currentUser.role === 'master' && player.role !== 'master' && (
                      <div>
                        <label htmlFor="pp-role" className="text-sm font-medium text-slate-700 mb-1 block">Role</label>
                        <select
                          id="pp-role"
                          name="playerRole"
                          value={formData.role || 'player'}
                          onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                          className="select select-bordered w-full min-h-[44px]"
                        >
                          <option value="player">Player</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label htmlFor="pp-status" className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                      <select
                        id="pp-status"
                        name="playerStatus"
                        value={formData.status || 'active'}
                        onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="select select-bordered w-full min-h-[44px]"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px]">
                  <Save size={16} /> Save Changes
                </button>
              </form>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Sidebar />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="text-emerald-500" size={20} />
          GPGA {activeSeason?.year || ''}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <main className="p-4 md:p-8 md:ml-64 pt-20 md:pt-8">
        {view === 'dashboard' && <DashboardView />}
        {view === 'fines' && <FinesView />}
        {view === 'rounds' && <RoundsManagementView />}
        {view === 'admin' && !managingPlayerId && <PlayerManagementView />}
        {view === 'admin' && managingPlayerId && <PlayerProfilePage />}
        {view === 'profile' && <ProfileView />}
        {view === 'players' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold text-slate-800">Players Directory</h2>
               {currentUser.role === 'master' && (
                 <button
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                 >
                   <Plus size={18} /> Add Player
                 </button>
               )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {players.map(p => {
                 const buyInStatus = directoryBuyInCache[p.id] || { isPaid: false };
                 return (
                 <Card key={p.id} className="p-4 group hover:border-emerald-500 transition-all">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 overflow-hidden">
                        {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" alt="" /> : p.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 group-hover:text-emerald-700">{p.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge type={p.status === 'active' ? 'success' : 'danger'}>{p.status}</Badge>
                          {p.role === 'master' && <Badge type="error">Master</Badge>}
                          {p.role === 'admin' && <Badge type="warning">Admin</Badge>}
                        </div>
                      </div>
                      {currentUser.role === 'master' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditPlayer(p)}
                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-slate-400 hover:text-emerald-600"
                            title="Edit Player"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(p.id, p.name)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                            title="Delete Player"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Buy-In Status */}
                    {(currentUser.role === 'master' || currentUser.role === 'admin') && (
                      <div className="pt-3 border-t border-slate-200">
                        <button
                          onClick={async () => {
                            if (!activeSeason?.id) return;
                            await DB.markBuyInPaid(p.id, activeSeason.id, !buyInStatus.isPaid);
                            setDirectoryBuyInCache(prev => ({ ...prev, [p.id]: { isPaid: !buyInStatus.isPaid, date: !buyInStatus.isPaid ? new Date().toISOString().split('T')[0] : null } }));
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                            buyInStatus.isPaid
                              ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          <span className={`text-xs font-semibold ${
                            buyInStatus.isPaid ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            Buy-In
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${
                              buyInStatus.isPaid ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {buyInStatus.isPaid ? 'Paid' : 'Outstanding'}
                            </span>
                            {buyInStatus.isPaid && (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    )}
                 </Card>
                 );
               })}
             </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        title="Add New Player"
      >
        <form onSubmit={handleAddPlayer} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Full Name <span className="text-error">*</span></span>
            </label>
            <input
              required
              name="name"
              className="input input-bordered w-full focus:input-primary"
              placeholder="e.g. Tiger Woods"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Email Address <span className="text-error">*</span></span>
            </label>
            <input
              required
              name="email"
              type="email"
              className="input input-bordered w-full focus:input-primary"
              placeholder="tiger@golf.com"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Password <span className="text-error">*</span></span>
            </label>
            <input
              required
              name="password"
              type="password"
              className="input input-bordered w-full focus:input-primary"
              placeholder="Enter password"
              minLength="6"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Role</span>
            </label>
            <select
              name="role"
              className="select select-bordered w-full pr-10"
              defaultValue="player"
            >
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
            <Plus size={18} />
            Create Player
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isAddRoundModalOpen}
        onClose={() => {
          setIsAddRoundModalOpen(false);
          setSelectedCourse(null);
          setSearchTerm('');
          setSelectedDate('');
        }}
        title="Add New Round"
      >
        <form onSubmit={handleAddRound} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Round Name</span>
            </label>
            <input
              required
              name="name"
              defaultValue={nextRoundName}
              className="input input-bordered w-full focus:input-primary"
              placeholder="e.g. Round 7, Summer Classic..."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Date</span>
            </label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select round date"
            />
            <input type="hidden" name="date" value={selectedDate} required />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold flex items-center gap-2">
                <span>Golf Course</span>
                {selectedCourse && (
                  <span className="badge badge-success badge-sm">{selectedCourse.name}</span>
                )}
              </span>
            </label>

            <div className="input input-bordered w-full flex items-center gap-2 focus-within:input-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="grow"
                placeholder="Search courses..."
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <input type="hidden" name="course" value={selectedCourse?.name || ''} required />
          </div>

          {/* Course Selection Grid - Only show when searching */}
          {searchTerm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-base-200 rounded-lg">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`card card-compact cursor-pointer transition-all ${
                      selectedCourse?.id === course.id
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-base-100 hover:bg-base-300'
                    }`}
                  >
                    <div className="card-body">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-tight">{course.name}</h4>
                        {selectedCourse?.id === course.id && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-xs ${selectedCourse?.id === course.id ? 'opacity-90' : 'opacity-60'}`}>
                        {course.location}
                      </p>
                      <div className={`badge badge-sm ${selectedCourse?.id === course.id ? 'badge-neutral' : 'badge-ghost'}`}>
                        Par {course.par}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-base-content/60 text-sm">No courses found</p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
            disabled={!selectedCourse}
          >
            <Plus size={18} />
            Create Round
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isEditPlayerModalOpen}
        onClose={() => { setIsEditPlayerModalOpen(false); setEditingPlayer(null); }}
        title="Edit Player"
      >
        {editingPlayer && (
          <form onSubmit={handleUpdatePlayerSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Full Name</span>
              </label>
              <input
                required
                name="name"
                defaultValue={editingPlayer.name}
                className="input input-bordered w-full focus:input-primary"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Email Address</span>
              </label>
              <input
                required
                name="email"
                type="email"
                defaultValue={editingPlayer.email}
                className="input input-bordered w-full focus:input-primary"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Reset Password</span>
              </label>
              <input
                name="password"
                type="password"
                placeholder="Leave blank to keep current"
                className="input input-bordered w-full focus:input-primary"
              />
            </div>
            {currentUser.role === 'master' && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Role</span>
                </label>
                <select
                  name="role"
                  defaultValue={editingPlayer.role}
                  className="select select-bordered w-full focus:select-primary pr-10"
                  disabled={editingPlayer.role === 'master'}
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                  {editingPlayer.role === 'master' && <option value="master">Master (You)</option>}
                </select>
                {editingPlayer.role === 'master' && (
                  <label className="label">
                    <span className="label-text-alt text-amber-600">
                      Master role cannot be changed
                    </span>
                  </label>
                )}
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Status</span>
              </label>
              <select
                name="status"
                defaultValue={editingPlayer.status}
                className="select select-bordered w-full focus:select-primary pr-10"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
              <Save size={18} />
              Update Player
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isEditRoundModalOpen}
        onClose={() => { setIsEditRoundModalOpen(false); setEditingRound(null); setSelectedCourse(null); setSearchTerm(''); }}
        title="Edit Round"
      >
        {editingRound && (
          <form onSubmit={handleUpdateRoundSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Round Name</span>
              </label>
              <input
                required
                name="name"
                defaultValue={editingRound.name}
                className="input input-bordered w-full focus:input-primary"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Date</span>
              </label>
              <input
                required
                name="date"
                type="date"
                defaultValue={editingRound.date}
                className="input input-bordered w-full focus:input-primary [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <span>Golf Course</span>
                  {selectedCourse && (
                    <span className="badge badge-success badge-sm">{selectedCourse.name}</span>
                  )}
                </span>
              </label>

              <div className="input input-bordered w-full flex items-center gap-2 focus-within:input-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="grow"
                  placeholder="Search courses..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="btn btn-ghost btn-xs btn-circle"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <input type="hidden" name="course" value={selectedCourse?.name || editingRound.course} required />
            </div>

            {/* Course Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-base-200 rounded-lg">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`card card-compact cursor-pointer transition-all ${
                      selectedCourse?.id === course.id || (!selectedCourse && course.name === editingRound.course)
                        ? 'bg-primary text-primary-content shadow-lg'
                        : 'bg-base-100 hover:bg-base-300'
                    }`}
                  >
                    <div className="card-body">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-tight">{course.name}</h4>
                        {(selectedCourse?.id === course.id || (!selectedCourse && course.name === editingRound.course)) && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-xs ${(selectedCourse?.id === course.id || (!selectedCourse && course.name === editingRound.course)) ? 'opacity-90' : 'opacity-60'}`}>
                        {course.location}
                      </p>
                      <div className={`badge badge-sm ${(selectedCourse?.id === course.id || (!selectedCourse && course.name === editingRound.course)) ? 'badge-neutral' : 'badge-ghost'}`}>
                        Par {course.par}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-base-content/60 text-sm">No courses found</p>
                </div>
              )}
            </div>

            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
              <Save size={18} />
              Update Round
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isAddFineTypeModalOpen}
        onClose={() => setIsAddFineTypeModalOpen(false)}
        title="Add Fine Type"
      >
        <form onSubmit={handleAddFineType} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fine Name</label>
            <input
              required
              name="name"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. 3 Putt, Lost Ball, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (R)</label>
            <input
              required
              name="amount"
              type="number"
              min="0"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. 20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Optional description..."
            />
          </div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">
            Create Fine Type
          </button>
        </form>
      </Modal>

      {/* Delete Round Confirmation Modal */}
      {deleteRoundConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-red-600">Delete Round</h3>
            <p className="py-4">
              Are you sure you want to delete <span className="font-bold">{deleteRoundConfirm.name}</span>?
              This will also delete all scores for this round and cannot be undone.
            </p>
            <div className="modal-action">
              <button
                onClick={() => setDeleteRoundConfirm(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRound}
                className="btn btn-error"
              >
                Delete Round
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            <div>
              <span className="font-semibold">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* New Season Modal */}
      <Modal
        isOpen={isNewSeasonModalOpen}
        onClose={() => setIsNewSeasonModalOpen(false)}
        title="Create New Season"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const year = Number(formData.get('year'));
          const name = formData.get('name');
          const buyIn = Number(formData.get('buyIn'));
          await DB.createSeason(year, name, buyIn);
          await loadData();
          setIsNewSeasonModalOpen(false);
          showToast(`${name} created!`, 'success');
        }} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Year</span></label>
            <input name="year" type="number" defaultValue={new Date().getFullYear() + 1} className="input input-bordered" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Season Name</span></label>
            <input name="name" type="text" defaultValue={`GPGA ${new Date().getFullYear() + 1} Season`} className="input input-bordered" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Buy-in Amount (R)</span></label>
            <input name="buyIn" type="number" defaultValue={2500} className="input input-bordered" required />
          </div>
          <div className="alert alert-warning text-sm">
            Creating a new season will deactivate the current one. You can switch between seasons using the sidebar dropdown.
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsNewSeasonModalOpen(false)} className="btn">Cancel</button>
            <button type="submit" className="btn bg-emerald-600 text-white hover:bg-emerald-700 border-0">Create Season</button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />

    </div>
  );
}

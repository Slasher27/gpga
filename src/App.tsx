import { useState, useEffect, useMemo, lazy, Suspense, type FormEvent } from 'react';
import { TrendingUp, Banknote, Calendar, Users, Plus, Save, Shuffle, Settings } from 'lucide-react';
import * as DB from './api';
import { SEASON_ROUNDS } from './api';
import type {
  Player, Round, Season, GolfCourse, ScoresMapFull, FinesByRound,
  LeaderboardEntry, AuthedPlayer, Role, Status,
} from './api';
import { DashboardSkeleton, useConfirm, Modal, DatePicker, CourseSelector } from './components/common';
import LoginPage from './components/LoginPage';
import { setupPush } from './pushSetup';
import { TopBar, DesktopSidebar, MobileBottomNav } from './components/Nav';
import DashboardView from './components/DashboardView';

// Lazy-loaded views — kept out of the initial bundle until the user navigates to them
const FinancesView = lazy(() => import('./components/FinancesView'));
const RoundsView = lazy(() => import('./components/RoundsView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const PlayersView = lazy(() => import('./components/PlayersView'));
const PlayerProfilePage = lazy(() => import('./components/PlayerProfilePage'));
const SeasonSettings = lazy(() => import('./components/SeasonSettings'));
const NotificationsView = lazy(() => import('./components/NotificationsView'));
const TeamDrawPage = lazy(() => import('./components/TeamDraw/TeamDrawPage'));

// SEASON_ROUNDS imported from ./api — the worst round is only dropped once the
// full season exists and the player completed all of it (never mid-season).
const mergeScoresAndFines = (scoresData: ScoresMapFull, finesData: FinesByRound): ScoresMapFull => {
  const merged: ScoresMapFull = { ...scoresData };
  for (const pid of Object.keys(finesData)) {
    if (!merged[pid]) merged[pid] = {};
    for (const rid of Object.keys(finesData[pid])) {
      const r = Number(rid);
      if (!merged[pid][r]) merged[pid][r] = { strokes: 0, fines: 0 };
      merged[pid][r].fines = finesData[pid][r];
    }
  }
  return merged;
};

// Capture PWA install prompt (BeforeInstallPromptEvent isn't in the DOM lib).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('gpga_current_view') || 'dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [scores, setScores] = useState<ScoresMapFull>({});
  const [currentUserId, setCurrentUserId] = useState('1');
  const [dbReady, setDbReady] = useState(false);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [seasonPlayerIds, setSeasonPlayerIds] = useState<Set<string>>(new Set());
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [golfCourses, setGolfCourses] = useState<GolfCourse[]>([]);
  const [managingPlayerId, setManagingPlayerId] = useState<string | null>(null);

  // Modal states
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isAddRoundModalOpen, setIsAddRoundModalOpen] = useState(false);
  const [isEditRoundModalOpen, setIsEditRoundModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [isAddFineTypeModalOpen, setIsAddFineTypeModalOpen] = useState(false);
  const [fineTypesVersion, setFineTypesVersion] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [canInstall, setCanInstall] = useState(false);

  // Check if PWA install is available
  useEffect(() => {
    const check = () => setCanInstall(!!deferredPrompt);
    check();
    window.addEventListener('beforeinstallprompt', check);
    window.addEventListener('appinstalled', () => setCanInstall(false));
    return () => { window.removeEventListener('beforeinstallprompt', check); };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    deferredPrompt = null;
  };

  // Toast + confirm
  const [toast, setToast] = useState<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' });
  const { confirm: showConfirm, ConfirmDialogComponent } = useConfirm();

  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- Init & Data Loading ---

  useEffect(() => {
    (async () => {
      try {
        await DB.initDatabase();
        const authenticated = DB.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          await loadData();
          const uid = DB.getCurrentUserId();
          setCurrentUserId(uid);
          setupPush(uid);
        }
        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    })();
  }, []);

  const loadData = async () => {
    try {
      const season = await DB.getActiveSeason();
      setActiveSeason(season);
      const [seasonsData, playersData, roundsData, coursesData, scoresData, finesData, seasonPlayersData] = await Promise.all([
        DB.getAllSeasons(),
        DB.getAllPlayers(),
        season ? DB.getAllRounds(season.id) : DB.getAllRounds(),
        DB.getAllGolfCourses(),
        DB.getAllScores(),
        DB.getPlayerFinesByRound(),
        season ? DB.getSeasonPlayers(season.id) : Promise.resolve([]),
      ]);
      setAllSeasons(seasonsData);
      setPlayers(playersData);
      setRounds(roundsData);
      setGolfCourses(coursesData);
      setSeasonPlayerIds(new Set(seasonPlayersData.map(sp => sp.player_id)));

      setScores(mergeScoresAndFines(scoresData, finesData));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const currentUser = players.find(p => p.id === currentUserId) || players[0];
  const isReadOnlySeason = !!activeSeason && !activeSeason.is_active;
  const isAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const isMaster = currentUser?.role === 'master';

  const refreshFines = () => {
    DB.getPlayerFinesByRound().then(finesData => {
      setScores(prev => {
        // Reset all fines to 0, then apply fresh data
        const reset = {};
        Object.keys(prev).forEach(pid => {
          reset[pid] = {};
          Object.keys(prev[pid]).forEach(rid => {
            reset[pid][rid] = { ...prev[pid][rid], fines: 0 };
          });
        });
        return mergeScoresAndFines(reset, finesData);
      });
    });
  };

  // Refresh fines when leaving fines view
  useEffect(() => {
    const prev = localStorage.getItem('gpga_previous_view');
    if (prev === 'fines' && view !== 'fines') refreshFines();
    localStorage.setItem('gpga_previous_view', view);
  }, [view]);

  // --- Computed ---

  const nextRoundName = useMemo(() => {
    if (rounds.length === 0) return 'Round 1';
    const nums = rounds.map(r => { const m = r.name.match(/Round (\d+)/i); return m ? parseInt(m[1]) : 0; }).filter(n => n > 0);
    return nums.length === 0 ? `Round ${rounds.length + 1}` : `Round ${Math.max(...nums) + 1}`;
  }, [rounds]);

  // Only players enrolled in the active season appear in standings/fines.
  const seasonPlayers = useMemo(
    () => players.filter(p => seasonPlayerIds.has(p.id)),
    [players, seasonPlayerIds],
  );

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    const totalRoundsCreated = rounds.length;
    return seasonPlayers.map((player): LeaderboardEntry => {
      const pScores = scores[player.id] || {};
      let totalStrokes = 0, totalStableford = 0, totalFines = 0, roundsPlayed = 0, worstRound = 0, worstStableford = 999;
      rounds.forEach(r => {
        if (pScores[r.id]) {
          const s = pScores[r.id].strokes || 0;
          const sf = pScores[r.id].stableford || 0;
          totalFines += pScores[r.id].fines || 0;
          if (s > 0) { totalStrokes += s; totalStableford += sf; roundsPlayed++; if (s > worstRound) worstRound = s; if (sf < worstStableford) worstStableford = sf; }
        }
      });
      const roundsMissed = totalRoundsCreated - roundsPlayed;
      const isDisqualified = roundsMissed > 1;
      const canDropWorstRound = totalRoundsCreated >= SEASON_ROUNDS && roundsPlayed === totalRoundsCreated;
      const netTotal = canDropWorstRound ? totalStrokes - worstRound : totalStrokes;
      const netStableford = canDropWorstRound ? totalStableford - worstStableford : totalStableford;
      return { ...player, totalStrokes, totalStableford, netTotal, netStableford, worstRound: canDropWorstRound ? worstRound : 0, worstStableford: canDropWorstRound ? worstStableford : 0, totalFines, roundsPlayed, roundsMissed, isDisqualified, pScores, canDropWorstRound };
    }).sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      if (a.netTotal === 0 && b.netTotal === 0) return 0;
      if (a.netTotal === 0) return 1;
      if (b.netTotal === 0) return -1;
      return a.netTotal - b.netTotal;
    });
  }, [seasonPlayers, scores, rounds]);

  // --- Handlers ---

  // FormData fields are string | File | null — coerce to a trimmed string.
  const fstr = (fd: FormData, key: string) => String(fd.get(key) ?? '');

  const handleLogin = async (user: AuthedPlayer) => { setIsAuthenticated(true); setCurrentUserId(user.id); await loadData(); setupPush(user.id); };
  const handleLogout = () => { DB.logout(); setIsAuthenticated(false); setCurrentUserId('1'); setView('dashboard'); };

  const setNavView = (id: string) => { setView(id); localStorage.setItem('gpga_current_view', id); };

  const handleSeasonSwitch = async (seasonId: number) => {
    const season = allSeasons.find(s => s.id === seasonId);
    if (!season) return;
    setActiveSeason(season);
    const [roundsData, scoresData, finesData, seasonPlayersData] = await Promise.all([
      DB.getAllRounds(season.id), DB.getAllScores(), DB.getPlayerFinesByRound(), DB.getSeasonPlayers(season.id)
    ]);
    setRounds(roundsData);
    setSeasonPlayerIds(new Set(seasonPlayersData.map(sp => sp.player_id)));
    setScores(mergeScoresAndFines(scoresData, finesData));
  };

  const handleAddPlayer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: fstr(fd, 'name'),
      email: fstr(fd, 'email'),
      role: (fstr(fd, 'role') || 'player') as Role,
      status: 'active' as Status,
      avatar: null,
    };
    // Send the entered password to the server; keep it out of client state.
    await DB.addPlayer({ ...newPlayer, password: fstr(fd, 'password') });
    setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
    setIsAddPlayerModalOpen(false);
    showToast(`Player ${newPlayer.name} added successfully!`);
  };

  const handleAddRound = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSeason) { showToast('No active season found.', 'error'); return; }
    if (!selectedCourse) { showToast('Please select a golf course', 'error'); return; }
    const fd = new FormData(e.currentTarget);
    const teeTime = fstr(fd, 'tee_time') || undefined;
    const teeTime2 = fstr(fd, 'tee_time_2') || undefined;
    const newRound = { name: fstr(fd, 'name'), date: fstr(fd, 'date'), courseId: selectedCourse.id, courseName: selectedCourse.name, teeTime, teeTime2 };
    const result = await DB.addRound(newRound, activeSeason.id);
    setRounds(prev => [...prev, { id: result.id, season_id: activeSeason.id, name: newRound.name, date: newRound.date, course_id: newRound.courseId, course_name: newRound.courseName, tee_time: teeTime ?? null, tee_time_2: teeTime2 ?? null }]);
    setIsAddRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setSelectedDate('');
    showToast(`Round "${newRound.name}" created successfully!`);
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setSelectedCourse(golfCourses.find(c => c.id === round.course_id) || null);
    setIsEditRoundModalOpen(true);
  };

  const handleUpdateRoundSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRound) return;
    const roundId = editingRound.id;
    const fd = new FormData(e.currentTarget);
    const teeTime = fstr(fd, 'tee_time') || null;
    const teeTime2 = fstr(fd, 'tee_time_2') || null;
    const updates = { name: fstr(fd, 'name'), date: fstr(fd, 'date'), courseId: selectedCourse?.id, courseName: selectedCourse?.name, teeTime, teeTime2 };
    await DB.updateRound(roundId, updates);
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, name: updates.name || r.name, date: updates.date || r.date, course_id: updates.courseId || r.course_id, course_name: updates.courseName || r.course_name, tee_time: teeTime, tee_time_2: teeTime2 } : r));
    setIsEditRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setEditingRound(null);
    showToast(`Round "${updates.name}" updated successfully!`);
  };

  const handleDeleteRound = (id: number, name: string) => {
    showConfirm(`Delete ${name}?`, `This will also delete all scores for this round and cannot be undone.`, async () => {
      await DB.deleteRound(id);
      setRounds(prev => prev.filter(r => r.id !== id));
      showToast(`Round "${name}" deleted successfully!`, 'success');
    });
  };

  const handleCloseRound = (id: number, name: string) => {
    showConfirm(`Close ${name}?`, `This will lock scores and send results to all players. This cannot be undone.`, async () => {
      await DB.closeRound(id);
      setRounds(prev => prev.map(r => r.id === id ? { ...r, closed: 1 } : r));
      showToast(`${name} closed — results sent to all players!`);
    });
  };

  const handleAddFineType = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSeason) { showToast('No active season found.', 'error'); return; }
    const fd = new FormData(e.currentTarget);
    await DB.addFineType(
      activeSeason.id,
      fstr(fd, 'name'),
      parseInt(fstr(fd, 'amount')),
      fstr(fd, 'description'),
      parseInt(fstr(fd, 'sort_order')) || 0,
      false,
      parseInt(fstr(fd, 'tier_threshold')) || 0,
      parseInt(fstr(fd, 'tier_amount')) || 0
    );
    setIsAddFineTypeModalOpen(false);
    setFineTypesVersion(v => v + 1);
    refreshFines?.();
  };

  const handleDeleteFineType = (id: number, name: string) => {
    showConfirm(`Delete Fine Type "${name}"?`, `This will permanently delete this fine type. Any existing fines of this type will remain.`, async () => {
      await DB.deleteFineType(id);
      setFineTypesVersion(v => v + 1);
      refreshFines?.();
      showToast(`Fine type "${name}" deleted`, 'success');
    });
  };

  // --- Auth/Loading Guards ---

  if (!isAuthenticated && dbReady) return <LoginPage onLogin={handleLogin} />;
  if (!dbReady || !currentUser || players.length === 0) return <div className="min-h-screen bg-slate-100 p-8"><DashboardSkeleton /></div>;

  // --- Nav Config ---

  const navItems = [
    { id: 'dashboard', icon: <TrendingUp size={20} />, label: 'Dashboard' },
    { id: 'fines', icon: <Banknote size={20} />, label: 'Finances' },
    { id: 'rounds', icon: <Calendar size={20} />, label: 'Rounds' },
    ...(isAdmin ? [{ id: 'teamdraw', icon: <Shuffle size={20} />, label: 'Team Draw' }] : []),
    ...(isAdmin ? [{ id: 'admin', icon: <Users size={20} />, label: 'Players' }] : []),
    ...(isAdmin ? [{ id: 'settings', icon: <Settings size={20} />, label: 'Season Settings' }] : []),
  ];

  const navProps = { view, setNavView, navItems, currentUser, activeSeason, allSeasons, handleSeasonSwitch, handleLogout, isAdmin };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-100 font-sans overflow-x-hidden">
      <TopBar currentUser={currentUser} activeSeason={activeSeason} allSeasons={allSeasons} handleSeasonSwitch={handleSeasonSwitch} handleLogout={handleLogout} setNavView={setNavView} canInstall={canInstall} onInstall={handleInstall} />
      <DesktopSidebar view={view} setNavView={setNavView} navItems={navItems} activeSeason={activeSeason} allSeasons={allSeasons} isAdmin={isAdmin} />
      <MobileBottomNav view={view} setNavView={setNavView} navItems={navItems} />

      <main className="px-4 md:px-6 lg:px-8 pt-16 pb-28 landscape:pb-20 md:pb-8 md:ml-16 lg:ml-56">
        <Suspense fallback={<DashboardSkeleton />}>
          {view === 'dashboard' && <DashboardView activeSeason={activeSeason} leaderboardData={leaderboardData} rounds={rounds} scores={scores} players={seasonPlayers} golfCourses={golfCourses} />}
          {view === 'fines' && <FinancesView rounds={rounds} scores={scores} players={seasonPlayers} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} currentUser={currentUser} showToast={showToast} onAddFineType={() => setIsAddFineTypeModalOpen(true)} onDeleteFineType={handleDeleteFineType} onFinesChanged={refreshFines} fineTypesVersion={fineTypesVersion} />}
          {view === 'rounds' && <RoundsView rounds={rounds} scores={scores} setScores={setScores} players={players} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} isAdmin={isAdmin} showToast={showToast} onAddRound={() => setIsAddRoundModalOpen(true)} onEditRound={handleEditRound} onDeleteRound={handleDeleteRound} onCloseRound={handleCloseRound} />}
          {view === 'teamdraw' && isAdmin && <TeamDrawPage players={players} activeSeason={activeSeason} />}
          {view === 'admin' && isAdmin && !managingPlayerId && <PlayersView players={players} scores={scores} rounds={rounds} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} currentUser={currentUser} showToast={showToast} showConfirm={showConfirm} setPlayers={setPlayers} onAddPlayer={() => setIsAddPlayerModalOpen(true)} managingPlayerId={managingPlayerId} setManagingPlayerId={setManagingPlayerId} />}
          {view === 'admin' && isAdmin && managingPlayerId && <PlayerProfilePage players={players} setPlayers={setPlayers} scores={scores} rounds={rounds} activeSeason={activeSeason} currentUser={currentUser} managingPlayerId={managingPlayerId} setManagingPlayerId={setManagingPlayerId} showToast={showToast} />}
          {view === 'profile' && <ProfileView currentUser={currentUser} players={players} setPlayers={setPlayers} scores={scores} rounds={rounds} activeSeason={activeSeason} showToast={showToast} />}
          {view === 'notifications' && <NotificationsView currentUser={currentUser} />}
          {view === 'settings' && isAdmin && <SeasonSettings activeSeason={activeSeason} allSeasons={allSeasons} players={players} rounds={rounds} showToast={showToast} showConfirm={showConfirm} onDataChanged={loadData} />}
        </Suspense>
      </main>

      {/* --- Modals --- */}

      <Modal isOpen={isAddPlayerModalOpen} onClose={() => setIsAddPlayerModalOpen(false)} title="Add New Player">
        <form onSubmit={handleAddPlayer} className="space-y-4">
          <div className="form-control">
            <label htmlFor="add-player-name" className="block text-sm font-semibold text-slate-700 mb-1">Full Name <span className="text-red-600">*</span></label>
            <input id="add-player-name" name="name" required autoComplete="name" className="input input-bordered w-full" placeholder="e.g. Tiger Woods" />
          </div>
          <div className="form-control">
            <label htmlFor="add-player-email" className="block text-sm font-semibold text-slate-700 mb-1">Email Address <span className="text-red-600">*</span></label>
            <input id="add-player-email" name="email" type="email" required autoComplete="email" className="input input-bordered w-full" placeholder="tiger@golf.com" />
          </div>
          <div className="form-control">
            <label htmlFor="add-player-password" className="block text-sm font-semibold text-slate-700 mb-1">Password <span className="text-red-600">*</span></label>
            <input id="add-player-password" name="password" type="password" required autoComplete="new-password" minLength={6} className="input input-bordered w-full" placeholder="Enter password" />
          </div>
          <div className="form-control">
            <label htmlFor="add-player-role" className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
            <select id="add-player-role" name="role" defaultValue="player" className="select select-bordered w-full pr-10">
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><Plus size={18} /> Create Player</button>
        </form>
      </Modal>

      <Modal isOpen={isAddRoundModalOpen} onClose={() => { setIsAddRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setSelectedDate(''); }} title="Add New Round">
        <form onSubmit={handleAddRound} className="space-y-4">
          <div className="form-control">
            <label htmlFor="add-round-name" className="block text-sm font-semibold text-slate-700 mb-1">Round Name</label>
            <input id="add-round-name" name="name" required defaultValue={nextRoundName} autoComplete="off" className="input input-bordered w-full" placeholder="e.g. Round 7" />
          </div>
          <div className="form-control">
            <label htmlFor="add-round-date" className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
            <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Select round date" />
            <input id="add-round-date" type="hidden" name="date" value={selectedDate} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label htmlFor="add-round-tee1" className="block text-sm font-semibold text-slate-700 mb-1">Tee Time 1</label>
              <input id="add-round-tee1" name="tee_time" type="time" autoComplete="off" className="input input-bordered w-full" />
            </div>
            <div className="form-control">
              <label htmlFor="add-round-tee2" className="block text-sm font-semibold text-slate-700 mb-1">Tee Time 2</label>
              <input id="add-round-tee2" name="tee_time_2" type="time" autoComplete="off" className="input input-bordered w-full" />
            </div>
          </div>
          <CourseSelector courses={golfCourses} selected={selectedCourse} onSelect={setSelectedCourse} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <input type="hidden" name="course" value={selectedCourse?.name || ''} required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2" disabled={!selectedCourse}><Plus size={18} /> Create Round</button>
        </form>
      </Modal>

      <Modal isOpen={isEditRoundModalOpen} onClose={() => { setIsEditRoundModalOpen(false); setEditingRound(null); setSelectedCourse(null); setSearchTerm(''); }} title="Edit Round">
        {editingRound && (
          <form onSubmit={handleUpdateRoundSubmit} className="space-y-4">
            <div className="form-control">
              <label htmlFor="edit-round-name" className="block text-sm font-semibold text-slate-700 mb-1">Round Name</label>
              <input id="edit-round-name" name="name" required defaultValue={editingRound.name} autoComplete="off" className="input input-bordered w-full" />
            </div>
            <div className="form-control">
              <label htmlFor="edit-round-date" className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
              <input id="edit-round-date" name="date" type="date" required defaultValue={editingRound.date} autoComplete="off" className="input input-bordered w-full [color-scheme:light]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label htmlFor="edit-round-tee1" className="block text-sm font-semibold text-slate-700 mb-1">Tee Time 1</label>
                <input id="edit-round-tee1" name="tee_time" type="time" defaultValue={editingRound.tee_time || ''} autoComplete="off" className="input input-bordered w-full" />
              </div>
              <div className="form-control">
                <label htmlFor="edit-round-tee2" className="block text-sm font-semibold text-slate-700 mb-1">Tee Time 2</label>
                <input id="edit-round-tee2" name="tee_time_2" type="time" defaultValue={editingRound.tee_time_2 || ''} autoComplete="off" className="input input-bordered w-full" />
              </div>
            </div>
            <CourseSelector courses={golfCourses} selected={selectedCourse} onSelect={setSelectedCourse} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <input type="hidden" name="course" value={selectedCourse?.name || editingRound.course_name} required />
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><Save size={18} /> Update Round</button>
          </form>
        )}
      </Modal>

      <Modal isOpen={isAddFineTypeModalOpen} onClose={() => setIsAddFineTypeModalOpen(false)} title="Add Fine Type">
        <form onSubmit={handleAddFineType} className="space-y-4">
          <div>
            <label htmlFor="add-fine-name" className="block text-sm font-medium text-slate-700 mb-1">Fine Name</label>
            <input id="add-fine-name" name="name" required autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 3 Putt, Lost Ball, etc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-fine-amount" className="block text-sm font-medium text-slate-700 mb-1">Amount (R)</label>
              <input id="add-fine-amount" name="amount" type="number" required min="0" autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 20" />
            </div>
            <div>
              <label htmlFor="add-fine-sort-order" className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
              <input id="add-fine-sort-order" name="sort_order" type="number" min="0" defaultValue="0" autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
            </div>
          </div>
          <div>
            <label htmlFor="add-fine-description" className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea id="add-fine-description" name="description" rows={3} autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Optional description..." />
          </div>
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-1">Escalation (Optional)</p>
            <p className="text-xs text-slate-500 mb-2">First N at base amount, remainder at tier amount. Leave blank for flat fine.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-fine-tier-threshold" className="block text-xs text-slate-500 mb-1">After quantity</label>
                <input id="add-fine-tier-threshold" name="tier_threshold" type="number" min="0" defaultValue="0" autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 3" />
              </div>
              <div>
                <label htmlFor="add-fine-tier-amount" className="block text-xs text-slate-500 mb-1">Tier amount (R)</label>
                <input id="add-fine-tier-amount" name="tier_amount" type="number" min="0" defaultValue="0" autoComplete="off" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 20" />
              </div>
            </div>
          </div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">Create Fine Type</button>
        </form>
      </Modal>

      {toast.show && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span className="font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}

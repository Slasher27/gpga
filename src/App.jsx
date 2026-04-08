import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, User, Banknote, Calendar, Users, Plus, Save } from 'lucide-react';
import * as DB from './api.ts';
import { DashboardSkeleton, useConfirm, Modal, DatePicker, CourseSelector } from './components/common';
import LoginPage from './components/LoginPage';
import { DesktopSidebar, MobileNav } from './components/Nav';
import DashboardView from './components/DashboardView';
import FinesView from './components/FinesView';
import RoundsView from './components/RoundsView';
import ProfileView from './components/ProfileView';
import PlayersView from './components/PlayersView';
import PlayerProfilePage from './components/PlayerProfilePage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('gpga_current_view') || 'dashboard');
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [scores, setScores] = useState({});
  const [currentUserId, setCurrentUserId] = useState('1');
  const [dbReady, setDbReady] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [allSeasons, setAllSeasons] = useState([]);
  const [golfCourses, setGolfCourses] = useState([]);
  const [managingPlayerId, setManagingPlayerId] = useState(null);

  // Modal states
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isAddRoundModalOpen, setIsAddRoundModalOpen] = useState(false);
  const [isEditRoundModalOpen, setIsEditRoundModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [isAddFineTypeModalOpen, setIsAddFineTypeModalOpen] = useState(false);
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Toast + confirm
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const { confirm: showConfirm, ConfirmDialogComponent } = useConfirm();

  const showToast = (message, type = 'success') => {
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
          setCurrentUserId(DB.getCurrentUserId());
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
      const [seasonsData, playersData, roundsData, coursesData, scoresData, finesData] = await Promise.all([
        DB.getAllSeasons(),
        DB.getAllPlayers(),
        season ? DB.getAllRounds(season.id) : DB.getAllRounds(),
        DB.getAllGolfCourses(),
        DB.getAllScores(),
        DB.getPlayerFinesByRound(),
      ]);
      setAllSeasons(seasonsData);
      setPlayers(playersData);
      setRounds(roundsData);
      setGolfCourses(coursesData);

      const merged = { ...scoresData };
      Object.keys(finesData).forEach(pid => {
        if (!merged[pid]) merged[pid] = {};
        Object.keys(finesData[pid]).forEach(rid => {
          if (!merged[pid][rid]) merged[pid][rid] = { strokes: 0, fines: 0 };
          merged[pid][rid].fines = finesData[pid][rid];
        });
      });
      setScores(merged);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const currentUser = players.find(p => p.id === currentUserId) || players[0];
  const isReadOnlySeason = activeSeason && !activeSeason.is_active;
  const isAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const isMaster = currentUser?.role === 'master';

  // Refresh fines when leaving fines view
  useEffect(() => {
    const prev = localStorage.getItem('gpga_previous_view');
    if (prev === 'fines' && view !== 'fines') {
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

  // --- Computed ---

  const nextRoundName = useMemo(() => {
    if (rounds.length === 0) return 'Round 1';
    const nums = rounds.map(r => { const m = r.name.match(/Round (\d+)/i); return m ? parseInt(m[1]) : 0; }).filter(n => n > 0);
    return nums.length === 0 ? `Round ${rounds.length + 1}` : `Round ${Math.max(...nums) + 1}`;
  }, [rounds]);

  const leaderboardData = useMemo(() => {
    const totalRoundsCreated = rounds.length;
    return players.map(player => {
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
      const canDropWorstRound = roundsPlayed === totalRoundsCreated && roundsPlayed > 0;
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
  }, [players, scores, rounds]);

  // --- Handlers ---

  const handleLogin = async (user) => { setIsAuthenticated(true); setCurrentUserId(user.id); await loadData(); };
  const handleLogout = () => { DB.logout(); setIsAuthenticated(false); setCurrentUserId('1'); setView('dashboard'); };

  const setNavView = (id) => { setView(id); localStorage.setItem('gpga_current_view', id); };

  const handleSeasonSwitch = async (seasonId) => {
    const season = allSeasons.find(s => s.id === seasonId);
    if (!season) return;
    setActiveSeason(season);
    const [roundsData, scoresData, finesData] = await Promise.all([
      DB.getAllRounds(season.id), DB.getAllScores(), DB.getPlayerFinesByRound()
    ]);
    setRounds(roundsData);
    const merged = { ...scoresData };
    Object.keys(finesData).forEach(pid => {
      if (!merged[pid]) merged[pid] = {};
      Object.keys(finesData[pid]).forEach(rid => {
        if (!merged[pid][rid]) merged[pid][rid] = { strokes: 0, fines: 0 };
        merged[pid][rid].fines = finesData[pid][rid];
      });
    });
    setScores(merged);
  };

  const handleEndSeason = () => {
    const warning = rounds.length < 9
      ? `The season has only completed ${rounds.length} of 9 rounds. Are you sure you want to end it early?\n\nScores, fines, and standings will be locked. This cannot be undone.`
      : 'Scores, fines, and standings will be locked. You can still view the data but cannot make changes. This cannot be undone.';
    showConfirm(`End ${activeSeason.name}?`, warning, async () => {
      await fetch('/api/seasons/' + activeSeason.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
      setActiveSeason(prev => ({ ...prev, is_active: 0 }));
      setAllSeasons(prev => prev.map(s => s.id === activeSeason.id ? { ...s, is_active: 0 } : s));
      showToast(`${activeSeason.name} has ended`, 'success');
    }, 'danger');
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newPlayer = { id: Date.now().toString(), name: fd.get('name'), email: fd.get('email'), role: 'player', status: 'active', avatar: null };
    await DB.addPlayer(newPlayer);
    setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
    setIsAddPlayerModalOpen(false);
    showToast(`Player ${newPlayer.name} added successfully!`);
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    if (!activeSeason) { showToast('No active season found.', 'error'); return; }
    if (!selectedCourse) { showToast('Please select a golf course', 'error'); return; }
    const fd = new FormData(e.target);
    const newRound = { name: fd.get('name'), date: fd.get('date'), courseId: selectedCourse.id, courseName: selectedCourse.name };
    const result = await DB.addRound(newRound, activeSeason.id);
    setRounds(prev => [...prev, { id: result.id, season_id: activeSeason.id, name: newRound.name, date: newRound.date, course_id: newRound.courseId, course_name: newRound.courseName }]);
    setIsAddRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setSelectedDate('');
    showToast(`Round "${newRound.name}" created successfully!`);
  };

  const handleEditRound = (round) => {
    setEditingRound(round);
    setSelectedCourse(golfCourses.find(c => c.id === round.course_id) || null);
    setIsEditRoundModalOpen(true);
  };

  const handleUpdateRoundSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updates = { name: fd.get('name'), date: fd.get('date'), courseId: selectedCourse?.id, courseName: selectedCourse?.name };
    await DB.updateRound(editingRound.id, updates);
    setRounds(prev => prev.map(r => r.id === editingRound.id ? { ...r, name: updates.name || r.name, date: updates.date || r.date, course_id: updates.courseId || r.course_id, course_name: updates.courseName || r.course_name } : r));
    setIsEditRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setEditingRound(null);
    showToast(`Round "${fd.get('name')}" updated successfully!`);
  };

  const handleDeleteRound = (id, name) => {
    showConfirm(`Delete ${name}?`, `This will also delete all scores for this round and cannot be undone.`, async () => {
      await DB.deleteRound(id);
      setRounds(prev => prev.filter(r => r.id !== id));
      showToast(`Round "${name}" deleted successfully!`, 'success');
    }, 'danger');
  };

  const handleAddFineType = async (e) => {
    e.preventDefault();
    if (!activeSeason) { showToast('No active season found.', 'error'); return; }
    const fd = new FormData(e.target);
    await DB.addFineType(activeSeason.id, fd.get('name'), parseInt(fd.get('amount')), fd.get('description'));
    setIsAddFineTypeModalOpen(false);
  };

  const handleDeleteFineType = (id, name) => {
    showConfirm(`Delete Fine Type "${name}"?`, `This will permanently delete this fine type. Any existing fines of this type will remain.`, async () => {
      await DB.deleteFineType(id);
      showToast(`Fine type "${name}" deleted`, 'success');
    }, 'danger');
  };

  // --- Auth/Loading Guards ---

  if (!isAuthenticated && dbReady) return <LoginPage onLogin={handleLogin} />;
  if (!dbReady || !currentUser || players.length === 0) return <div className="min-h-screen bg-slate-100 p-8"><DashboardSkeleton /></div>;

  // --- Nav Config ---

  const navItems = [
    { id: 'dashboard', icon: <TrendingUp size={20} />, label: 'Leaderboard' },
    { id: 'profile', icon: <User size={20} />, label: 'Profile' },
    { id: 'fines', icon: <Banknote size={20} />, label: 'Fines' },
    ...(isAdmin ? [{ id: 'rounds', icon: <Calendar size={20} />, label: 'Rounds' }] : []),
    ...(isMaster ? [{ id: 'admin', icon: <Users size={20} />, label: 'Players' }] : []),
  ];

  const navProps = { view, setNavView, navItems, currentUser, activeSeason, allSeasons, handleSeasonSwitch, handleLogout, isMaster, handleEndSeason, onNewSeason: () => setIsNewSeasonModalOpen(true) };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-100 font-sans overflow-x-hidden">
      <DesktopSidebar {...navProps} />
      <MobileNav {...navProps} />

      <main className="p-4 md:p-8 md:ml-56 pt-20 pb-24 md:pt-8 md:pb-8">
        {view === 'dashboard' && <DashboardView activeSeason={activeSeason} leaderboardData={leaderboardData} rounds={rounds} scores={scores} players={players} />}
        {view === 'fines' && <FinesView leaderboardData={leaderboardData} rounds={rounds} scores={scores} players={players} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} currentUser={currentUser} showToast={showToast} onAddFineType={() => setIsAddFineTypeModalOpen(true)} onDeleteFineType={handleDeleteFineType} />}
        {view === 'rounds' && <RoundsView rounds={rounds} scores={scores} setScores={setScores} players={players} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} showToast={showToast} onAddRound={() => setIsAddRoundModalOpen(true)} onEditRound={handleEditRound} onDeleteRound={handleDeleteRound} />}
        {view === 'admin' && !managingPlayerId && <PlayersView players={players} scores={scores} rounds={rounds} activeSeason={activeSeason} isReadOnlySeason={isReadOnlySeason} currentUser={currentUser} showToast={showToast} showConfirm={showConfirm} setPlayers={setPlayers} onAddPlayer={() => setIsAddPlayerModalOpen(true)} managingPlayerId={managingPlayerId} setManagingPlayerId={setManagingPlayerId} />}
        {view === 'admin' && managingPlayerId && <PlayerProfilePage players={players} setPlayers={setPlayers} scores={scores} rounds={rounds} activeSeason={activeSeason} currentUser={currentUser} managingPlayerId={managingPlayerId} setManagingPlayerId={setManagingPlayerId} showToast={showToast} />}
        {view === 'profile' && <ProfileView currentUser={currentUser} players={players} setPlayers={setPlayers} scores={scores} rounds={rounds} activeSeason={activeSeason} showToast={showToast} />}
      </main>

      {/* --- Modals --- */}

      <Modal isOpen={isAddPlayerModalOpen} onClose={() => setIsAddPlayerModalOpen(false)} title="Add New Player">
        <form onSubmit={handleAddPlayer} className="space-y-4">
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Full Name <span className="text-error">*</span></span></label><input required name="name" className="input input-bordered w-full focus:input-primary" placeholder="e.g. Tiger Woods" /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Email Address <span className="text-error">*</span></span></label><input required name="email" type="email" className="input input-bordered w-full focus:input-primary" placeholder="tiger@golf.com" /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Password <span className="text-error">*</span></span></label><input required name="password" type="password" className="input input-bordered w-full focus:input-primary" placeholder="Enter password" minLength="6" /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Role</span></label><select name="role" className="select select-bordered w-full pr-10" defaultValue="player"><option value="player">Player</option><option value="admin">Admin</option></select></div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><Plus size={18} /> Create Player</button>
        </form>
      </Modal>

      <Modal isOpen={isAddRoundModalOpen} onClose={() => { setIsAddRoundModalOpen(false); setSelectedCourse(null); setSearchTerm(''); setSelectedDate(''); }} title="Add New Round">
        <form onSubmit={handleAddRound} className="space-y-4">
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Round Name</span></label><input required name="name" defaultValue={nextRoundName} className="input input-bordered w-full focus:input-primary" placeholder="e.g. Round 7" /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Date</span></label><DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Select round date" /><input type="hidden" name="date" value={selectedDate} required /></div>
          <CourseSelector courses={golfCourses} selected={selectedCourse} onSelect={setSelectedCourse} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <input type="hidden" name="course" value={selectedCourse?.name || ''} required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2" disabled={!selectedCourse}><Plus size={18} /> Create Round</button>
        </form>
      </Modal>

      <Modal isOpen={isEditRoundModalOpen} onClose={() => { setIsEditRoundModalOpen(false); setEditingRound(null); setSelectedCourse(null); setSearchTerm(''); }} title="Edit Round">
        {editingRound && (
          <form onSubmit={handleUpdateRoundSubmit} className="space-y-4">
            <div className="form-control"><label className="label"><span className="label-text font-semibold">Round Name</span></label><input required name="name" defaultValue={editingRound.name} className="input input-bordered w-full focus:input-primary" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-semibold">Date</span></label><input required name="date" type="date" defaultValue={editingRound.date} className="input input-bordered w-full focus:input-primary [color-scheme:light]" /></div>
            <CourseSelector courses={golfCourses} selected={selectedCourse} onSelect={setSelectedCourse} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <input type="hidden" name="course" value={selectedCourse?.name || editingRound.course} required />
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><Save size={18} /> Update Round</button>
          </form>
        )}
      </Modal>

      <Modal isOpen={isAddFineTypeModalOpen} onClose={() => setIsAddFineTypeModalOpen(false)} title="Add Fine Type">
        <form onSubmit={handleAddFineType} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Fine Name</label><input required name="name" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 3 Putt, Lost Ball, etc." /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Amount (R)</label><input required name="amount" type="number" min="0" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 20" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label><textarea name="description" rows="3" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Optional description..." /></div>
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">Create Fine Type</button>
        </form>
      </Modal>

      <Modal isOpen={isNewSeasonModalOpen} onClose={() => setIsNewSeasonModalOpen(false)} title="Create New Season">
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await DB.createSeason(Number(fd.get('year')), fd.get('name'), Number(fd.get('buyIn'))); await loadData(); setIsNewSeasonModalOpen(false); showToast(`${fd.get('name')} created!`, 'success'); }} className="space-y-4">
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Year</span></label><input name="year" type="number" defaultValue={new Date().getFullYear() + 1} className="input input-bordered" required /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Season Name</span></label><input name="name" type="text" defaultValue={`GPGA ${new Date().getFullYear() + 1} Season`} className="input input-bordered" required /></div>
          <div className="form-control"><label className="label"><span className="label-text font-semibold">Buy-in Amount (R)</span></label><input name="buyIn" type="number" defaultValue={2500} className="input input-bordered" required /></div>
          <div className="alert alert-warning text-sm">Creating a new season will deactivate the current one.</div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsNewSeasonModalOpen(false)} className="btn">Cancel</button>
            <button type="submit" className="btn bg-emerald-600 text-white hover:bg-emerald-700 border-0">Create Season</button>
          </div>
        </form>
      </Modal>

      {toast.show && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            <span className="font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}

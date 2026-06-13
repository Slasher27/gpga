import { useState, useEffect, type KeyboardEvent } from 'react';
import { Plus, Trash2, ChevronDown, Edit, Save, X } from 'lucide-react';
import type { Player, Round, Season, ScoresMapFull } from '../api';
import { TabBar, Card, EmptyRow, formatDate, SubmitButton } from './common';
import { useFines, calcFineTotal, type EditableFineType } from '../hooks/useFines';

interface FinancesViewProps {
	rounds: Round[];
	scores: ScoresMapFull;
	players: Player[];
	activeSeason: Season | null;
	isReadOnlySeason: boolean;
	currentUser: Player;
	showToast: (msg: string, type?: string) => void;
	onAddFineType: () => void;
	onDeleteFineType: (id: number, name: string) => void;
	onFinesChanged: () => void;
	fineTypesVersion?: number;
}

export default function FinancesView({
	rounds,
	players,
	activeSeason,
	isReadOnlySeason,
	currentUser,
	showToast,
	onAddFineType,
	onDeleteFineType,
	onFinesChanged,
	fineTypesVersion = 0,
}: FinancesViewProps) {
	const isAdmin = currentUser.role === 'master' || currentUser.role === 'admin';
	const mostRecentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
	const mostRecentRoundId = mostRecentRound?.id;

	// --- UI state (data lives in useFines) ---
	const [finesTab, setFinesTab] = useState(() =>
		isAdmin ? 'assign' : 'history',
	);
	const [selectedRound, setSelectedRound] = useState<number | null>(
		mostRecentRound?.id || null,
	);
	const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
	const [roundViewPlayerFilter, setRoundViewPlayerFilter] = useState('all');
	const [expandedRoundViewPlayers, setExpandedRoundViewPlayers] = useState<Record<string, boolean>>({});
	const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});
	const [editingFineType, setEditingFineType] = useState<EditableFineType | null>(null);
	const [showOpenFine, setShowOpenFine] = useState(false);
	const [openFineName, setOpenFineName] = useState('');
	const [openFineAmount, setOpenFineAmount] = useState('');
	const [confirmBusy, setConfirmBusy] = useState(false);
	const [paidBusyKey, setPaidBusyKey] = useState<string | null>(null);

	// --- Data layer ---
	const fines = useFines({
		activeSeason,
		selectedPlayer,
		selectedRound,
		fineTypesVersion,
		onFinesChanged,
		showToast,
	});
	const {
		fineTypes,
		playerFines,
		isRoundConfirmed,
		roundFinesData,
		paymentSummaryData,
		playerRoundFinesCache,
		buyInStatuses,
	} = fines;

	// Default selection to the newest round whenever a new latest round appears
	// (won't fight the user picking an older round — that doesn't change the id).
	useEffect(() => {
		if (mostRecentRoundId != null) setSelectedRound(mostRecentRoundId);
	}, [mostRecentRoundId]);

	useEffect(() => {
		setExpandedPlayers({});
	}, [activeSeason]);

	const handleSaveFineType = async () => {
		if (!editingFineType) return;
		await fines.saveFineType(editingFineType);
		setEditingFineType(null);
	};

	const handleAddOpenFine = async () => {
		await fines.addOpenFine(openFineName, openFineAmount);
		setOpenFineName('');
		setOpenFineAmount('');
		setShowOpenFine(false);
	};

	// Enter/Space activation for non-button interactive disclosure rows.
	const onKeyActivate = (fn: () => void) => (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	};

	const playerFinesTotal = playerFines.reduce(
		(sum, f) =>
			sum +
			calcFineTotal(f.quantity, f.amount, f.tier_threshold, f.tier_amount),
		0,
	);
	const buyInAmount = activeSeason?.buy_in_amount || 2500;
	const paidBuyIns = Object.values(buyInStatuses).filter(
		(s) => s.isPaid,
	).length;
	const totalBuyInPool = paidBuyIns * buyInAmount;
	const finesPaid = paymentSummaryData.reduce(
		(sum, p) => sum + p.paid_fines,
		0,
	);
	const finesOutstanding = paymentSummaryData.reduce(
		(sum, p) => sum + p.unpaid_fines,
		0,
	);

	// --- Tabs ---
	const tabs: { id: string; label: string }[] = [];
	if (!isReadOnlySeason && isAdmin)
		tabs.push(
			{ id: 'assign', label: 'Start Fines' },
			{ id: 'types', label: 'Fine Sheet' },
		);
	tabs.push(
		{ id: 'history', label: 'History' },
		{ id: 'payments', label: 'Payments' },
	);

	return (
		<div className='space-y-4 animate-in fade-in duration-300'>
			<div className='flex items-center justify-between h-10'>
				<h2 className='text-xl font-bold text-slate-800'>Finances</h2>
			</div>

			{/* --- Financial Dashboard --- */}
			<div className='grid grid-cols-2 gap-3'>
				<div className='bg-emerald-50 rounded-xl p-4 text-center'>
					<p className='text-[10px] text-emerald-600 uppercase font-medium'>
						Buy-In Pool
					</p>
					<p className='text-xl font-bold text-emerald-700 mt-1'>
						R{totalBuyInPool.toLocaleString()}
					</p>
					<p className='text-xs text-emerald-500 mt-0.5'>
						{paidBuyIns}/{players.length} paid
					</p>
				</div>
				<div className='bg-red-50 rounded-xl p-4 text-center'>
					<p className='text-[10px] text-red-500 uppercase font-medium'>
						Fines Pot
					</p>
					<p className='text-xl font-bold text-red-700 mt-1'>
						R{finesPaid.toLocaleString()}
					</p>
					{finesOutstanding > 0 && (
						<p className='text-xs text-red-400 mt-0.5'>
							R{finesOutstanding.toLocaleString()} outstanding
						</p>
					)}
				</div>
			</div>

			{/* --- Tabs --- */}
			<TabBar tabs={tabs} active={finesTab} onChange={setFinesTab} />

			{/* === Start Fines Tab === */}
			{isAdmin && finesTab === 'assign' && (
				<Card>
					<div className='p-4 space-y-4'>
						{/* Round + Player selectors */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							<div>
								<label htmlFor='fines-assign-round' className='sr-only'>
									Select round
								</label>
								<select
									id='fines-assign-round'
									value={selectedRound || ''}
									onChange={(e) => setSelectedRound(parseInt(e.target.value))}
									className='select select-bordered w-full min-h-[44px]'
								>
									<option value=''>Select Round</option>
									{rounds.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name} — {r.course_name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label htmlFor='fines-assign-player' className='sr-only'>
									Select player
								</label>
								<select
									id='fines-assign-player'
									value={selectedPlayer || ''}
									onChange={(e) => setSelectedPlayer(e.target.value)}
									className='select select-bordered w-full min-h-[44px]'
								>
									<option value=''>Select Player</option>
									{players
										.filter((p) => p.status === 'active')
										.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
								</select>
							</div>
						</div>

						{selectedPlayer && selectedRound ? (
							<>
								<div className='flex justify-between items-center pt-2 border-t border-slate-100'>
									<div className='flex items-center gap-2'>
										<p className='text-sm font-semibold text-slate-700'>
											{players.find((p) => p.id === selectedPlayer)?.name}
										</p>
										<button
											type='button'
											onClick={() => setSelectedPlayer(null)}
											className='p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors'
											aria-label='Close'
										>
											<X size={14} />
										</button>
									</div>
									<p className='font-bold text-red-600'>R{playerFinesTotal}</p>
								</div>

								{/* Confirmed banner */}
								{isRoundConfirmed && (
									<div className='bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-center'>
										<p className='text-sm font-semibold text-slate-600'>
											Fines confirmed — reopen to edit
										</p>
									</div>
								)}

								{/* Standard fines */}
								<div
									className={`space-y-1.5 max-h-[50vh] overflow-y-auto ${isRoundConfirmed ? 'opacity-50 pointer-events-none' : ''}`}
								>
									{fineTypes
										.filter((ft) => !ft.is_open)
										.map((ft) => {
											const qty =
												playerFines.find((pf) => pf.fine_type_id === ft.id)
													?.quantity || 0;
											const rowTotal = calcFineTotal(
												qty,
												ft.amount,
												ft.tier_threshold,
												ft.tier_amount,
											);
											const hasTier = Number(ft.tier_threshold) > 0;
											return (
												<div
													key={ft.id}
													className='flex items-center gap-2 p-2 bg-slate-50 rounded-lg'
												>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-medium text-slate-700 truncate'>
															{ft.name}
														</p>
														<p className='text-[10px] text-slate-400'>
															R{ft.amount}
															{hasTier && (
																<>
																	{' '}
																	· R{ft.tier_amount} after {ft.tier_threshold}
																</>
															)}
														</p>
													</div>
													<button
														type='button'
														onClick={() => fines.removeFine(ft.id)}
														disabled={qty === 0}
														className='w-11 h-11 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 transition-colors font-bold min-h-[44px]'
													>
														-
													</button>
													<span className='w-6 text-center font-bold text-sm text-slate-800'>
														{qty}
													</span>
													<button
														type='button'
														onClick={() => fines.addFine(ft.id)}
														className='w-11 h-11 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors font-bold min-h-[44px]'
													>
														+
													</button>
													<span className='w-14 text-right text-sm font-semibold text-slate-600'>
														R{rowTotal}
													</span>
												</div>
											);
										})}

									{/* Open fines already assigned */}
									{fineTypes
										.filter((ft) => ft.is_open)
										.map((ft) => {
											const qty =
												playerFines.find((pf) => pf.fine_type_id === ft.id)
													?.quantity || 0;
											if (qty === 0) return null;
											const rowTotal = calcFineTotal(
												qty,
												ft.amount,
												ft.tier_threshold,
												ft.tier_amount,
											);
											return (
												<div
													key={ft.id}
													className='flex items-center gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100'
												>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-medium text-slate-700 truncate'>
															{ft.name}{' '}
															<span className='text-[10px] text-slate-400'>
																open
															</span>
														</p>
														<p className='text-[10px] text-slate-400'>
															R{ft.amount}
														</p>
													</div>
													<button
														type='button'
														onClick={() => fines.removeFine(ft.id)}
														className='w-11 h-11 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-bold min-h-[44px]'
													>
														-
													</button>
													<span className='w-6 text-center font-bold text-sm text-slate-800'>
														{qty}
													</span>
													<button
														type='button'
														onClick={() => fines.addFine(ft.id)}
														className='w-11 h-11 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors font-bold min-h-[44px]'
													>
														+
													</button>
													<span className='w-14 text-right text-sm font-semibold text-slate-600'>
														R{rowTotal}
													</span>
												</div>
											);
										})}
								</div>

								{/* Open Fine form — only when not confirmed */}
								{!isRoundConfirmed &&
									(showOpenFine ? (
										<div className='flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200'>
											<label htmlFor='open-fine-name' className='sr-only'>
												Fine name
											</label>
											<input
												id='open-fine-name'
												name='open-fine-name'
												value={openFineName}
												onChange={(e) => setOpenFineName(e.target.value)}
												placeholder='Fine name'
												className='input input-bordered input-sm w-full sm:flex-1 min-h-[40px]'
												autoComplete='off'
											/>
											<div className='flex items-center gap-2'>
												<label htmlFor='open-fine-amount' className='sr-only'>
													Fine amount
												</label>
												<input
													id='open-fine-amount'
													name='open-fine-amount'
													type='number'
													value={openFineAmount}
													onChange={(e) => setOpenFineAmount(e.target.value)}
													placeholder='R'
													min='1'
													className='input input-bordered input-sm w-20 min-h-[40px]'
													autoComplete='off'
												/>
												<button
													type='button'
													onClick={handleAddOpenFine}
													disabled={!openFineName.trim() || !openFineAmount}
													className='flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-30 min-h-[40px]'
												>
													Add
												</button>
												<button
													type='button'
													onClick={() => {
														setShowOpenFine(false);
														setOpenFineName('');
														setOpenFineAmount('');
													}}
													className='p-2 rounded-lg text-slate-400 hover:bg-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center flex-shrink-0'
													aria-label='Cancel open fine'
												>
													<X size={16} />
												</button>
											</div>
										</div>
									) : (
										<button
											type='button'
											onClick={() => setShowOpenFine(true)}
											className='text-sm text-emerald-600 font-semibold hover:text-emerald-700 min-h-[44px]'
										>
											+ Open Fine
										</button>
									))}

								{/* Confirm / Reopen */}
								<div className='pt-3 border-t border-slate-100 flex items-center gap-3'>
									<SubmitButton
										type='button'
										pending={confirmBusy}
										pendingLabel={isRoundConfirmed ? 'Reopening…' : 'Confirming…'}
										onClick={async () => {
											setConfirmBusy(true);
											try {
												await fines.toggleRoundConfirmed();
											} finally {
												setConfirmBusy(false);
											}
										}}
										className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-60 ${
											isRoundConfirmed
												? 'bg-slate-500 text-white hover:bg-slate-600'
												: 'bg-emerald-600 text-white hover:bg-emerald-700'
										}`}
									>
										{isRoundConfirmed ? 'Reopen' : 'Confirm'}
									</SubmitButton>
									{isRoundConfirmed && (
										<span className='text-xs text-slate-500 font-medium'>
											Confirmed
										</span>
									)}
								</div>
							</>
						) : (
							<EmptyRow>Select a round and player to start fines</EmptyRow>
						)}
					</div>
				</Card>
			)}

			{/* === Fine Sheet Tab (with inline edit) === */}
			{isAdmin && finesTab === 'types' && (
				<div className='space-y-3'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-slate-500'>
							{fineTypes.filter((ft) => !ft.is_open).length} fines
						</p>
						<button
							type='button'
							onClick={onAddFineType}
							className='bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm min-h-[44px]'
						>
							<Plus size={16} /> Add Fine
						</button>
					</div>
					<Card>
						<div className='divide-y divide-slate-50'>
							{fineTypes.filter((ft) => !ft.is_open).length === 0 ? (
								<EmptyRow>No fines on the sheet yet</EmptyRow>
							) : (
								fineTypes
									.filter((ft) => !ft.is_open)
									.map((ft) => (
										<div key={ft.id} className='flex items-center gap-3 p-3'>
											{editingFineType?.id === ft.id ? (
												<>
													<div className='flex-1 flex flex-wrap gap-2'>
														<input
															id='edit-ft-order'
															name='sort_order'
															aria-label='Sort order'
															type='number'
															value={editingFineType.sort_order}
															onChange={(e) =>
																setEditingFineType((prev) => prev && ({
																	...prev,
																	sort_order: Number(e.target.value),
																}))
															}
															className='input input-bordered input-sm w-14 min-h-[36px] text-center'
															min='0'
															placeholder='#'
															autoComplete='off'
														/>
														<input
															id='edit-ft-name'
															name='fine_name'
															aria-label='Fine name'
															value={editingFineType.name}
															onChange={(e) =>
																setEditingFineType((prev) => prev && ({
																	...prev,
																	name: e.target.value,
																}))
															}
															className='input input-bordered input-sm flex-1 min-w-[120px] min-h-[36px]'
															autoComplete='off'
														/>
														<input
															id='edit-ft-amount'
															name='fine_amount'
															aria-label='Fine amount'
															type='number'
															value={editingFineType.amount}
															onChange={(e) =>
																setEditingFineType((prev) => prev && ({
																	...prev,
																	amount: Number(e.target.value),
																}))
															}
															className='input input-bordered input-sm w-20 min-h-[36px]'
															min='0'
															autoComplete='off'
														/>
														<input
															id='edit-ft-description'
															name='fine_description'
															aria-label='Fine description'
															value={editingFineType.description || ''}
															onChange={(e) =>
																setEditingFineType((prev) => prev && ({
																	...prev,
																	description: e.target.value,
																}))
															}
															className='input input-bordered input-sm w-full min-h-[36px]'
															placeholder='Description (optional)'
															autoComplete='off'
														/>
														<div className='flex items-center gap-2 w-full'>
															<span className='text-[10px] text-slate-400 uppercase font-medium'>
																Tier
															</span>
															<input
																id='edit-ft-tier-threshold'
																name='tier_threshold'
																aria-label='Tier threshold'
																type='number'
																value={editingFineType.tier_threshold || 0}
																onChange={(e) =>
																	setEditingFineType((prev) => prev && ({
																		...prev,
																		tier_threshold: Number(e.target.value),
																	}))
																}
																className='input input-bordered input-sm w-16 min-h-[36px] text-center'
																min='0'
																placeholder='after'
																autoComplete='off'
															/>
															<span className='text-[10px] text-slate-400'>
																then R
															</span>
															<input
																id='edit-ft-tier-amount'
																name='tier_amount'
																aria-label='Tier amount'
																type='number'
																value={editingFineType.tier_amount || 0}
																onChange={(e) =>
																	setEditingFineType((prev) => prev && ({
																		...prev,
																		tier_amount: Number(e.target.value),
																	}))
																}
																className='input input-bordered input-sm w-20 min-h-[36px]'
																min='0'
																autoComplete='off'
															/>
															<span className='text-[10px] text-slate-400'>
																each
															</span>
														</div>
													</div>
													<button
														type='button'
														onClick={handleSaveFineType}
														aria-label='Save fine type'
														className='p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 min-h-[36px] min-w-[36px] flex items-center justify-center'
													>
														<Save size={16} />
													</button>
													<button
														type='button'
														onClick={() => setEditingFineType(null)}
														aria-label='Cancel edit'
														className='p-2 rounded-lg text-slate-400 hover:bg-slate-100 min-h-[36px] min-w-[36px] flex items-center justify-center'
													>
														<X size={16} />
													</button>
												</>
											) : (
												<>
													<span className='text-xs text-slate-400 w-6 text-center flex-shrink-0'>
														{ft.sort_order || 0}
													</span>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-medium text-slate-800 truncate'>
															{ft.name}
														</p>
														{ft.description && (
															<p className='text-[10px] text-slate-400 truncate'>
																{ft.description}
															</p>
														)}
														{Number(ft.tier_threshold) > 0 && (
															<p className='text-[10px] text-emerald-600 truncate'>
																R{ft.tier_amount} each after {ft.tier_threshold}
															</p>
														)}
													</div>
													<span className='text-sm font-bold text-red-600 flex-shrink-0'>
														R{ft.amount}
													</span>
													<button
														type='button'
														onClick={() =>
															setEditingFineType({
																id: ft.id,
																name: ft.name,
																amount: ft.amount,
																sort_order: ft.sort_order || 0,
																description: ft.description || '',
																tier_threshold: Number(ft.tier_threshold) || 0,
																tier_amount: Number(ft.tier_amount) || 0,
															})
														}
														aria-label='Edit fine type'
														className='p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0'
													>
														<Edit size={16} />
													</button>
													<button
														type='button'
														onClick={() => onDeleteFineType(ft.id, ft.name)}
														aria-label='Delete fine type'
														className='p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0'
													>
														<Trash2 size={16} />
													</button>
												</>
											)}
										</div>
									))
							)}
						</div>
					</Card>
				</div>
			)}

			{/* === History Tab === */}
			{finesTab === 'history' && (
				<Card>
					<div className='p-4 border-b border-slate-100 bg-slate-50'>
						<h3 className='font-semibold text-slate-800'>Fines History</h3>
						<p className='text-xs text-slate-500 mt-1'>
							Round-by-round fines breakdown
						</p>
					</div>
					<div className='p-4 space-y-4'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							<div>
								<label htmlFor='fines-history-round' className='sr-only'>
									Select round
								</label>
								<select
									id='fines-history-round'
									value={selectedRound || ''}
									onChange={(e) => setSelectedRound(parseInt(e.target.value))}
									className='select select-bordered w-full min-h-[44px]'
								>
									<option value=''>Select Round</option>
									{rounds.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name} ({formatDate(r.date)})
										</option>
									))}
								</select>
							</div>
							<div>
								<label htmlFor='fines-history-player' className='sr-only'>
									Filter by player
								</label>
								<select
									id='fines-history-player'
									value={roundViewPlayerFilter}
									onChange={(e) => setRoundViewPlayerFilter(e.target.value)}
									className='select select-bordered w-full min-h-[44px]'
								>
									<option value='all'>All Players</option>
									{players
										.filter((p) => p.status === 'active')
										.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
								</select>
							</div>
						</div>

						{selectedRound ? (
							(() => {
								if (roundFinesData.length === 0)
									return (
										<EmptyRow>No fines recorded for this round</EmptyRow>
									);
								type SummaryRow = { player_id: string; player_name: string; total_amount: number };
								type FineDetail = { name: string; quantity: number; amount: number; total: number };
								const playerSummary: Record<string, SummaryRow> = {},
									playerFineDetails: Record<string, FineDetail[]> = {};
								roundFinesData.forEach((f) => {
									if (!playerSummary[f.player_id]) {
										playerSummary[f.player_id] = {
											player_id: f.player_id,
											player_name: f.player_name,
											total_amount: 0,
										};
										playerFineDetails[f.player_id] = [];
									}
									const total = calcFineTotal(
										f.quantity,
										f.amount,
										f.tier_threshold,
										f.tier_amount,
									);
									playerSummary[f.player_id].total_amount += total;
									playerFineDetails[f.player_id].push({
										name: f.name,
										quantity: f.quantity,
										amount: f.amount,
										total,
									});
								});
								let arr = Object.values(playerSummary);
								if (roundViewPlayerFilter !== 'all')
									arr = arr.filter(
										(s) => s.player_id === roundViewPlayerFilter,
									);
								if (arr.length === 0)
									return (
										<EmptyRow>No fines for selected player</EmptyRow>
									);
								arr.sort((a, b) => b.total_amount - a.total_amount);

								return (
									<div className='space-y-3'>
										{arr.map((s, idx) => {
											const expanded = expandedRoundViewPlayers[s.player_id];
											return (
												<div
													key={s.player_id}
													className='border border-slate-200 rounded-lg overflow-hidden'
												>
													<div
														role='button'
														tabIndex={0}
														aria-label='Toggle fines breakdown'
														className='p-4 bg-white cursor-pointer hover:bg-slate-50'
														onClick={() =>
															setExpandedRoundViewPlayers((prev) => ({
																...prev,
																[s.player_id]: !expanded,
															}))
														}
														onKeyDown={onKeyActivate(() =>
															setExpandedRoundViewPlayers((prev) => ({
																...prev,
																[s.player_id]: !expanded,
															}))
														)}
													>
														<div className='flex items-center justify-between'>
															<div className='flex items-center gap-3 flex-1'>
																<ChevronDown
																	size={18}
																	className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
																/>
																<span
																	className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}
																>
																	{idx + 1}
																</span>
																<div className='flex-1 min-w-0'>
																	<p className='font-semibold text-slate-800 text-sm truncate'>
																		{s.player_name}
																	</p>
																</div>
															</div>
															<p className='font-bold text-red-600 text-sm'>
																R{s.total_amount.toLocaleString()}
															</p>
														</div>
													</div>
													{expanded && (
														<div className='bg-slate-50 border-t border-slate-200 p-4 space-y-2'>
															{playerFineDetails[s.player_id].map((f, i) => (
																<div
																	key={i}
																	className='flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200'
																>
																	<div>
																		<p className='text-sm font-medium text-slate-700'>
																			{f.name}
																		</p>
																		<p className='text-xs text-slate-500'>
																			{f.quantity} x R{f.amount}
																		</p>
																	</div>
																	<p className='text-sm font-bold text-red-600'>
																		R{f.total.toLocaleString()}
																	</p>
																</div>
															))}
														</div>
													)}
												</div>
											);
										})}
									</div>
								);
							})()
						) : (
							<EmptyRow>Select a round to view fines</EmptyRow>
						)}
					</div>
				</Card>
			)}

			{/* === Payments Tab === */}
			{finesTab === 'payments' && (
				<Card>
					<div className='p-4 border-b border-slate-100 bg-slate-50'>
						<h3 className='font-semibold text-slate-800'>Payment Tracking</h3>
						<p className='text-xs text-slate-500 mt-1'>
							Click a player to expand round details
						</p>
					</div>
					<div className='divide-y divide-slate-100'>
						{paymentSummaryData.length === 0 ? (
							<EmptyRow>No payment data for this season</EmptyRow>
						) : (
							paymentSummaryData.map((summary, idx) => {
								const playerRounds =
									playerRoundFinesCache[summary.player_id] || [];
								const isExpanded = expandedPlayers[summary.player_id];
								return (
									<div key={summary.player_id} className='hover:bg-slate-50'>
										<div
											role='button'
											tabIndex={0}
											aria-label='Toggle payment details'
											className='p-4 cursor-pointer select-none'
											onClick={async () => {
												if (!isExpanded)
													await fines.loadPlayerRoundFines(summary.player_id);
												setExpandedPlayers((prev) => ({
													...prev,
													[summary.player_id]: !isExpanded,
												}));
											}}
											onKeyDown={onKeyActivate(async () => {
												if (!isExpanded)
													await fines.loadPlayerRoundFines(summary.player_id);
												setExpandedPlayers((prev) => ({
													...prev,
													[summary.player_id]: !isExpanded,
												}));
											})}
										>
											<div className='flex items-center justify-between mb-3'>
												<div className='flex items-center gap-3'>
													<ChevronDown
														size={18}
														className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
													/>
													<div
														className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
															summary.payment_percentage === 100
																? 'bg-emerald-100 text-emerald-700'
																: summary.payment_percentage >= 50
																	? 'bg-slate-200 text-slate-700'
																	: 'bg-red-100 text-red-700'
														}`}
													>
														{idx + 1}
													</div>
													<div>
														<p className='font-semibold text-slate-800 text-sm'>
															{summary.player_name}
														</p>
														<p className='text-xs text-slate-500'>
															{summary.payment_percentage}% paid
														</p>
													</div>
												</div>
												<div className='text-right text-sm'>
													<p className='font-bold text-emerald-600'>
														R{summary.paid_fines.toLocaleString()}
													</p>
													<p className='font-bold text-red-600'>
														R{summary.unpaid_fines.toLocaleString()}
													</p>
												</div>
											</div>
											<div className='ml-9'>
												<div className='w-full bg-slate-200 rounded-full h-4 overflow-hidden flex'>
													{summary.paid_fines > 0 && (
														<div
															className='bg-emerald-500 h-full transition-all'
															style={{
																width: `${summary.payment_percentage}%`,
															}}
														/>
													)}
													{summary.unpaid_fines > 0 && (
														<div
															className='bg-red-500 h-full transition-all'
															style={{
																width: `${100 - summary.payment_percentage}%`,
															}}
														/>
													)}
												</div>
											</div>
										</div>

										{isExpanded && playerRounds.length > 0 && (
											<div className='px-4 pb-4 bg-slate-50/50'>
												<div className='ml-9 space-y-2'>
													{playerRounds.map((round) => (
														<div
															key={round.round_id}
															className='flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg'
														>
															<div className='flex items-center gap-3 flex-1'>
																<div
																	className={`w-2.5 h-2.5 rounded-full ${round.paid ? 'bg-emerald-500' : 'bg-red-500'}`}
																/>
																<div>
																	<p className='text-sm font-medium text-slate-700'>
																		{round.round_name}
																	</p>
																	<p className='text-xs text-slate-500'>
																		{round.round_date}
																	</p>
																</div>
															</div>
															<div className='flex items-center gap-3'>
																<span className='text-sm font-bold text-slate-800'>
																	R{round.total_amount.toLocaleString()}
																</span>
																{isAdmin ? (
																	<SubmitButton
																		type='button'
																		pending={paidBusyKey === `${summary.player_id}-${round.round_id}`}
																		onClick={async (e) => {
																			e.stopPropagation();
																			const key = `${summary.player_id}-${round.round_id}`;
																			setPaidBusyKey(key);
																			try {
																				await fines.togglePlayerRoundPaid(
																					summary.player_id,
																					round.round_id,
																					round.round_name,
																					!round.paid,
																				);
																			} finally {
																				setPaidBusyKey(null);
																			}
																		}}
																		className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
																			round.paid
																				? 'bg-emerald-600 text-white hover:bg-emerald-700'
																				: 'bg-red-600 text-white hover:bg-red-700'
																		}`}
																	>
																		{round.paid ? 'Paid' : 'Mark Paid'}
																	</SubmitButton>
																) : (
																	<span
																		className={`px-3 py-1.5 rounded-lg text-xs font-medium ${round.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
																	>
																		{round.paid ? 'Paid' : 'Unpaid'}
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
							})
						)}
					</div>
				</Card>
			)}
		</div>
	);
}

import { useState, useEffect, useRef, useCallback } from 'react';
import * as DB from '../api';
import type {
  Season,
  FineType,
  PlayerFine,
  RoundFine,
  PaymentSummary,
  PlayerRoundFineRow,
} from '../api';

// Tiered fine total: first N units at base amount, remainder at tier_amount.
// Mirrors FINE_TOTAL_SQL in server/routes/fines.ts — keep in sync.
export function calcFineTotal(
  quantity: number | undefined,
  amount: number | undefined,
  tierThreshold: number = 0,
  tierAmount: number = 0
): number {
  const qty = Number(quantity) || 0;
  const base = Number(amount) || 0;
  const threshold = Number(tierThreshold) || 0;
  const tier = Number(tierAmount) || 0;
  if (threshold > 0 && qty > threshold) {
    return threshold * base + (qty - threshold) * tier;
  }
  return qty * base;
}

type BuyInCache = Record<string, { isPaid: boolean | number; date: string | null }>;
type PlayerRoundFinesCache = Record<string, PlayerRoundFineRow[]>;
type ShowToast = (msg: string, type?: string) => void;

// The fields the inline Fine Sheet editor can change (subset of FineType).
export interface EditableFineType {
  id: number;
  name: string;
  amount: number;
  sort_order: number;
  description: string;
  tier_threshold: number;
  tier_amount: number;
}

interface UseFinesArgs {
  activeSeason: Season | null;
  selectedPlayer: string | null;
  selectedRound: number | null;
  fineTypesVersion: number;
  onFinesChanged?: () => void;
  showToast?: ShowToast;
}

export function useFines({
  activeSeason,
  selectedPlayer,
  selectedRound,
  fineTypesVersion,
  onFinesChanged,
  showToast,
}: UseFinesArgs) {
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [playerFines, setPlayerFines] = useState<PlayerFine[]>([]);
  const [isRoundConfirmed, setIsRoundConfirmed] = useState(false);
  const [roundFinesData, setRoundFinesData] = useState<RoundFine[]>([]);
  const [paymentSummaryData, setPaymentSummaryData] = useState<PaymentSummary[]>([]);
  const [playerRoundFinesCache, setPlayerRoundFinesCache] = useState<PlayerRoundFinesCache>({});
  const [buyInStatuses, setBuyInStatuses] = useState<BuyInCache>({});

  // Load fine types + buy-in statuses when season changes or a new fine type is added/removed.
  useEffect(() => {
    if (!activeSeason) return;
    DB.getFineTypes(activeSeason.id).then(setFineTypes);
    DB.getSeasonPlayers(activeSeason.id).then((sp) => {
      const cache: BuyInCache = {};
      for (const p of sp) cache[p.player_id] = { isPaid: p.buy_in_paid, date: p.buy_in_date };
      setBuyInStatuses(cache);
    });
  }, [activeSeason, fineTypesVersion]);

  // Load the selected player's fines + confirmed state for the selected round
  // (one effect, fetched in parallel; guarded against out-of-order resolves).
  useEffect(() => {
    if (!selectedPlayer || !selectedRound) {
      setPlayerFines([]);
      setIsRoundConfirmed(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      DB.getPlayerFinesForRound(selectedPlayer, selectedRound),
      DB.isPlayerRoundConfirmed(selectedPlayer, selectedRound),
    ]).then(([fines, confirmed]) => {
      if (cancelled) return;
      setPlayerFines(fines);
      setIsRoundConfirmed(confirmed);
    });
    return () => { cancelled = true; };
  }, [selectedPlayer, selectedRound]);

  // Load round-level fines data for the History tab (guarded so a slow
  // response for a previous round can't overwrite the current one).
  useEffect(() => {
    if (!selectedRound) return;
    let cancelled = false;
    DB.getRoundFines(selectedRound).then((d) => { if (!cancelled) setRoundFinesData(d); });
    return () => { cancelled = true; };
  }, [selectedRound]);

  // Load payment summary when season changes; reset per-player cache too.
  useEffect(() => {
    if (activeSeason) DB.getPaymentSummary(activeSeason.id).then(setPaymentSummaryData);
    setPlayerRoundFinesCache({});
  }, [activeSeason]);

  // Debounced refresh of derived data after a mutation.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDerived = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      if (activeSeason) DB.getPaymentSummary(activeSeason.id).then(setPaymentSummaryData);
      if (selectedRound) DB.getRoundFines(selectedRound).then(setRoundFinesData);
      onFinesChanged?.();
    }, 500);
  }, [activeSeason, selectedRound, onFinesChanged]);

  // Cancel any pending debounced refresh if the hook unmounts.
  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  // ---- Mutations ----

  // Synchronous mirror of playerFines for the +/− mutations. Two quick taps
  // before a re-render would both read the same render-captured state and send
  // the same quantity, losing a fine — the ref always holds the latest value.
  const playerFinesRef = useRef(playerFines);
  useEffect(() => { playerFinesRef.current = playerFines; }, [playerFines]);

  const addFine = useCallback(async (fineTypeId: number) => {
    if (!selectedPlayer || !selectedRound) return;
    const snapshot = playerFinesRef.current;
    const existing = snapshot.find((pf) => pf.fine_type_id === fineTypeId);
    const newQty = (existing?.quantity || 0) + 1;
    const ft = fineTypes.find((f) => f.id === fineTypeId);
    const next = existing
      ? snapshot.map((pf) => pf.fine_type_id === fineTypeId ? { ...pf, quantity: newQty } : pf)
      : [...snapshot, {
          fine_type_id: fineTypeId,
          quantity: 1,
          amount: ft?.amount || 0,
          tier_threshold: ft?.tier_threshold || 0,
          tier_amount: ft?.tier_amount || 0,
          name: ft?.name || ''
        } as PlayerFine];
    playerFinesRef.current = next;
    setPlayerFines(next);
    try {
      await DB.setPlayerFine(selectedPlayer, selectedRound, fineTypeId, newQty);
      refreshDerived();
    } catch {
      playerFinesRef.current = snapshot;
      setPlayerFines(snapshot);
      showToast?.('Could not save fine — not recorded', 'error');
    }
  }, [selectedPlayer, selectedRound, fineTypes, refreshDerived, showToast]);

  const removeFine = useCallback(async (fineTypeId: number) => {
    if (!selectedPlayer || !selectedRound) return;
    const snapshot = playerFinesRef.current;
    const existing = snapshot.find((pf) => pf.fine_type_id === fineTypeId);
    if (!existing || existing.quantity <= 0) return;
    const newQty = existing.quantity - 1;
    const next = snapshot
      .map((pf) => pf.fine_type_id === fineTypeId ? { ...pf, quantity: newQty } : pf)
      .filter((pf) => pf.quantity > 0);
    playerFinesRef.current = next;
    setPlayerFines(next);
    try {
      await DB.setPlayerFine(selectedPlayer, selectedRound, fineTypeId, newQty);
      refreshDerived();
    } catch {
      playerFinesRef.current = snapshot;
      setPlayerFines(snapshot);
      showToast?.('Could not update fine — not recorded', 'error');
    }
  }, [selectedPlayer, selectedRound, refreshDerived, showToast]);

  const addOpenFine = useCallback(async (name: string, amount: string | number) => {
    if (!name.trim() || !amount || !activeSeason || !selectedPlayer || !selectedRound) return;
    const parsed = typeof amount === 'number' ? amount : parseInt(amount);
    if (parsed <= 0) return;
    const result = await DB.addFineType(activeSeason.id, name.trim(), parsed, '', 999, true);
    await DB.addPlayerFine(selectedPlayer, selectedRound, result.id);
    setFineTypes((prev) => [...prev, { id: result.id, season_id: activeSeason.id, name: name.trim(), amount: parsed, is_open: 1, sort_order: 999 } as FineType]);
    setPlayerFines(await DB.getPlayerFinesForRound(selectedPlayer, selectedRound));
    refreshDerived();
    showToast?.(`Open fine "${name.trim()}" added`);
  }, [activeSeason, selectedPlayer, selectedRound, refreshDerived, showToast]);

  const saveFineType = useCallback(async (edited: EditableFineType) => {
    if (!edited) return;
    await DB.updateFineType(edited.id, {
      name: edited.name,
      amount: edited.amount,
      sort_order: edited.sort_order,
      description: edited.description,
      tier_threshold: edited.tier_threshold || 0,
      tier_amount: edited.tier_amount || 0,
    });
    setFineTypes((prev) => prev
      .map((ft) => ft.id === edited.id ? { ...ft, ...edited } : ft)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name))
    );
    showToast?.('Fine type updated');
  }, [showToast]);

  const toggleRoundConfirmed = useCallback(async () => {
    if (!selectedPlayer || !selectedRound) return;
    const next = !isRoundConfirmed;
    try {
      await DB.confirmPlayerRoundFines(selectedPlayer, selectedRound, next);
      setIsRoundConfirmed(next);
      showToast?.(next ? 'Fines confirmed!' : 'Fines reopened', next ? 'success' : 'info');
    } catch {
      showToast?.('Could not update — try again when back online', 'error');
    }
  }, [selectedPlayer, selectedRound, isRoundConfirmed, showToast]);

  const loadPlayerRoundFines = useCallback(async (playerId: string) => {
    if (playerRoundFinesCache[playerId]) return playerRoundFinesCache[playerId];
    const data = await DB.getPlayerRoundFines(playerId, activeSeason?.id);
    setPlayerRoundFinesCache((prev) => ({ ...prev, [playerId]: data }));
    return data;
  }, [activeSeason, playerRoundFinesCache]);

  const togglePlayerRoundPaid = useCallback(async (playerId: string, roundId: number, roundName: string, nextPaid: boolean) => {
    try {
      await DB.markRoundFinesPaid(playerId, roundId, nextPaid);
      const updated = await DB.getPlayerRoundFines(playerId, activeSeason?.id);
      setPlayerRoundFinesCache((prev) => ({ ...prev, [playerId]: updated }));
      DB.getPaymentSummary(activeSeason?.id).then(setPaymentSummaryData);
      showToast?.(`${roundName} marked as ${nextPaid ? 'paid' : 'unpaid'}`, nextPaid ? 'success' : 'info');
    } catch {
      showToast?.('Could not update payment — try again when back online', 'error');
    }
  }, [activeSeason, showToast]);

  return {
    fineTypes,
    playerFines,
    isRoundConfirmed,
    roundFinesData,
    paymentSummaryData,
    playerRoundFinesCache,
    buyInStatuses,
    addFine,
    removeFine,
    addOpenFine,
    saveFineType,
    toggleRoundConfirmed,
    loadPlayerRoundFines,
    togglePlayerRoundPaid,
  };
}

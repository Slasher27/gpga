// Frontend API client — talks to the Express/Turso backend via /api

const BASE = '/api';
const TOKEN_KEY = 'gpga_token';

// A season is 9 rounds; best 8 count for individual comps (medal & stableford).
// Shared so the rule lives in one place (App leaderboard, Dashboard progress).
export const SEASON_ROUNDS = 9;

// ============================================================================
// Types
// ============================================================================

export type Role = 'master' | 'admin' | 'player';
export type Status = 'active' | 'inactive';

export interface Player {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  avatar: string | null;
  notify_email?: number;
  notify_push?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuthedPlayer extends Omit<Player, 'avatar'> {
  avatar?: string | null;
  token: string;
}

export interface Season {
  id: number;
  year: number;
  name: string;
  buy_in_amount: number;
  medal_1st: number;
  medal_2nd: number;
  stableford_1st: number;
  stableford_2nd: number;
  team_1st: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface Round {
  id: number;
  season_id: number;
  name: string;
  date: string;
  course_id: number;
  course_name: string;
  tee_time?: string | null;
  tee_time_2?: string | null;
  closed?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Score {
  strokes: number;
  handicap: number;
  stableford: number;
}

export type ScoresMap = Record<string, Record<number, Score>>;

// The app merges per-round fines into the scores map (App.mergeScoresAndFines),
// so cells carry an optional `fines` and fields may be absent.
export type ScoreCell = { strokes?: number; handicap?: number; stableford?: number; fines?: number };
export type ScoresMapFull = Record<string, Record<number, ScoreCell>>;

// A leaderboard row = a player plus the standings computed in App.
export interface LeaderboardEntry extends Player {
  totalStrokes: number;
  totalStableford: number;
  netTotal: number;
  netStableford: number;
  worstRound: number;
  worstStableford: number;
  totalFines: number;
  roundsPlayed: number;
  roundsMissed: number;
  isDisqualified: boolean;
  canDropWorstRound: boolean;
  pScores: Record<number, ScoreCell>;
}

export interface GolfCourse {
  id: number;
  name: string;
  location: string;
  par: number;
}

export interface FineType {
  id: number;
  season_id: number;
  name: string;
  amount: number;
  description?: string;
  sort_order?: number;
  is_open?: number;
  tier_threshold?: number;
  tier_amount?: number;
}

export interface PlayerFine {
  id?: number;
  player_id?: string;
  round_id?: number;
  fine_type_id: number;
  name?: string;
  amount: number;
  quantity: number;
  paid?: number;
  tier_threshold?: number;
  tier_amount?: number;
}

export interface RoundFine {
  id: number;
  player_id: string;
  player_name: string;
  round_id: number;
  fine_type_id: number;
  name: string;
  amount: number;
  quantity: number;
  paid: number;
  paid_date?: string | null;
  confirmed: number;
  confirmed_date?: string | null;
  tier_threshold?: number;
  tier_amount?: number;
  created_at?: string;
}

export type FinesByRound = Record<string, Record<number, number>>;

export interface PaymentSummary {
  player_id: string;
  player_name: string;
  total_fines: number;
  paid_fines: number;
  unpaid_fines: number;
  payment_percentage: number;
}

export interface PlayerRoundFineRow {
  round_id: number;
  round_name: string;
  round_date: string;
  total_amount: number;
  paid: boolean;
  confirmed: boolean;
}

export interface FinesSummary {
  total_fines: number;
  paid_fines: number;
  outstanding_fines: number;
  confirmed_rounds: number;
  total_rounds_with_fines: number;
}

export interface SeasonPlayer {
  player_id: string;
  name: string;
  email: string;
  buy_in_paid: boolean;
  buy_in_date: string | null;
}

export interface BuyInStatus {
  isPaid: boolean;
  date: string | null;
}

export interface Team {
  id: number;
  season_id: number;
  name: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
}

export interface Notification {
  id: number;
  player_id: string;
  type: string;
  title: string;
  body: string;
  round_id?: number | null;
  read: number;
  created_at: string;
}

export interface IdResult { id: number }
export interface OkResult { ok: boolean }

export interface PlayerUpdate {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  status?: Status;
  avatar?: string | null;
  notify_email?: number;
  notify_push?: number;
}

export interface RoundUpdate {
  name?: string;
  date?: string;
  courseId?: number;
  courseName?: string;
  teeTime?: string | null;
  teeTime2?: string | null;
}

export interface FineTypeUpdate {
  name?: string;
  amount?: number;
  description?: string;
  sort_order?: number;
  tier_threshold?: number;
  tier_amount?: number;
}

export interface SeasonPrizes {
  medal_1st?: number;
  medal_2nd?: number;
  stableford_1st?: number;
  stableford_2nd?: number;
  team_1st?: number;
}

export interface SeasonUpdate extends SeasonPrizes {
  year?: number;
  name?: string;
  buy_in_amount?: number;
  is_active?: boolean | number;
}

// ============================================================================
// Token + request helpers
// ============================================================================

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.headers) Object.assign(headers, options.headers as Record<string, string>);
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fail fast on a dead/patchy connection instead of hanging forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out — check your connection');
    }
    throw new Error('Network unavailable — check your connection');
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem('gpga_authenticated');
    localStorage.removeItem('gpga_current_user');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.reload();
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// Players
// ============================================================================

export async function getAllPlayers(): Promise<Player[]> {
  return request<Player[]>('/players');
}

export async function addPlayer(player: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  status: Status;
  avatar: string | null;
}): Promise<OkResult> {
  return request<OkResult>('/players', { method: 'POST', body: JSON.stringify(player) });
}

export async function updatePlayer(id: string, updates: PlayerUpdate): Promise<OkResult> {
  return request<OkResult>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deletePlayer(id: string): Promise<OkResult> {
  return request<OkResult>(`/players/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Seasons
// ============================================================================

export async function getActiveSeason(): Promise<Season | null> {
  return request<Season | null>('/seasons/active');
}

export async function getAllSeasons(): Promise<Season[]> {
  return request<Season[]>('/seasons');
}

export async function createSeason(
  year: number,
  name: string,
  buyInAmount: number,
  prizes?: SeasonPrizes
): Promise<IdResult> {
  return request<IdResult>('/seasons', {
    method: 'POST',
    body: JSON.stringify({ year, name, buy_in_amount: buyInAmount, is_active: true, ...prizes }),
  });
}

export async function updateSeason(id: number, updates: SeasonUpdate): Promise<OkResult> {
  return request<OkResult>(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

// ============================================================================
// Rounds
// ============================================================================

export async function getAllRounds(seasonId?: number | null): Promise<Round[]> {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<Round[]>(`/rounds${qs}`);
}

export async function addRound(
  round: { name: string; date: string; courseId: number; courseName: string; teeTime?: string; teeTime2?: string },
  seasonId: number
): Promise<IdResult> {
  return request<IdResult>('/rounds', {
    method: 'POST',
    body: JSON.stringify({
      season_id: seasonId,
      name: round.name,
      date: round.date,
      course_id: round.courseId,
      course_name: round.courseName,
      tee_time: round.teeTime || null,
      tee_time_2: round.teeTime2 || null,
    }),
  });
}

export async function updateRound(id: number, updates: RoundUpdate): Promise<OkResult> {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.date !== undefined) body.date = updates.date;
  if (updates.courseId !== undefined) body.course_id = updates.courseId;
  if (updates.courseName !== undefined) body.course_name = updates.courseName;
  if (updates.teeTime !== undefined) body.tee_time = updates.teeTime;
  if (updates.teeTime2 !== undefined) body.tee_time_2 = updates.teeTime2;
  return request<OkResult>(`/rounds/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteRound(id: number): Promise<OkResult> {
  return request<OkResult>(`/rounds/${id}`, { method: 'DELETE' });
}

export async function closeRound(id: number): Promise<OkResult> {
  return request<OkResult>(`/rounds/${id}/close`, { method: 'PUT' });
}

// ============================================================================
// Scores
// ============================================================================

export async function getAllScores(): Promise<ScoresMap> {
  return request<ScoresMap>('/scores');
}

export async function updateScore(
  playerId: string,
  roundId: number,
  strokes: number,
  handicap: number = 0,
  stableford: number = 0
): Promise<OkResult> {
  return request<OkResult>('/scores', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, strokes, handicap, stableford }),
  });
}

// ============================================================================
// Golf Courses
// ============================================================================

export async function getAllGolfCourses(): Promise<GolfCourse[]> {
  return request<GolfCourse[]>('/courses');
}

// ============================================================================
// Fine Types
// ============================================================================

export async function getFineTypes(seasonId: number): Promise<FineType[]> {
  return request<FineType[]>(`/fines/types?season_id=${seasonId}`);
}

export async function addFineType(
  seasonId: number,
  name: string,
  amount: number,
  description: string = '',
  sortOrder: number = 0,
  isOpen: boolean = false,
  tierThreshold: number = 0,
  tierAmount: number = 0
): Promise<IdResult> {
  return request<IdResult>('/fines/types', {
    method: 'POST',
    body: JSON.stringify({
      season_id: seasonId,
      name,
      amount,
      description,
      sort_order: sortOrder,
      is_open: isOpen,
      tier_threshold: tierThreshold,
      tier_amount: tierAmount,
    }),
  });
}

export async function updateFineType(id: number, updates: FineTypeUpdate): Promise<OkResult> {
  return request<OkResult>(`/fines/types/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteFineType(id: number): Promise<OkResult> {
  return request<OkResult>(`/fines/types/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Player Fines
// ============================================================================

export async function getPlayerFinesForRound(playerId: string, roundId: number): Promise<PlayerFine[]> {
  return request<PlayerFine[]>(`/fines/player/${playerId}/round/${roundId}`);
}

export async function getPlayerFinesByRound(): Promise<FinesByRound> {
  return request<FinesByRound>('/fines/by-round');
}

export async function getRoundFines(roundId: number): Promise<RoundFine[]> {
  return request<RoundFine[]>(`/fines/round/${roundId}`);
}

export async function setPlayerFine(
  playerId: string,
  roundId: number,
  fineTypeId: number,
  quantity: number
): Promise<OkResult> {
  return request<OkResult>('/fines/set', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, fine_type_id: fineTypeId, quantity }),
  });
}

export async function addPlayerFine(playerId: string, roundId: number, fineTypeId: number): Promise<OkResult | undefined> {
  const fines = await getPlayerFinesForRound(playerId, roundId);
  const existing = fines.find((f) => f.fine_type_id === fineTypeId);
  const currentQty = existing ? existing.quantity : 0;
  return setPlayerFine(playerId, roundId, fineTypeId, currentQty + 1);
}

export async function removePlayerFine(playerId: string, roundId: number, fineTypeId: number): Promise<OkResult | undefined> {
  const fines = await getPlayerFinesForRound(playerId, roundId);
  const existing = fines.find((f) => f.fine_type_id === fineTypeId);
  if (!existing) return;
  return setPlayerFine(playerId, roundId, fineTypeId, existing.quantity - 1);
}

export async function markRoundFinesPaid(playerId: string, roundId: number, paid: boolean): Promise<OkResult> {
  return request<OkResult>('/fines/pay-round', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, paid }),
  });
}

export async function confirmPlayerRoundFines(playerId: string, roundId: number, confirmed: boolean): Promise<OkResult> {
  return request<OkResult>('/fines/confirm', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, confirmed }),
  });
}

export async function isPlayerRoundConfirmed(playerId: string, roundId: number): Promise<boolean> {
  const data = await request<{ confirmed: boolean }>(`/fines/confirmed/${playerId}/${roundId}`);
  return data.confirmed;
}

export async function getPaymentSummary(seasonId?: number): Promise<PaymentSummary[]> {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<PaymentSummary[]>(`/fines/payment-summary${qs}`);
}

export async function getPlayerRoundFines(playerId: string, seasonId?: number): Promise<PlayerRoundFineRow[]> {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<PlayerRoundFineRow[]>(`/fines/player/${playerId}/rounds${qs}`);
}

export async function getPlayerFinesSummary(playerId: string, seasonId?: number): Promise<FinesSummary> {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<FinesSummary>(`/fines/player/${playerId}/summary${qs}`);
}

// ============================================================================
// Season Players / Buy-In
// ============================================================================

export async function getSeasonPlayers(seasonId: number): Promise<SeasonPlayer[]> {
  return request<SeasonPlayer[]>(`/buy-in/season/${seasonId}`);
}

export async function addSeasonPlayer(seasonId: number, playerId: string): Promise<OkResult> {
  return request<OkResult>(`/buy-in/season/${seasonId}/player`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  });
}

export async function removeSeasonPlayer(seasonId: number, playerId: string): Promise<OkResult> {
  return request<OkResult>(`/buy-in/season/${seasonId}/player/${playerId}`, { method: 'DELETE' });
}

export async function getPlayerBuyInStatus(playerId: string, seasonId: number): Promise<BuyInStatus> {
  return request<BuyInStatus>(`/buy-in/${playerId}/${seasonId}`);
}

export async function markBuyInPaid(playerId: string, seasonId: number, paid: boolean): Promise<OkResult> {
  return request<OkResult>('/buy-in', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, season_id: seasonId, paid }),
  });
}

// ============================================================================
// Teams
// ============================================================================

export async function getTeams(seasonId: number): Promise<Team[]> {
  return request<Team[]>(`/teams?season_id=${seasonId}`);
}

export async function createTeam(
  seasonId: number,
  name: string,
  player1Id: string,
  player2Id: string
): Promise<IdResult> {
  return request<IdResult>('/teams', {
    method: 'POST',
    body: JSON.stringify({ season_id: seasonId, name, player1_id: player1Id, player2_id: player2Id }),
  });
}

export async function updateTeam(
  id: number,
  updates: { name?: string; player1_id?: string; player2_id?: string }
): Promise<OkResult> {
  return request<OkResult>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteTeam(id: number): Promise<OkResult> {
  return request<OkResult>(`/teams/${id}`, { method: 'DELETE' });
}


// ============================================================================
// Notifications
// ============================================================================

// The server derives the player from the auth token, so these need no player id.
export async function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/notifications');
}

export async function markNotificationRead(id: number): Promise<OkResult> {
  return request<OkResult>(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(): Promise<OkResult> {
  return request<OkResult>('/notifications/read-all', { method: 'PUT' });
}

export async function clearReadNotifications(): Promise<OkResult> {
  return request<OkResult>('/notifications/clear-read', { method: 'DELETE' });
}

export async function checkNotifications(seasonId: number): Promise<{ count: number }> {
  return request<{ count: number }>(`/notifications/check?season_id=${seasonId}`);
}

// ============================================================================
// Push
// ============================================================================

export async function subscribePush(playerId: string, subscription: PushSubscription): Promise<OkResult> {
  return request<OkResult>('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, subscription: subscription.toJSON() }),
  });
}

export async function unsubscribePush(endpoint: string): Promise<OkResult> {
  return request<OkResult>('/push/unsubscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
}

// ============================================================================
// Auth
// ============================================================================

export async function authenticateUser(email: string, password: string): Promise<AuthedPlayer | null> {
  try {
    const user = await request<AuthedPlayer>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (user?.token) setToken(user.token);
    return user;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken() && localStorage.getItem('gpga_authenticated') === 'true';
}

export function setAuthenticated(value: boolean): void {
  localStorage.setItem('gpga_authenticated', value.toString());
}

export function getCurrentUserId(): string {
  return localStorage.getItem('gpga_current_user') || '1';
}

export function setCurrentUserId(id: string): void {
  localStorage.setItem('gpga_current_user', id);
}

export function logout(): void {
  clearToken();
  localStorage.removeItem('gpga_authenticated');
  localStorage.removeItem('gpga_current_user');
}

export async function initDatabase(): Promise<void> {
  /* server handles DB init */
}

export function resetDatabase(): void {
  logout();
  window.location.reload();
}

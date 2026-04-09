// Frontend API client — replaces direct sql.js database calls
// All functions mirror the old db.ts exports so AppOld.jsx can swap with minimal changes

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ---- Players ----

export async function getAllPlayers() {
  return request<any[]>('/players');
}

export async function addPlayer(player: { id: string; name: string; email: string; password?: string; role: string; status: string; avatar: string | null }) {
  return request('/players', { method: 'POST', body: JSON.stringify(player) });
}

export async function updatePlayer(id: string, updates: Record<string, any>) {
  return request(`/players/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deletePlayer(id: string) {
  return request(`/players/${id}`, { method: 'DELETE' });
}

// ---- Seasons ----

export async function getActiveSeason() {
  return request<any | null>('/seasons/active');
}

export async function getAllSeasons() {
  return request<any[]>('/seasons');
}

// ---- Rounds ----

export async function getAllRounds(seasonId?: number | null) {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<any[]>(`/rounds${qs}`);
}

export async function addRound(round: { name: string; date: string; courseId: number; courseName: string; teeTime?: string; teeTime2?: string }, seasonId: number) {
  return request<{ id: number }>('/rounds', {
    method: 'POST',
    body: JSON.stringify({ season_id: seasonId, name: round.name, date: round.date, course_id: round.courseId, course_name: round.courseName, tee_time: round.teeTime || null, tee_time_2: round.teeTime2 || null })
  });
}

export async function updateRound(id: number, updates: { name?: string; date?: string; courseId?: number; courseName?: string; teeTime?: string; teeTime2?: string }) {
  const body: Record<string, any> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.date !== undefined) body.date = updates.date;
  if (updates.courseId !== undefined) body.course_id = updates.courseId;
  if (updates.courseName !== undefined) body.course_name = updates.courseName;
  if (updates.teeTime !== undefined) body.tee_time = updates.teeTime;
  if (updates.teeTime2 !== undefined) body.tee_time_2 = updates.teeTime2;
  return request(`/rounds/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteRound(id: number) {
  return request(`/rounds/${id}`, { method: 'DELETE' });
}

export async function closeRound(id: number) {
  return request(`/rounds/${id}/close`, { method: 'PUT' });
}

// ---- Scores ----

export async function getAllScores() {
  return request<Record<string, Record<number, { strokes: number; handicap: number; stableford: number }>>>('/scores');
}

export async function updateScore(playerId: string, roundId: number, strokes: number, handicap: number = 0, stableford: number = 0) {
  return request('/scores', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, strokes, handicap, stableford })
  });
}

// ---- Golf Courses ----

export async function getAllGolfCourses() {
  return request<any[]>('/courses');
}

// ---- Fine Types ----

export async function getFineTypes(seasonId: number) {
  return request<any[]>(`/fines/types?season_id=${seasonId}`);
}

export async function addFineType(seasonId: number, name: string, amount: number, description: string = '', sortOrder: number = 0, isOpen: boolean = false) {
  return request<{ id: number }>('/fines/types', {
    method: 'POST',
    body: JSON.stringify({ season_id: seasonId, name, amount, description, sort_order: sortOrder, is_open: isOpen })
  });
}

export async function updateFineType(id: number, updates: { name?: string; amount?: number; sort_order?: number }) {
  return request(`/fines/types/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteFineType(id: number) {
  return request(`/fines/types/${id}`, { method: 'DELETE' });
}

// ---- Player Fines ----

export async function getPlayerFinesForRound(playerId: string, roundId: number) {
  return request<any[]>(`/fines/player/${playerId}/round/${roundId}`);
}

export async function getPlayerFinesByRound() {
  return request<Record<string, Record<number, number>>>('/fines/by-round');
}

export async function getRoundFines(roundId: number) {
  return request<any[]>(`/fines/round/${roundId}`);
}

export async function setPlayerFine(playerId: string, roundId: number, fineTypeId: number, quantity: number) {
  return request('/fines/set', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, fine_type_id: fineTypeId, quantity })
  });
}

export async function addPlayerFine(playerId: string, roundId: number, fineTypeId: number) {
  // Get current fines then increment
  const fines = await getPlayerFinesForRound(playerId, roundId);
  const existing = fines.find((f: any) => f.fine_type_id === fineTypeId);
  const currentQty = existing ? existing.quantity : 0;
  return setPlayerFine(playerId, roundId, fineTypeId, currentQty + 1);
}

export async function removePlayerFine(playerId: string, roundId: number, fineTypeId: number) {
  const fines = await getPlayerFinesForRound(playerId, roundId);
  const existing = fines.find((f: any) => f.fine_type_id === fineTypeId);
  if (!existing) return;
  return setPlayerFine(playerId, roundId, fineTypeId, existing.quantity - 1);
}

export async function markRoundFinesPaid(playerId: string, roundId: number, paid: boolean) {
  return request('/fines/pay-round', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, paid })
  });
}

export async function confirmPlayerRoundFines(playerId: string, roundId: number, confirmed: boolean) {
  return request('/fines/confirm', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, round_id: roundId, confirmed })
  });
}

export async function isPlayerRoundConfirmed(playerId: string, roundId: number) {
  const data = await request<{ confirmed: boolean }>(`/fines/confirmed/${playerId}/${roundId}`);
  return data.confirmed;
}

export async function getPaymentSummary(seasonId?: number) {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<any[]>(`/fines/payment-summary${qs}`);
}

export async function getPlayerRoundFines(playerId: string, seasonId?: number) {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<any[]>(`/fines/player/${playerId}/rounds${qs}`);
}

export async function getPlayerFinesSummary(playerId: string, seasonId?: number) {
  const qs = seasonId ? `?season_id=${seasonId}` : '';
  return request<any>(`/fines/player/${playerId}/summary${qs}`);
}

// ---- Season Players ----

export async function getSeasonPlayers(seasonId: number) {
  return request<any[]>(`/buy-in/season/${seasonId}`);
}

export async function addSeasonPlayer(seasonId: number, playerId: string) {
  return request('/buy-in/season/' + seasonId + '/player', { method: 'POST', body: JSON.stringify({ player_id: playerId }) });
}

export async function removeSeasonPlayer(seasonId: number, playerId: string) {
  return request(`/buy-in/season/${seasonId}/player/${playerId}`, { method: 'DELETE' });
}

// ---- Buy-In ----

export async function getPlayerBuyInStatus(playerId: string, seasonId: number) {
  return request<{ isPaid: boolean; date: string | null }>(`/buy-in/${playerId}/${seasonId}`);
}

export async function markBuyInPaid(playerId: string, seasonId: number, paid: boolean) {
  return request('/buy-in', {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId, season_id: seasonId, paid })
  });
}

// ---- Teams ----

export async function getTeams(seasonId: number) {
  return request<any[]>(`/teams?season_id=${seasonId}`);
}

export async function createTeam(seasonId: number, name: string, player1Id: string, player2Id: string) {
  return request<{ id: number }>('/teams', {
    method: 'POST',
    body: JSON.stringify({ season_id: seasonId, name, player1_id: player1Id, player2_id: player2Id })
  });
}

export async function updateTeam(id: number, updates: { name?: string; player1_id?: string; player2_id?: string }) {
  return request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteTeam(id: number) {
  return request(`/teams/${id}`, { method: 'DELETE' });
}

// ---- Seasons (create) ----

export async function createSeason(year: number, name: string, buyInAmount: number, prizes?: { medal_1st?: number; medal_2nd?: number; stableford_1st?: number; stableford_2nd?: number; team_1st?: number }) {
  return request<{ id: number }>('/seasons', {
    method: 'POST',
    body: JSON.stringify({ year, name, buy_in_amount: buyInAmount, is_active: true, ...prizes })
  });
}

export async function updateSeason(id: number, updates: Record<string, any>) {
  return request(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

// ---- Notifications ----

export async function getNotifications(playerId: string) {
  return request<any[]>(`/notifications?player_id=${playerId}`);
}

export async function getUnreadCount(playerId: string) {
  return request<{ count: number }>(`/notifications/unread-count?player_id=${playerId}`);
}

export async function markNotificationRead(id: number) {
  return request(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(playerId: string) {
  return request(`/notifications/read-all?player_id=${playerId}`, { method: 'PUT' });
}

export async function clearReadNotifications(playerId: string) {
  return request(`/notifications/clear-read?player_id=${playerId}`, { method: 'DELETE' });
}

export async function checkNotifications(playerId: string, seasonId: number) {
  return request<{ count: number }>(`/notifications/check?player_id=${playerId}&season_id=${seasonId}`);
}

// ---- Push ----

export async function subscribePush(playerId: string, subscription: PushSubscription) {
  return request('/push/subscribe', { method: 'POST', body: JSON.stringify({ player_id: playerId, subscription: subscription.toJSON() }) });
}

export async function unsubscribePush(endpoint: string) {
  return request('/push/unsubscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
}

// ---- Auth ----

export async function authenticateUser(email: string, password: string) {
  try {
    return await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  } catch {
    return null;
  }
}

// Auth state helpers (still use localStorage for session)
export function isAuthenticated(): boolean {
  return localStorage.getItem('gpga_authenticated') === 'true';
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
  localStorage.removeItem('gpga_authenticated');
  localStorage.removeItem('gpga_current_user');
}

// No-op replacements for functions that no longer apply
export async function initDatabase() { /* server handles DB init */ }
export function resetDatabase() {
  localStorage.removeItem('gpga_authenticated');
  localStorage.removeItem('gpga_current_user');
  window.location.reload();
}

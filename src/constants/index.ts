export const VIEWS = {
  DASHBOARD: 'dashboard',
  FINES: 'fines',
  ROUNDS: 'rounds',
  PROFILE: 'profile',
  PLAYERS: 'players',
  CREATE_ROUND: 'create-round'
} as const;

export type ViewKey = typeof VIEWS[keyof typeof VIEWS];

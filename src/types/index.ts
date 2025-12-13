// ========================================
// DATABASE MODELS
// ========================================

export interface Player {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'master' | 'admin' | 'player';
  status: 'active' | 'inactive';
  avatar: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Season {
  id: number;
  year: number;
  name: string;
  buy_in_amount: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface GolfCourse {
  id: number;
  name: string;
  location: string;
  par: number;
  created_at?: string;
}

export interface Round {
  id: number;
  season_id: number;
  name: string;
  date: string;
  course_id: number;
  course_name: string;
  course?: string; // Backwards compatibility
  created_at?: string;
  updated_at?: string;
}

export interface Score {
  strokes: number;
  handicap: number;
  stableford: number;
}

export interface ScoreRecord extends Score {
  id: number;
  player_id: string;
  round_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface FineType {
  id: number;
  season_id: number;
  name: string;
  amount: number;
  description: string;
  created_at?: string;
}

export interface PlayerFine {
  id: number;
  player_id: string;
  round_id: number;
  fine_type_id: number;
  quantity: number;
  paid: number;
  paid_date?: string;
  confirmed: number;
  confirmed_date?: string;
  created_at?: string;
}

export interface PlayerFineWithDetails extends PlayerFine {
  name: string;
  amount: number;
  player_name?: string;
}

export interface SeasonPlayer {
  id: number;
  season_id: number;
  player_id: string;
  buy_in_paid: number;
  buy_in_date: string | null;
}

// ========================================
// COMPUTED/DERIVED TYPES
// ========================================

export type PlayerScores = Record<string, Record<number, Score>>;
export type PlayerFines = Record<string, Record<number, number>>;

export interface LeaderboardPlayer {
  id: string;
  name: string;
  totalStrokes: number;
  netScore: number;
  totalFines: number;
  roundsPlayed: number;
  worstRound: number | null;
  avatar: string | null;
  status: 'active' | 'inactive';
}

// ========================================
// FORM/UPDATE TYPES
// ========================================

export interface PlayerUpdate {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'player';
  status?: 'active' | 'inactive';
  avatar?: string | null;
}

export interface RoundUpdate {
  name?: string;
  date?: string;
  courseId?: number;
  courseName?: string;
}

export interface FineTypeUpdate {
  name?: string;
  amount?: number;
  description?: string;
}

export interface NewPlayer {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'player';
  status: 'active' | 'inactive';
  avatar: string | null;
}

export interface NewRound {
  name: string;
  date: string;
  courseId: number;
  courseName: string;
}

// ========================================
// AUTH TYPES
// ========================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'player';
  status: 'active' | 'inactive';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// ========================================
// COMPONENT PROPS TYPES
// ========================================

export interface BadgeProps {
  children: React.ReactNode;
  type?: 'neutral' | 'success' | 'danger' | 'warning';
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

// ========================================
// THEME TYPES
// ========================================

export type Theme = 'emerald' | 'forest';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// ========================================
// DATABASE CONTEXT TYPES
// ========================================

export interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
  reloadData: () => Promise<void>;
}

// ========================================
// AUTH CONTEXT TYPES
// ========================================

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

// ========================================
// TOAST TYPES
// ========================================

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

// ========================================
// VIEW TYPES
// ========================================

export type ViewType = 'dashboard' | 'fines' | 'rounds' | 'profile' | 'players' | 'create-round';
export type ViewKey = 'dashboard' | 'fines' | 'rounds' | 'profile' | 'players';

// ========================================
// SQL.JS TYPES
// ========================================

export interface Database {
  exec(sql: string, params?: any[]): QueryExecResult[];
  run(sql: string, params?: any[]): void;
  export(): Uint8Array;
  close(): void;
}

export interface QueryExecResult {
  columns: string[];
  values: any[][];
}

export interface SqlJsStatic {
  Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
}

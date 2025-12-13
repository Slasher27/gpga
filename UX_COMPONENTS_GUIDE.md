# 🎨 UX Components Usage Guide

## Components Created

✅ **LoadingSkeleton** - Animated loading placeholders
✅ **ConfirmDialog** - Confirmation modals for destructive actions
✅ **EmptyState** - Helpful messages when no data exists

---

## 1️⃣ LoadingSkeleton Component

### Purpose
Show animated placeholders while data is loading to improve perceived performance.

### Types Available
- `text` - Text line skeletons
- `card` - Card layout skeletons
- `table` - Table row skeletons
- `avatar` - Circle avatar skeletons
- `button` - Button skeletons

### Basic Usage

```typescript
import { LoadingSkeleton, DashboardSkeleton } from '../components/common';

// Simple text skeleton
<LoadingSkeleton type="text" count={3} />

// Table skeleton
<LoadingSkeleton type="table" count={5} />

// Pre-built dashboard skeleton
<DashboardSkeleton />
```

### Integration Example

```typescript
// In AppOld.jsx - Show loading while database initializes
{!dbReady ? (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
    <div className="w-full max-w-6xl">
      <DashboardSkeleton />
    </div>
  </div>
) : (
  // ... actual content
)}
```

### Replace Loading Spinner

**Before:**
```jsx
{!dbReady && (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2"></div>
    <p>Loading database...</p>
  </div>
)}
```

**After:**
```tsx
{!dbReady && <DashboardSkeleton />}
```

---

## 2️⃣ ConfirmDialog Component

### Purpose
Prevent accidental destructive actions with user-friendly confirmation modals.

### Features
- 3 types: `danger`, `warning`, `info`
- Custom icons
- Customizable button text
- Easy-to-use hook

### Basic Usage

```typescript
import { useConfirm } from '../components/common';

function MyComponent() {
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const handleDelete = () => {
    confirm(
      'Delete Round?',
      'This will permanently delete all scores for this round. This action cannot be undone.',
      () => {
        // Actual delete logic here
        DB.deleteRound(roundId);
        loadData();
      },
      'danger'
    );
  };

  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      <ConfirmDialogComponent />
    </>
  );
}
```

### Integration Examples

#### Delete Round Confirmation
```typescript
const handleDeleteRound = (roundId: number, roundName: string) => {
  confirm(
    `Delete ${roundName}?`,
    'This will permanently delete this round and all associated scores. This action cannot be undone.',
    () => {
      DB.deleteRound(roundId);
      loadData();
      showToast('Round deleted successfully', 'success');
    },
    'danger'
  );
};
```

#### Delete Player Confirmation
```typescript
const handleDeletePlayer = (playerId: string, playerName: string) => {
  confirm(
    `Remove ${playerName}?`,
    'This will remove the player and all their scores, fines, and history. This action cannot be undone.',
    () => {
      DB.deletePlayer(playerId);
      loadData();
      showToast('Player removed', 'success');
    },
    'danger'
  );
};
```

#### Reset Database Confirmation
```typescript
const handleResetDatabase = () => {
  confirm(
    'Reset All Data?',
    'This will wipe all players, rounds, scores, and fines. The database will be reset to default seed data. This action cannot be undone.',
    () => {
      DB.resetDatabase();
    },
    'danger'
  );
};
```

---

## 3️⃣ EmptyState Component

### Purpose
Guide users when sections have no data, with helpful messages and call-to-action buttons.

### Pre-built Components
- `NoPlayersEmptyState`
- `NoRoundsEmptyState`
- `NoScoresEmptyState`
- `NoFinesEmptyState`
- `NoSearchResultsEmptyState`

### Basic Usage

```typescript
import { NoRoundsEmptyState, NoPlayersEmptyState } from '../components/common';

// Show when no rounds exist
{rounds.length === 0 && (
  <NoRoundsEmptyState onAddRound={() => setIsAddRoundModalOpen(true)} />
)}

// Show when no players exist
{players.length === 0 && (
  <NoPlayersEmptyState onAddPlayer={() => setIsAddPlayerModalOpen(true)} />
)}
```

### Custom Empty State

```typescript
import { EmptyState } from '../components/common';

<EmptyState
  icon={<Trophy size={64} className="text-emerald-300" />}
  title="No Leaderboard Data"
  description="Scores will appear here once players complete rounds."
  actionLabel="View Rounds"
  onAction={() => setView('rounds')}
  type="scores"
/>
```

### Integration Examples

#### Leaderboard Empty State
```tsx
// In DashboardView
{leaderboardData.length === 0 ? (
  <NoScoresEmptyState />
) : (
  <table>
    {/* Leaderboard table */}
  </table>
)}
```

#### Players List Empty State
```tsx
// In PlayersView
{players.length === 0 ? (
  <NoPlayersEmptyState onAddPlayer={() => setIsAddPlayerModalOpen(true)} />
) : (
  <div>
    {players.map(player => (
      <PlayerCard key={player.id} player={player} />
    ))}
  </div>
)}
```

#### Search Results Empty State
```tsx
// In any search feature
{filteredResults.length === 0 && searchTerm && (
  <NoSearchResultsEmptyState searchTerm={searchTerm} />
)}
```

---

## 🚀 Quick Integration Plan

### Step 1: Add to AppOld.jsx (Lines 678-688)

**Replace loading spinner with skeleton:**

```typescript
// Before (line 678):
if (!dbReady || !currentUser) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading database...</p>
      </div>
    </div>
  );
}

// After:
import { DashboardSkeleton } from './components/common';

if (!dbReady || !currentUser) {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <DashboardSkeleton />
    </div>
  );
}
```

### Step 2: Add Confirmation Dialogs (Lines ~1700)

**Add to component:**

```typescript
import { useConfirm } from './components/common';

// At top of GPGAManager function
const { confirm, ConfirmDialogComponent } = useConfirm();

// Replace inline confirm() calls
const handleDeleteRound = (id, name) => {
  confirm(
    `Delete ${name}?`,
    'This will permanently delete all scores for this round.',
    () => {
      DB.deleteRound(id);
      loadData();
      showToast('Round deleted');
    }
  );
};

// Before closing main component, add:
return (
  <div>
    {/* ... existing content ... */}
    <ConfirmDialogComponent />
  </div>
);
```

### Step 3: Add Empty States (Multiple locations)

**Dashboard (Line ~1016):**
```typescript
{leaderboardData.length === 0 ? (
  <NoScoresEmptyState />
) : (
  // ... existing leaderboard table ...
)}
```

**Rounds (Line ~1620):**
```typescript
{rounds.length === 0 ? (
  <NoRoundsEmptyState onAddRound={() => setIsAddRoundModalOpen(true)} />
) : (
  // ... existing rounds list ...
)}
```

**Players (Line ~2400):**
```typescript
{players.length === 0 ? (
  <NoPlayersEmptyState onAddPlayer={() => setIsAddPlayerModalOpen(true)} />
) : (
  // ... existing players list ...
)}
```

---

## 📝 Code Snippets for AppOld.jsx

### Add Imports (Top of file)
```typescript
import {
  DashboardSkeleton,
  useConfirm,
  NoPlayersEmptyState,
  NoRoundsEmptyState,
  NoScoresEmptyState,
  NoFinesEmptyState
} from './components/common';
```

### Initialize Confirmation Hook
```typescript
export default function GPGAManager() {
  // Add this line after other useState hooks
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // ... rest of component
}
```

### Replace All confirm() Calls

**Find:**
```javascript
if (confirm("Are you sure?")) {
  DB.deleteRound(id);
}
```

**Replace with:**
```typescript
confirm(
  'Delete Round?',
  'This action cannot be undone.',
  () => DB.deleteRound(id)
);
```

### Add Component at End of Return
```typescript
return (
  <div className="flex h-screen overflow-hidden bg-slate-100">
    {/* ... existing content ... */}
    <ConfirmDialogComponent />
  </div>
);
```

---

## ✅ Testing Checklist

After integration, test:

- [ ] Loading skeleton shows on first load
- [ ] Delete round shows confirmation dialog
- [ ] Delete player shows confirmation dialog
- [ ] Reset database shows confirmation dialog
- [ ] Empty state shows when no rounds
- [ ] Empty state shows when no players
- [ ] Empty state shows when no scores
- [ ] Empty state action buttons work
- [ ] All modals close properly
- [ ] Confirmations actually delete data

---

## 🎨 Customization

### Change Skeleton Colors
Edit `LoadingSkeleton.tsx`:
```typescript
// Change from slate-200 to any color
<div className="h-4 bg-blue-200 rounded animate-pulse" />
```

### Change Confirmation Colors
Edit `ConfirmDialog.tsx`:
```typescript
const getButtonClasses = () => {
  if (type === 'danger') return 'btn btn-error'; // Change to 'btn-warning'
  // ...
};
```

### Add New Empty State Type
Edit `EmptyState.tsx`:
```typescript
export const NoCoursesEmptyState: React.FC<{ onAddCourse?: () => void }> = ({ onAddCourse }) => (
  <EmptyState
    type="default"
    title="No Golf Courses"
    description="Add golf courses to start creating rounds."
    actionLabel={onAddCourse ? "Add Course" : undefined}
    onAction={onAddCourse}
  />
);
```

---

## 💡 Next UX Improvements

After these are integrated, consider:
1. Search/Filter components
2. Data export (CSV)
3. Keyboard shortcuts
4. Command palette
5. Mobile optimizations

---

**Ready to integrate? The components are production-ready!**

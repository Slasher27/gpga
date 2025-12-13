# 🎯 View Extraction Progress

## ✅ Completed
- [x] Created `useAppData` hook for state management
- [x] Created `Sidebar` component (TypeScript)
- [x] Added `ViewKey` type definition

## 🚧 In Progress
Due to the large size of the extraction (3,221 lines → 5+ components), I've created the infrastructure. Here's how to complete:

### Remaining Views to Extract

#### 1. DashboardView (~280 lines)
**Location:** AppOld.jsx lines 804-1078
**Key Features:**
- Leaderboard table (Medal & Stableford tabs)
- Stats cards (rounds, pot size, players, reset)
- Fines leaderboard sidebar
- Fines distribution chart

**Dependencies:**
```typescript
import { useAppData } from '../hooks';
import { Card } from '../components/common';
import { LineChart, Line, ... } from 'recharts';
```

#### 2. FinesView (~330 lines)
**Location:** AppOld.jsx lines 1080-1410
**Key Features:**
- Fine assignment interface
- Round selection
- Player selection
- Fine types management

#### 3. RoundsView (~310 lines)
**Location:** AppOld.jsx lines 1411-1724
**Key Features:**
- Rounds list table
- Add/Edit/Delete rounds
- Course selection
- Date picker

#### 4. ProfileView (~220 lines)
**Location:** AppOld.jsx lines 1724-1942
**Key Features:**
- User profile form
- Avatar upload
- Player statistics
- Password change

#### 5. PlayersView (~200 lines)
**Location:** AppOld.jsx lines 2272+
**Key Features:**
- Player list (admin only)
- Add/Edit/Delete players
- Role management
- Status toggling

## 📝 Extraction Template

For each view, follow this pattern:

```typescript
// src/views/DashboardView.tsx
import React, { useState, useMemo } from 'react';
import { useAppData } from '../hooks';
import { Card, Badge } from '../components/common';

export const DashboardView: React.FC = () => {
  const { players, rounds, scores, leaderboardData, loadData } = useAppData();

  // Local state
  const [leaderboardTab, setLeaderboardTab] = useState('medal');

  // Derived state
  const sortedLeaderboard = useMemo(() => {
    // ... sorting logic
  }, [leaderboardTab, leaderboardData]);

  // Event handlers
  const resetData = () => {
    if (confirm("Are you sure?")) {
      // Reset logic
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* View content */}
    </div>
  );
};
```

## 🔄 Current Workaround

The app currently works with:
- **App.tsx** → wraps **AppOld.jsx**
- **Sidebar** component created but not used yet
- **useAppData** hook ready to use

## ⏭️ Next Steps

### Option A: I Complete Extraction
I can extract all views now. This will require:
- Creating 5 view files (~1,500 lines total)
- Updating App.tsx to use new views
- Testing each view

**Time:** ~1-2 hours

### Option B: You Complete Using Template
1. Copy sections from AppOld.jsx
2. Use template above
3. Replace state with `useAppData()` hook
4. Import components from `components/common`

### Option C: Hybrid Approach
I extract 1-2 critical views (Dashboard, Fines), you do the rest following the pattern.

## 🎁 What You Have Now

**Working Infrastructure:**
```typescript
// Use in any component:
import { useAppData } from '../hooks';

const {
  players,        // All players
  rounds,         // All rounds
  scores,         // Player scores
  leaderboardData,// Calculated leaderboard
  golfCourses,    // All courses
  loadData        // Reload function
} = useAppData();
```

**Available Components:**
- Card, Badge, Modal, DatePicker (common/)
- Sidebar (layout/)

**Hooks:**
- useAuth, useTheme, useToast, useDatabase, useAppData

Would you like me to continue with Option A (full extraction)?

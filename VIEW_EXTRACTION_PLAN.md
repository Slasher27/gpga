# 📋 View Extraction Plan

## Current Status
- **AppOld.jsx**: 3,221 lines (monolithic)
- **Goal**: Extract into modular TypeScript components

## Extraction Strategy

### Phase 1: Shared Infrastructure ✅
- [x] Created `useAppData` hook for state management
- [ ] Create Sidebar component
- [ ] Create PageLayout wrapper

### Phase 2: View Components
Each view will be extracted with this pattern:

```typescript
// Example: DashboardView.tsx
import React from 'react';
import { useAppData } from '../hooks';
import { Card, Badge } from '../components/common';

interface DashboardViewProps {
  // Any props passed from parent
}

export const DashboardView: React.FC<DashboardViewProps> = () => {
  const { players, rounds, scores, leaderboardData } = useAppData();

  // Component logic here

  return (
    <div>
      {/* View JSX */}
    </div>
  );
};
```

### Views to Extract:

1. **DashboardView** (~280 lines)
   - Location: Lines 804-1078
   - Components: Leaderboard table, stats cards, fines chart
   - Dependencies: leaderboardData, rounds, players

2. **FinesView** (~330 lines)
   - Location: Lines 1080-1410
   - Components: Fine assignment, fine types management
   - Dependencies: rounds, players, fineTypes

3. **RoundsView** (~310 lines)
   - Location: Lines 1411-1724
   - Components: Round list, round form, delete confirmation
   - Dependencies: rounds, golfCourses

4. **ProfileView** (~220 lines)
   - Location: Lines 1724-1942
   - Components: Profile form, avatar upload, stats
   - Dependencies: currentUser, scores

5. **PlayersView** (~200 lines)
   - Location: Lines 2272+
   - Components: Player list, add/edit forms
   - Dependencies: players (admin only)

## Recommended Approach

### Option A: Incremental (Recommended)
Extract views one at a time, test each:
1. Create view component
2. Import in App.tsx
3. Test functionality
4. Move to next view

### Option B: Big Bang
Extract all views at once, then test everything.

### Option C: Hybrid Current State
Keep AppOld.jsx working, build new views alongside, switch when ready.

## Benefits After Extraction

- **Maintainability**: 300-line files vs 3,000-line file
- **Reusability**: Share components across views
- **Testing**: Test individual views
- **Collaboration**: Multiple devs work simultaneously
- **Type Safety**: Full TypeScript benefits

## Next Steps

1. **Create Sidebar component** (layout/Sidebar.tsx)
2. **Create PageLayout** (layout/PageLayout.tsx)
3. **Extract DashboardView** first (simplest, most visible)
4. **Update App.tsx** to use new components
5. **Repeat** for remaining views

Would you like me to:
- A) Extract all views now (2-3 hours)
- B) Extract DashboardView as example (30 mins)
- C) Create detailed extraction guide for you to do


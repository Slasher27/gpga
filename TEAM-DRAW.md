# Casino-Style Random Team Draw — Match Day Team Generator

## Overview

A self-contained Team Draw page/component for the GPGA golf app. Assigns 8 players into two four-balls, with each four-ball containing two cart-sharing partnerships. The draw experience is designed to be dramatic and fun — casino-style reveal with animations.

## Final Draw Structure

```
Four-Ball 1
  ├── Team 1A: [Player] & [Player]  ← cart partners, tee off first
  └── Team 1B: [Player] & [Player]  ← cart partners, same group

Four-Ball 2
  ├── Team 2A: [Player] & [Player]  ← cart partners
  └── Team 2B: [Player] & [Player]  ← cart partners
```

- All 8 players must appear exactly once
- No player can be in more than one team

## Player Source

- Pull participating players from existing app state (players registered for the round)
- If fewer or more than 8 players available → show warning, disable draw
- Admin can manually select which 8 players participate if more than 8 registered

## The Draw Experience — Casino Style

### Flow

1. Admin clicks **"Start the Draw"** → full-screen or modal draw theatre opens
2. Bold title animates in: *"The Draw is About to Begin..."*
3. Draw reveals one partnership at a time in order:
   - Four-Ball 1 — Team 1A (first cart partners)
   - Four-Ball 1 — Team 1B (second cart partners)
   - Four-Ball 2 — Team 2A
   - Four-Ball 2 — Team 2B

### Partnership Reveal Sequence

For each partnership:

1. **Shuffle animation** — player name cards/avatar tiles cycle rapidly through remaining players (slot machine / roulette drum feel)
2. **Tension builds** — animation slows gradually before locking in
3. **First player locks in** — satisfying snap with optional sound cue
4. Brief pause
5. **Shuffle resumes** for second player in the pair
6. **Second player locks in** — both names displayed as confirmed cart partners with visual flourish (glow, confetti burst, or similar)
7. Short pause before next partnership draw begins

### Visual Design

- Dark, dramatic background — casino green felt or deep charcoal
- Gold accent colours for revealed names
- Large, bold typography for player names
- Player avatars (from app) prominent in reveal cards
- Smooth CSS transitions and keyframe animations — no janky jumps
- Mobile and tablet friendly — used on-site on match day

### Controls

- **"Start the Draw"** — begins automated sequence
- **"Draw Next Team"** — manual pacing option (admin controls reveal for the crowd)
- **"Redraw"** — resets and reshuffles (admin only, with confirmation prompt)
- **"Save Teams"** — once all four partnerships revealed, saves teams to current round

## State & Logic

- **Randomisation**: Fisher-Yates shuffle or equivalent — genuinely random each time
- **Player pool**: drawn players removed from pool immediately, no duplicates possible
- **Local state**: revealed teams persist in component state until "Save Teams" confirmed
- **Persistence**: saved teams stored against the active round in existing app data structure

## Component Structure

```
src/components/TeamDraw/
  ├── TeamDrawPage.jsx        ← main container, player selection
  ├── DrawTheatre.jsx         ← full-screen draw experience
  ├── SlotReel.jsx            ← spinning animation component
  ├── PartnershipCard.jsx     ← revealed team display card
  └── teamDraw.utils.js       ← shuffle logic, draw sequencing
```

## Edge Cases

- **Fewer than 8 players** → show warning, block draw
- **Draw interrupted / page refresh** → warn user unsaved teams will be lost
- **Redraw after save** → require explicit admin confirmation

## Integration Points

- Players: from existing `players` array in App.jsx state
- Season players: from `getSeasonPlayers()` API
- Round: save draw results against active round
- Nav: add Team Draw as a page/view accessible to admins
- Existing UI patterns: use app's emerald/slate palette for non-theatre UI, casino theme for draw theatre only

## Backend Requirements

- May need a new table or fields to store draw results per round
- API endpoint to save/retrieve team draw for a round
- Consider whether draw results should trigger a notification to all players

## Status

- [ ] Not started — documented for next session

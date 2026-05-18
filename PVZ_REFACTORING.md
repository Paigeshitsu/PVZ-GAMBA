# PvZ-Style Slot Machine Refactoring

## Overview
Your slot machine system has been successfully refactored to implement a **Plants vs Zombies (PvZ) style architecture** where plants and zombies are paired within the same lanes rather than separated across columns.

## Key Architectural Changes

### Before: Separated Layer Model
```
Columns 0-1: Zombie Layer (2 cols with 5 rows each)
Columns 2-4: Plant Layer (3 cols with 5 rows each)

Layout: [Zombie | Zombie | Plant | Plant | Plant]
```

- Plants and zombies were in separate columns
- Plants in a row attacked all zombies in that row
- Damage was calculated by summing plant damage across the row

### After: Plant Container Model (PvZ-Style)
```
5 Plant Lanes (rows), each containing:
├── Plant (the main defender)
├── Optional Zombie (the attacker in that lane)
└── Additional Plant Layer (for combos and splash effects)

Layout: [Plant Container] [Plant Container] [Plant Container] [Plant Container] [Plant Container]
```

- Each lane has an embedded zombie that belongs specifically to that lane
- Plants in a lane damage zombies in the SAME lane
- Supports splash damage to adjacent lanes from AOE plants (Watermelon, Cherry)

## Type Changes

### New Types in `types.ts`

```typescript
// Plant Container: Encapsulates a plant and its associated zombie
export type PlantContainer = {
  plantSymbol: SymbolId;     // The main plant defending this lane
  zombie?: {                  // Optional zombie in this lane
    symbol: SymbolId;
    position: Position;       // Always at reel 0, specific row
  };
};

// Restructured Board
export type Board = {
  plants: SymbolId[][];       // 5x5 grid for full plant layer (visual/combo system)
  containers: PlantContainer[]; // 5 lanes, each with plant + optional zombie
};
```

### Removed
- `ZOMBIE_COLS` constant (was 2)
- `Cell` type (no longer needed)

### Added
- `PLANT_LANES` constant (5)
- `PlantContainer` type
- `Board` as an object with `plants` and `containers` properties

## Function Updates

### Zombie Resolution Logic

**Before:**
```typescript
function resolveZombies(board: Board, instantKill: boolean): ZombieHit[] {
  // Iterate zombieCol from 0 to ZOMBIE_COLS
  // For each zombie, sum damage from all plants in that row
  const damageTaken = laneDamage(board, zombieRow);
}

function laneDamage(board: Board, zombieRow: number): number {
  let damage = 0;
  for (let plantCol = ZOMBIE_COLS; plantCol < REELS; plantCol++)
    damage += getSymbol(board[plantCol][zombieRow].symbol).damage;
  return damage;
}
```

**After:**
```typescript
function resolveZombies(board: Board, instantKill: boolean): ZombieHit[] {
  // Iterate through containers (one per lane)
  for (let laneIndex = 0; laneIndex < PLANT_LANES; laneIndex++) {
    const container = board.containers[laneIndex];
    
    // Get the plant in this specific lane
    const plantDamage = getSymbol(container.plantSymbol).damage ?? 0;
    
    // Add splash damage from adjacent lane AOE plants
    const splashDamage = splashDamageFromPlant(container.plantSymbol, board, laneIndex);
    
    const totalDamage = plantDamage + splashDamage;
    const defeated = totalDamage >= zombie.multiplier;
  }
}

function splashDamageFromPlant(plantSymbol: SymbolId, board: Board, currentLane: number): number {
  if (plantSymbol === "WATERMELON" || plantSymbol === "CHERRY") {
    // Damage adjacent lanes that have zombies
  }
}
```

### Board Drawing

**Before:**
- Drew a flat 5x5 grid with isZombieLayer check
- Separated zombie and plant weights by column

**After:**
- Draws plant layer: 5x5 grid of plants
- Draws container layer: 5 lanes with plants + optional zombies
- Containers reference plants for lane-specific combat

## Game Flow

### Spin Resolution (Simplified)

1. **Draw Board**
   - Plant layer: 5x5 grid of all plants
   - Container layer: 5 lanes with plant + zombie spawn

2. **Apply Effects**
   - Check for BONUS triggers → dark mode upgrade
   - Apply CHILI reset if present
   - Apply NUT reloads

3. **Resolve Line Wins**
   - Check for 5-of-a-kind across plant layer
   - Each matching row pays multiplier × bet

4. **Resolve Zombies**
   - For each lane in containers:
     - Get plant in that lane
     - Get zombie in that lane (if any)
     - Calculate damage: plantDamage + splashDamage
     - Compare to zombie HP (multiplier value)
     - Award multiplier if defeated

5. **Calculate Payout**
   - Total Multiplier = lineWinMultiplier + zombieWinMultiplier
   - Payout = totalMultiplier × baseBet

## File Changes

### Modified Files
- [types.ts](src/math/types.ts) - New PlantContainer and Board types
- [reels.ts](src/math/reels.ts) - Board drawing logic refactored
- [engine.ts](src/math/engine.ts) - Zombie resolution and game logic
- [engine.test.ts](src/math/engine.test.ts) - Tests updated for new structures
- [play.ts](src/play.ts) - CLI display logic
- [server.ts](src/server.ts) - Serialization logic

### Key Functions Updated
- `drawBoard()` - Creates containers with plant+zombie pairs
- `resolveZombies()` - Lane-based zombie damage calculation
- `upgradePlantsToMushrooms()` - Works with both layers
- `hasSymbol()` - Checks both plant and container layers
- `rerollPlantCells()` - Maintains both layers
- `countSymbols()` - Counts across both layers

## Benefits of This Architecture

✅ **Thematic**: Matches PvZ gameplay - each plant protects a lane from that lane's zombie

✅ **Clear Lane Ownership**: Zombies belong to specific lanes, no ambiguity

✅ **Better Splash Damage**: Adjacent plants can affect nearby lanes naturally

✅ **Easier Balance**: Can tune plant damage vs zombie HP per lane independently

✅ **Visual Clarity**: Players understand which plant fights which zombie

✅ **Extensibility**: Can add lane-specific modifiers, buffs, effects easily

## Testing

All unit tests pass successfully:
```
✔ base spin returns a validated paid-spin result
✔ bonus buy charges by bet and awards exactly 10 feature spins
✔ battle feature resolves hack-and-slash spins with bounded respins
✔ 5 matching icons across a lane pay by the selected bet
✔ only configured peso bets are accepted
```

## Next Steps (Optional Enhancements)

1. **Visualize Containers**: Update UI to show plant-zombie pairs per lane
2. **Lane-Specific Multipliers**: Vary zombie HP/multiplier per lane
3. **Plant Placement**: Let players choose which plant goes in which lane
4. **Boss Zombies**: Special zombies that require specific plants
5. **Combo System**: Bonus multiplier when multiple plants defeat zombies in same spin

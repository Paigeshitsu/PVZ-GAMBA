export const REELS = 5;
export const ROWS = 5;
export const LANES = 5; // 5 lanes where plants and zombies interact

export type Position = {
  reel: number;
  row: number;
};

// Container for spun plants - player can deploy these to lanes
export type PlantContainer = {
  plants: SymbolId[]; // All plants player spun
};

// Lane with a plant and zombies
export type Lane = {
  plant?: SymbolId; // Plant deployed to this lane (optional)
  zombies: Array<{
    symbol: SymbolId;
    health: number; // Current remaining health (equal to multiplier value)
  }>;
};

export type SymbolId =
  | "EMPTY"
  | "BONUS"
  | "NUT"
  | "PEASHOOTER_1"
  | "PEASHOOTER_2"
  | "PEASHOOTER_3"
  | "WATERMELON"
  | "CHERRY"
  | "SQUASH"
  | "DOOM_SHROOM"
  | "CHILI"
  | "MUSHROOM_1"
  | "MUSHROOM_2"
  | "MUSHROOM_3"
  | "ZOMBIE_15"
  | "ZOMBIE_20"
  | "ZOMBIE_50";

export type SymbolKind = "empty" | "plant" | "zombie" | "bonus" | "utility";

export type GameSymbol = {
  id: SymbolId;
  kind: SymbolKind;
  damage?: number;
  multiplier?: number;
  isBonus?: boolean;
  isReload?: boolean;
  isPlantReset?: boolean;
  isInstantKill?: boolean;
  featureUpgradeTo?: SymbolId;
};

export type Cell = {
  symbol: SymbolId;
};

export type Board = {
  spinPlants: SymbolId[]; // Plants from the spin (5 plants)
  lanes: Lane[]; // 5 lanes - player places plants and zombies spawn here
};

export type SpinMode = "base" | "bonus";

export type SpinSource = "paid_spin" | "triggered_bonus" | "bonus_buy";

export type SpinInput = {
  baseBet: number;
  mode: SpinMode;
  source?: SpinSource;
  freeSpinIndex?: number;
  freeSpinsTotal?: number;
};

export type ZombieHit = {
  position: Position;
  symbol: SymbolId;
  multiplier: number;
  damageTaken: number;
  defeated: boolean;
};

export type LineWin = {
  row: number;
  symbol: SymbolId;
  count: number;
  multiplier: number;
  payout: number;
};

export type BattleSymbolId = "MISS" | "DAGGER" | "KNIFE" | "SWORD" | "AXE" | "CHEST";

export type BattleSymbol = {
  id: BattleSymbolId;
  hits: number;
  respinsAwarded: number;
  chestMultiplier?: number;
};

export type BattleMonster = {
  index: number;
  level: number;
  isBoss: boolean;
  startingHealth: number;
  remainingHealth: number;
};

export type BattleStep = {
  spinNumber: number;
  symbols: BattleSymbolId[];
  hitsApplied: number;
  criticalHits: number;
  respinsAwarded: number;
  chestMultiplier: number;
  monsterBefore: BattleMonster;
  monsterAfter: BattleMonster;
  defeatedMonster?: BattleMonster;
  levelUpAwarded?: string;
};

export type BattleFeatureResult = {
  baseBet: number;
  startingSpins: number;
  spinsPlayed: number;
  respinsAwarded: number;
  monstersDefeated: number;
  bossesDefeated: number;
  levelUps: string[];
  chestMultiplier: number;
  battleMultiplier: number;
  payout: number;
  steps: BattleStep[];
};

export type SpinEvent = {
  type:
    | "board_drawn"
    | "line_win"
    | "bonus_triggered"
    | "dark_mode_upgrade"
    | "bonus_buy_purchased"
    | "free_spin_awarded"
    | "plant_reset"
    | "reload"
    | "instant_kill"
    | "zombie_resolved";
  message: string;
};

export type SpinResult = {
  input: SpinInput;
  board: Board;
  featureTriggered: boolean;
  darkMode: boolean;
  bonusCount: number;
  reloads: number;
  lineWins: LineWin[];
  lineWinMultiplier: number;
  zombieWinMultiplier: number;
  zombieHits: ZombieHit[];
  totalMultiplier: number;
  payout: number;
  events: SpinEvent[];
};

export type BonusBuyInput = {
  baseBet: number;
};

export type BonusBuyResult = {
  type: "bonus_buy";
  baseBet: number;
  cost: number;
  freeSpinsAwarded: number;
  spins: SpinResult[];
  battleFeatures: BattleFeatureResult[];
  totalMultiplier: number;
  totalPayout: number;
  netOutcome: number;
  events: SpinEvent[];
};

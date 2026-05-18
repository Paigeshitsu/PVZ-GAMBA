import { drawBoard, countSymbols, rerollPlantCells } from "./reels.js";
import type { BattleFeatureResult, Board, BonusBuyInput, BonusBuyResult, LineWin, SpinEvent, SpinInput, SpinResult, SymbolId, ZombieHit } from "./types.js";
import { REELS, ROWS, LANES } from "./types.js";
import type { Rng } from "./rng.js";
import { getSymbol } from "./symbols.js";
import { BONUS_BUY_COST_MULTIPLIER, BONUS_BUY_FREE_SPINS, BONUS_TRIGGER_COUNT, FIVE_OF_A_KIND_PAYTABLE, validateBaseBet } from "./config.js";
import { playBattleFeature } from "./battle.js";

export function spin(input: SpinInput, rng: Rng): SpinResult {
  validateBaseBet(input.baseBet);

  const events: SpinEvent[] = [];
  const board = drawBoard(rng);
  events.push({ type: "board_drawn", message: "Initial 5x5 board drawn." });

  const bonusCount = countSymbols(board, "BONUS");
  const featureTriggered = input.mode === "bonus" || bonusCount >= BONUS_TRIGGER_COUNT;
  const darkMode = featureTriggered;

  if (featureTriggered) {
    events.push({
      type: "bonus_triggered",
      message: "Dark mode triggered; plant icons upgrade into mushrooms."
    });
    upgradePlantsToMushrooms(board);
    rerollPlantCells(board, rng, (symbol) => symbol === "EMPTY" || symbol === "PEASHOOTER_1");
    events.push({
      type: "dark_mode_upgrade",
      message: "Plant layer upgraded and rerolled for feature resolution."
    });
  }

  if (hasSymbol(board, "CHILI")) {
    rerollPlantCells(board, rng, () => true);
    events.push({
      type: "plant_reset",
      message: "Chili reset the plant board before attacks resolved."
    });
  }

  const reloads = countSymbols(board, "NUT");
  for (let reload = 0; reload < reloads; reload += 1) {
    rerollPlantCells(board, rng, (symbol) => symbol === "EMPTY" || symbol === "PEASHOOTER_1");
  }

  if (reloads > 0) {
    events.push({
      type: "reload",
      message: `${reloads} nut reload(s) improved weak plant cells.`
    });
  }

  const lineWins = resolveLineWins(board, input.baseBet);
  const lineWinMultiplier = lineWins.reduce((sum, win) => sum + win.multiplier, 0);
  if (lineWins.length > 0) {
    events.push({
      type: "line_win",
      message: `${lineWins.length} lane(s) hit 5 matching icons for ${lineWinMultiplier}x.`
    });
  }

  const instantKill = hasSymbol(board, "DOOM_SHROOM");
  if (instantKill) {
    events.push({
      type: "instant_kill",
      message: "Doom shroom defeated all zombies on the board."
    });
  }

  const zombieHits = resolveZombies(board, instantKill);
  const zombieWinMultiplier = zombieHits
    .filter((hit) => hit.defeated)
    .reduce((sum, hit) => sum + hit.multiplier, 0);
  const totalMultiplier = lineWinMultiplier + zombieWinMultiplier;
  const payout = totalMultiplier * input.baseBet;

  events.push({
    type: "zombie_resolved",
    message: `${zombieHits.filter((hit) => hit.defeated).length} zombie(s) defeated for ${zombieWinMultiplier}x.`
  });

  return {
    input,
    board,
    featureTriggered,
    darkMode,
    bonusCount,
    reloads,
    lineWins,
    lineWinMultiplier,
    zombieWinMultiplier,
    zombieHits,
    totalMultiplier,
    payout,
    events
  };
}

export function resolveLineWins(board: Board, baseBet: number): LineWin[] {
  validateBaseBet(baseBet);

  const lineWins: LineWin[] = [];

  // Check each lane for 5-of-a-kind bonus (if plants were in rows in traditional sense)
  // For now, we'll skip this since plants are placed individually, not in rows
  // You can add custom line-win logic here if needed

  return lineWins;
}

export function buyBonus(input: BonusBuyInput, rng: Rng): BonusBuyResult {
  validateBaseBet(input.baseBet);

  const cost = input.baseBet * BONUS_BUY_COST_MULTIPLIER;
  const events: SpinEvent[] = [
    {
      type: "bonus_buy_purchased",
      message: `Bonus bought for ${BONUS_BUY_COST_MULTIPLIER}x bet.`
    },
    {
      type: "free_spin_awarded",
      message: `${BONUS_BUY_FREE_SPINS} free spins awarded.`
    }
  ];
  const spins: SpinResult[] = [];
  const battleFeatures: BattleFeatureResult[] = [];

  for (let spinIndex = 1; spinIndex <= BONUS_BUY_FREE_SPINS; spinIndex += 1) {
    spins.push(
      spin(
        {
          baseBet: input.baseBet,
          mode: "bonus",
          source: "bonus_buy",
          freeSpinIndex: spinIndex,
          freeSpinsTotal: BONUS_BUY_FREE_SPINS
        },
        rng
      )
    );
    battleFeatures.push(playBattleFeature(input.baseBet, rng));
  }

  const spinMultiplier = spins.reduce((sum, result) => sum + result.totalMultiplier, 0);
  const battleMultiplier = battleFeatures.reduce((sum, result) => sum + result.battleMultiplier, 0);
  const totalMultiplier = spinMultiplier + battleMultiplier;
  const totalPayout =
    spins.reduce((sum, result) => sum + result.payout, 0) +
    battleFeatures.reduce((sum, result) => sum + result.payout, 0);

  return {
    type: "bonus_buy",
    baseBet: input.baseBet,
    cost,
    freeSpinsAwarded: BONUS_BUY_FREE_SPINS,
    spins,
    battleFeatures,
    totalMultiplier,
    totalPayout,
    netOutcome: totalPayout - cost,
    events
  };
}

function upgradePlantsToMushrooms(board: Board): void {
  // Upgrade spun plants
  for (let i = 0; i < board.spinPlants.length; i++) {
    const upgradeTo = getSymbol(board.spinPlants[i]!).featureUpgradeTo;
    if (upgradeTo) {
      board.spinPlants[i] = upgradeTo;
    }
  }

  // Upgrade plants in lanes
  for (const lane of board.lanes) {
    if (lane.plant) {
      const upgradeTo = getSymbol(lane.plant).featureUpgradeTo;
      if (upgradeTo) {
        lane.plant = upgradeTo;
      }
    }
  }
}

function hasSymbol(board: Board, symbol: SymbolId): boolean {
  // Check spin plants
  const hasInSpin = board.spinPlants.includes(symbol);
  // Check lanes (both plant and zombies)
  const hasInLanes = board.lanes.some(
    (lane) => lane.plant === symbol || lane.zombies.some((z) => z.symbol === symbol)
  );
  return hasInSpin || hasInLanes;
}

function resolveZombies(board: Board, instantKill: boolean): ZombieHit[] {
  const hits: ZombieHit[] = [];

  for (let laneIndex = 0; laneIndex < LANES; laneIndex += 1) {
    const lane = board.lanes[laneIndex]!;

    // No zombies in this lane
    if (lane.zombies.length === 0) {
      continue;
    }

    // Get plant damage if one is deployed in this lane
    const plantDamage = lane.plant ? (getSymbol(lane.plant).damage ?? 0) : 0;

    // Attack all zombies in this lane
    for (const zombie of lane.zombies) {
      const totalDamage = instantKill ? zombie.health : plantDamage;
      const defeated = instantKill || totalDamage >= zombie.health;

      hits.push({
        position: { reel: 0, row: laneIndex },
        symbol: zombie.symbol,
        multiplier: zombie.health, // The original HP value is the multiplier
        damageTaken: totalDamage,
        defeated
      });
    }
  }

  return hits;
}

import { drawBoard, countSymbols, rerollPlantCells } from "./reels.js";
import type { BattleFeatureResult, Board, BonusBuyInput, BonusBuyResult, LineWin, SpinEvent, SpinInput, SpinResult, SymbolId, ZombieHit } from "./types.js";
import { REELS, ROWS, ZOMBIE_COLS } from "./types.js";
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

  for (let row = 0; row < ROWS; row += 1) {
    const firstSymbol = board[0]![row]!.symbol;
    const multiplier = FIVE_OF_A_KIND_PAYTABLE[firstSymbol] ?? 0;

    if (multiplier === 0) {
      continue;
    }

    const isFiveOfAKind = board.every((reel) => reel[row]!.symbol === firstSymbol);
    if (!isFiveOfAKind) {
      continue;
    }

    lineWins.push({
      row,
      symbol: firstSymbol,
      count: REELS,
      multiplier,
      payout: multiplier * baseBet
    });
  }

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
  for (const reel of board) {
    for (const cell of reel) {
      const upgradeTo = getSymbol(cell.symbol).featureUpgradeTo;
      if (upgradeTo) {
        cell.symbol = upgradeTo;
      }
    }
  }
}

function hasSymbol(board: Board, symbol: SymbolId): boolean {
  return board.some((reel) => reel.some((cell) => cell.symbol === symbol));
}

function resolveZombies(board: Board, instantKill: boolean): ZombieHit[] {
  const hits: ZombieHit[] = [];

  for (let zombieCol = 0; zombieCol < ZOMBIE_COLS; zombieCol += 1) {
    for (let zombieRow = 0; zombieRow < ROWS; zombieRow += 1) {
      const zombie = getSymbol(board[zombieCol]![zombieRow]!.symbol);
      if (zombie.kind !== "zombie") {
        continue;
      }

      const multiplier = zombie.multiplier ?? 0;
      const damageTaken = instantKill ? multiplier : laneDamage(board, zombieRow);
      hits.push({
        position: { reel: zombieCol, row: zombieRow },
        symbol: zombie.id,
        multiplier,
        damageTaken,
        defeated: instantKill || damageTaken >= multiplier
      });
    }
  }

  return hits;
}

function laneDamage(board: Board, zombieRow: number): number {
  let damage = 0;
  for (let plantCol = ZOMBIE_COLS; plantCol < REELS; plantCol += 1) {
    damage += getSymbol(board[plantCol]![zombieRow]!.symbol).damage ?? 0;
  }
  return damage;
}

function splashDamage(board: Board, row: number): number {
  let damage = 0;
  for (let plantCol = ZOMBIE_COLS; plantCol < REELS; plantCol += 1) {
    const symbol = board[plantCol]![row]!.symbol;
    if (symbol === "WATERMELON" || symbol === "CHERRY") {
      damage += Math.floor((getSymbol(symbol).damage ?? 0) / 2);
    }
  }
  return damage;
}

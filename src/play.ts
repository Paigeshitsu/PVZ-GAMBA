import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { buyBonus, spin } from "./math/engine.js";
import { CryptoRng } from "./math/rng.js";
import { ALLOWED_BETS_CENTAVOS, ALLOWED_BETS_PESOS, CENTAVOS_PER_PESO } from "./math/config.js";
import type { Board, BonusBuyResult, SpinResult, SymbolId } from "./math/types.js";

const SYMBOL_LABELS: Record<SymbolId, string> = {
  EMPTY: "----",
  BONUS: "BON ",
  NUT: "NUT ",
  PEASHOOTER_1: "PEA1",
  PEASHOOTER_2: "PEA2",
  PEASHOOTER_3: "PEA3",
  WATERMELON: "MEL ",
  CHERRY: "CHR ",
  SQUASH: "SQU ",
  DOOM_SHROOM: "DOOM",
  CHILI: "CHIL",
  MUSHROOM_1: "M1  ",
  MUSHROOM_2: "M2  ",
  MUSHROOM_3: "M3  ",
  ZOMBIE_15: "Z15 ",
  ZOMBIE_20: "Z20 ",
  ZOMBIE_50: "Z50 "
};

const SYMBOL_NAMES: Record<SymbolId, string> = {
  EMPTY: "Empty",
  BONUS: "Bonus scatter",
  NUT: "Nut reload",
  PEASHOOTER_1: "Peashooter level 1",
  PEASHOOTER_2: "Peashooter level 2",
  PEASHOOTER_3: "Peashooter level 3",
  WATERMELON: "Watermelon splash",
  CHERRY: "Cherry splash",
  SQUASH: "Squash",
  DOOM_SHROOM: "Doom shroom instant kill",
  CHILI: "Chili plant reset",
  MUSHROOM_1: "Mushroom level 1",
  MUSHROOM_2: "Mushroom level 2",
  MUSHROOM_3: "Mushroom level 3",
  ZOMBIE_15: "Zombie worth 15x",
  ZOMBIE_20: "Zombie worth 20x",
  ZOMBIE_50: "Zombie worth 50x"
};

const DISPLAY_SYMBOLS = Object.keys(SYMBOL_LABELS) as SymbolId[];
const ATTACK_SYMBOLS: SymbolId[] = [
  "EMPTY",
  "BONUS",
  "NUT",
  "PEASHOOTER_1",
  "PEASHOOTER_2",
  "PEASHOOTER_3",
  "WATERMELON",
  "CHERRY",
  "SQUASH",
  "DOOM_SHROOM",
  "CHILI",
  "MUSHROOM_1",
  "MUSHROOM_2",
  "MUSHROOM_3"
];
const ZOMBIE_SYMBOLS: SymbolId[] = ["EMPTY", "BONUS", "ZOMBIE_15", "ZOMBIE_20", "ZOMBIE_50"];

type PlayMode = "base" | "bonus";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rng = new CryptoRng();
  const bet = parseBet(args[0]) ?? (await promptForBet());
  const mode = parseMode(args[1]) ?? (await promptForMode());

  console.log("");
  console.log(`Bet: ${formatPeso(bet)} (${bet} centavos)`);
  console.log(`Mode: ${mode === "bonus" ? "Bonus buy" : "Base spin"}`);
  console.log("");

  if (mode === "bonus") {
    const result = buyBonus({ baseBet: bet }, rng);
    await animateBonusBuy(result, rng);
    printBonusBuySummary(result);
    return;
  }

  const result = spin({ baseBet: bet, mode: "base", source: "paid_spin" }, rng);
  await animateSpin(result, rng, "Base spin");
  printSpinSummary(result);
}

async function promptForBet(): Promise<number> {
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const answer = await rl.question(`Choose bet in pesos (${ALLOWED_BETS_PESOS.join(", ")}): `);
      const bet = parseBet(answer);
      if (bet) {
        return bet;
      }

      console.log("Invalid bet. Use one of the listed peso values.");
    }
  } finally {
    rl.close();
  }
}

async function promptForMode(): Promise<PlayMode> {
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const answer = await rl.question("Play base spin or bonus buy? (base/bonus): ");
      const mode = parseMode(answer);
      if (mode) {
        return mode;
      }

      console.log("Invalid mode. Type base or bonus.");
    }
  } finally {
    rl.close();
  }
}

function parseBet(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/php/gi, "").replace(/[,\s]/g, "");
  const pesos = Number(normalized);
  if (!Number.isFinite(pesos)) {
    return undefined;
  }

  const centavos = Math.round(pesos * CENTAVOS_PER_PESO);
  return ALLOWED_BETS_CENTAVOS.includes(centavos as (typeof ALLOWED_BETS_CENTAVOS)[number])
    ? centavos
    : undefined;
}

function parseMode(value: string | undefined): PlayMode | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "base" || normalized === "spin") {
    return "base";
  }

  if (normalized === "bonus" || normalized === "buy" || normalized === "bonus-buy") {
    return "bonus";
  }

  return undefined;
}

async function animateBonusBuy(result: BonusBuyResult, rng: CryptoRng): Promise<void> {
  console.log(`Buying bonus for ${formatPeso(result.cost)}. Awarded ${result.freeSpinsAwarded} feature spins.`);

  for (const spinResult of result.spins) {
    const spinNumber = spinResult.input.freeSpinIndex ?? 0;
    await animateSpin(spinResult, rng, `Bonus free spin ${spinNumber}/${result.freeSpinsAwarded}`);
  }
}

async function animateSpin(result: SpinResult, rng: CryptoRng, title: string): Promise<void> {
  const frames = 14;

  for (let frame = 0; frame < frames; frame += 1) {
    clearTerminal();
    console.log(title);
    console.log("Spinning...");
    console.log("");
    printBoard(randomBoard(rng), false);
    await sleep(65 + frame * 8);
  }

  clearTerminal();
  console.log(title);
  console.log("Result");
  console.log("");
  printBoard(result.board, true);
  console.log("");
  console.log(`Multiplier: ${result.totalMultiplier}x | Payout: ${formatPeso(result.payout)}`);
  await sleep(900);
}

function randomBoard(rng: CryptoRng): Board {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, (_, row) => {
      const symbols = row < 3 ? ATTACK_SYMBOLS : ZOMBIE_SYMBOLS;
      return {
        symbol: symbols[Math.floor(rng.next() * symbols.length)]!
      };
    })
  );
}

function printBoard(board: Board, showLegend: boolean): void {
  const rows = board[0]?.length ?? 0;
  console.log("Top 3 lanes attack. Bottom 2 lanes contain zombie targets.");
  console.log("");
  console.log("          Reel1  Reel2  Reel3  Reel4  Reel5 ");
  console.log("+--------+------+------+------+------+------+");
  for (let row = 0; row < rows; row += 1) {
    const laneLabel = row < 3 ? `ATK ${row + 1}` : `ZMB ${row - 2}`;
    const rowText = board.map((reel) => ` ${SYMBOL_LABELS[reel[row]!.symbol]} `).join("|");
    console.log(`| ${laneLabel.padEnd(6)} |${rowText}|`);
    console.log("+--------+------+------+------+------+------+");
  }

  if (showLegend) {
    printLegend(board);
  }
}

function printLegend(board: Board): void {
  const seen = new Set(board.flat().map((cell) => cell.symbol));
  const items = DISPLAY_SYMBOLS.filter((symbol) => seen.has(symbol))
    .map((symbol) => `${SYMBOL_LABELS[symbol].trim() || "----"}=${SYMBOL_NAMES[symbol]}`)
    .join(" | ");

  console.log("");
  console.log(`Legend: ${items}`);
}

function printSpinSummary(result: SpinResult): void {
  console.log("Spin summary");
  console.log(`Bet: ${formatPeso(result.input.baseBet)}`);
  console.log(`Bonus symbols: ${result.bonusCount}`);
  console.log(`Line wins: ${result.lineWins.length} (${result.lineWinMultiplier}x)`);
  for (const lineWin of result.lineWins) {
    console.log(`  Lane ${lineWin.row + 1}: 5x ${SYMBOL_NAMES[lineWin.symbol]} = ${lineWin.multiplier}x`);
  }
  console.log(`Zombie wins: ${result.zombieWinMultiplier}x`);
  console.log(`Total multiplier: ${result.totalMultiplier}x`);
  console.log(`Payout: ${formatPeso(result.payout)}`);
}

function printBonusBuySummary(result: BonusBuyResult): void {
  const monstersDefeated = result.battleFeatures.reduce((sum, feature) => sum + feature.monstersDefeated, 0);
  const bossesDefeated = result.battleFeatures.reduce((sum, feature) => sum + feature.bossesDefeated, 0);
  const battleMultiplier = result.battleFeatures.reduce((sum, feature) => sum + feature.battleMultiplier, 0);

  console.log("Bonus buy summary");
  console.log(`Bet: ${formatPeso(result.baseBet)}`);
  console.log(`Cost: ${formatPeso(result.cost)}`);
  console.log(`Feature spins: ${result.freeSpinsAwarded}`);
  console.log(`Battle monsters defeated: ${monstersDefeated}`);
  console.log(`Battle bosses defeated: ${bossesDefeated}`);
  console.log(`Battle multiplier: ${battleMultiplier}x`);
  console.log(`Total multiplier: ${result.totalMultiplier}x`);
  console.log(`Total payout: ${formatPeso(result.totalPayout)}`);
  console.log(`Net outcome: ${formatPeso(result.netOutcome)}`);
}

function formatPeso(centavos: number): string {
  return `PHP ${(centavos / CENTAVOS_PER_PESO).toFixed(2)}`;
}

function clearTerminal(): void {
  if (output.isTTY) {
    output.write("\x1Bc");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

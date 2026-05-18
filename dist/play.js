"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:readline/promises");
const node_process_1 = require("node:process");
const promises_2 = require("node:timers/promises");
const engine_js_1 = require("./math/engine.js");
const rng_js_1 = require("./math/rng.js");
const config_js_1 = require("./math/config.js");
const types_js_1 = require("./math/types.js");
const SYMBOL_LABELS = {
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
const SYMBOL_NAMES = {
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
const DISPLAY_SYMBOLS = Object.keys(SYMBOL_LABELS);
const ATTACK_SYMBOLS = [
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
const ZOMBIE_SYMBOLS = ["EMPTY", "BONUS", "ZOMBIE_15", "ZOMBIE_20", "ZOMBIE_50"];
async function main() {
    const args = process.argv.slice(2);
    const rng = new rng_js_1.CryptoRng();
    const bet = parseBet(args[0]) ?? (await promptForBet());
    const mode = parseMode(args[1]) ?? (await promptForMode());
    console.log("");
    console.log(`Bet: ${formatPeso(bet)} (${bet} centavos)`);
    console.log(`Mode: ${mode === "bonus" ? "Bonus buy" : "Base spin"}`);
    console.log("");
    if (mode === "bonus") {
        const result = (0, engine_js_1.buyBonus)({ baseBet: bet }, rng);
        await animateBonusBuy(result, rng);
        printBonusBuySummary(result);
        return;
    }
    const result = (0, engine_js_1.spin)({ baseBet: bet, mode: "base", source: "paid_spin" }, rng);
    await animateSpin(result, rng, "Base spin");
    printSpinSummary(result);
}
async function promptForBet() {
    const rl = (0, promises_1.createInterface)({ input: node_process_1.stdin, output: node_process_1.stdout });
    try {
        while (true) {
            const answer = await rl.question(`Choose bet in pesos (${config_js_1.ALLOWED_BETS_PESOS.join(", ")}): `);
            const bet = parseBet(answer);
            if (bet) {
                return bet;
            }
            console.log("Invalid bet. Use one of the listed peso values.");
        }
    }
    finally {
        rl.close();
    }
}
async function promptForMode() {
    const rl = (0, promises_1.createInterface)({ input: node_process_1.stdin, output: node_process_1.stdout });
    try {
        while (true) {
            const answer = await rl.question("Play base spin or bonus buy? (base/bonus): ");
            const mode = parseMode(answer);
            if (mode) {
                return mode;
            }
            console.log("Invalid mode. Type base or bonus.");
        }
    }
    finally {
        rl.close();
    }
}
function parseBet(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value.replace(/php/gi, "").replace(/[,\s]/g, "");
    const pesos = Number(normalized);
    if (!Number.isFinite(pesos)) {
        return undefined;
    }
    const centavos = Math.round(pesos * config_js_1.CENTAVOS_PER_PESO);
    return config_js_1.ALLOWED_BETS_CENTAVOS.includes(centavos)
        ? centavos
        : undefined;
}
function parseMode(value) {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "base" || normalized === "spin") {
        return "base";
    }
    if (normalized === "bonus" || normalized === "buy" || normalized === "bonus-buy") {
        return "bonus";
    }
    return undefined;
}
async function animateBonusBuy(result, rng) {
    console.log(`Buying bonus for ${formatPeso(result.cost)}. Awarded ${result.freeSpinsAwarded} feature spins.`);
    for (const spinResult of result.spins) {
        const spinNumber = spinResult.input.freeSpinIndex ?? 0;
        await animateSpin(spinResult, rng, `Bonus free spin ${spinNumber}/${result.freeSpinsAwarded}`);
    }
}
async function animateSpin(result, rng, title) {
    const frames = 14;
    for (let frame = 0; frame < frames; frame += 1) {
        clearTerminal();
        console.log(title);
        console.log("Spinning...");
        console.log("");
        printBoard(randomBoard(rng), false);
        await (0, promises_2.setTimeout)(65 + frame * 8);
    }
    clearTerminal();
    console.log(title);
    console.log("Result");
    console.log("");
    printBoard(result.board, true);
    console.log("");
    console.log(`Multiplier: ${result.totalMultiplier}x | Payout: ${formatPeso(result.payout)}`);
    await (0, promises_2.setTimeout)(900);
}
function randomBoard(rng) {
    const spinPlants = Array.from({ length: 5 }, () => "PEASHOOTER_1");
    const lanes = Array.from({ length: 5 }, () => ({
        plant: undefined,
        zombies: []
    }));
    return { spinPlants, lanes };
}
function printBoard(board, showLegend) {
    console.log("Plants spun:");
    board.spinPlants.forEach((plant, i) => {
        console.log(`  [${i + 1}] ${SYMBOL_LABELS[plant]}`);
    });
    console.log("\nLanes (plant | zombies):");
    for (let i = 0; i < types_js_1.LANES; i++) {
        const lane = board.lanes[i];
        const plantLabel = lane.plant ? SYMBOL_LABELS[lane.plant] : "-----";
        const zombieLabels = lane.zombies.map((z) => SYMBOL_LABELS[z.symbol]).join(", ") || "none";
        console.log(`  Lane ${i + 1}: ${plantLabel} | [${zombieLabels}]`);
    }
    if (showLegend) {
        printLegend(board);
    }
}
function printLegend(board) {
    const allSymbols = new Set();
    board.spinPlants.forEach((s) => allSymbols.add(s));
    board.lanes.forEach((lane) => {
        if (lane.plant)
            allSymbols.add(lane.plant);
        lane.zombies.forEach((z) => allSymbols.add(z.symbol));
    });
    const items = DISPLAY_SYMBOLS.filter((symbol) => allSymbols.has(symbol))
        .map((symbol) => `${SYMBOL_LABELS[symbol].trim() || "----"}=${SYMBOL_NAMES[symbol]}`)
        .join(" | ");
    console.log("");
    console.log(`Legend: ${items}`);
}
function printSpinSummary(result) {
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
function printBonusBuySummary(result) {
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
function formatPeso(centavos) {
    return `PHP ${(centavos / config_js_1.CENTAVOS_PER_PESO).toFixed(2)}`;
}
function clearTerminal() {
    if (node_process_1.stdout.isTTY) {
        node_process_1.stdout.write("\x1Bc");
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

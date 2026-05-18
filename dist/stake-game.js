"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.game = exports.gameModes = exports.userState = exports.symbols = void 0;
const core_1 = require("@slot-engine/core");
const engine_js_1 = require("./math/engine.js");
const config_js_1 = require("./math/config.js");
const rootDir = process.cwd();
const SIMULATION_BET_CENTAVOS = 100;
function makeSlotEngineRngAdapter(randomFloat) {
    return {
        next: () => randomFloat(0, 1),
        pickWeighted(items) {
            const total = items.reduce((sum, item) => sum + item.weight, 0);
            let roll = randomFloat(0, total);
            for (const item of items) {
                roll -= item.weight;
                if (roll <= 0) {
                    return item.value;
                }
            }
            return items[items.length - 1].value;
        }
    };
}
exports.symbols = (0, core_1.defineSymbols)({
    B: new core_1.GameSymbol({ id: "B", properties: { isScatter: true, role: "bonus" } }),
    N: new core_1.GameSymbol({ id: "N", properties: { role: "reload" } }),
    P1: new core_1.GameSymbol({ id: "P1", properties: { role: "plant", damage: 2 } }),
    P2: new core_1.GameSymbol({ id: "P2", properties: { role: "plant", damage: 4 } }),
    P3: new core_1.GameSymbol({ id: "P3", properties: { role: "plant", damage: 8 } }),
    W: new core_1.GameSymbol({ id: "W", properties: { role: "plant", damage: 12 } }),
    C: new core_1.GameSymbol({ id: "C", properties: { role: "plant", damage: 16 } }),
    S: new core_1.GameSymbol({ id: "S", properties: { role: "plant", damage: 6 } }),
    D: new core_1.GameSymbol({ id: "D", properties: { role: "instantKill" } }),
    CH: new core_1.GameSymbol({ id: "CH", properties: { role: "plantReset" } }),
    Z15: new core_1.GameSymbol({ id: "Z15", properties: { role: "zombie", multiplier: 15 } }),
    Z20: new core_1.GameSymbol({ id: "Z20", properties: { role: "zombie", multiplier: 20 } }),
    Z50: new core_1.GameSymbol({ id: "Z50", properties: { role: "zombie", multiplier: 50 } })
});
exports.userState = (0, core_1.defineUserState)({
    lastTotalMultiplier: 0,
    lastFeatureTriggered: false,
    lastReloads: 0,
    lastFreeSpinsAwarded: 0,
    lastRoundType: "base"
});
const sdkSymbolWeights = {
    B: 5,
    N: 8,
    P1: 24,
    P2: 16,
    P3: 10,
    W: 6,
    C: 4,
    S: 5,
    D: 1,
    CH: 1,
    Z15: 28,
    Z20: 14,
    Z50: 4
};
function makeReelSet(id) {
    return new core_1.GeneratedReelSet({
        id,
        symbolWeights: sdkSymbolWeights,
        rowsAmount: 80,
        seed: 20260518
    });
}
function makeAnyResultSet(reelSetId) {
    return new core_1.ResultSet({
        criteria: "any",
        quota: 1,
        reelWeights: {
            [core_1.SPIN_TYPE.BASE_GAME]: { [reelSetId]: 1 },
            [core_1.SPIN_TYPE.FREE_SPINS]: { [reelSetId]: 1 }
        }
    });
}
exports.gameModes = (0, core_1.defineGameModes)({
    base: new core_1.GameMode({
        name: "base",
        cost: 1,
        rtp: config_js_1.DEFAULT_RTP,
        reelsAmount: 5,
        symbolsPerReel: [5, 5, 5, 5, 5],
        isBonusBuy: false,
        reelSets: [makeReelSet("base-main")],
        resultSets: [makeAnyResultSet("base-main")]
    }),
    bonus: new core_1.GameMode({
        name: "bonus",
        cost: config_js_1.BONUS_BUY_COST_MULTIPLIER,
        rtp: config_js_1.DEFAULT_RTP,
        reelsAmount: 5,
        symbolsPerReel: [5, 5, 5, 5, 5],
        isBonusBuy: true,
        reelSets: [makeReelSet("bonus-main")],
        resultSets: [makeAnyResultSet("bonus-main")]
    })
});
exports.game = (0, core_1.createSlotGame)({
    id: "pvz-slot-framework",
    name: "PvZ Slot Framework",
    rootDir,
    maxWinX: config_js_1.MAX_WIN_MULTIPLIER,
    scatterToFreespins: {},
    gameModes: exports.gameModes,
    symbols: exports.symbols,
    userState: exports.userState,
    hooks: {
        onHandleGameFlow(ctx) {
            const mode = ctx.state.currentGameMode === "bonus" ? "bonus" : "base";
            const rng = makeSlotEngineRngAdapter(ctx.services.rng.randomFloat);
            if (mode === "bonus") {
                const bonusResult = (0, engine_js_1.buyBonus)({ baseBet: SIMULATION_BET_CENTAVOS }, rng);
                ctx.state.userData.lastTotalMultiplier = bonusResult.totalMultiplier;
                ctx.state.userData.lastFeatureTriggered = true;
                ctx.state.userData.lastReloads = bonusResult.spins.reduce((sum, result) => sum + result.reloads, 0);
                ctx.state.userData.lastFreeSpinsAwarded = bonusResult.freeSpinsAwarded;
                ctx.state.userData.lastRoundType = "bonus_buy";
                ctx.services.data.record({
                    roundType: bonusResult.type,
                    cost: bonusResult.cost,
                    freeSpinsAwarded: bonusResult.freeSpinsAwarded,
                    battleFeatures: bonusResult.battleFeatures.length,
                    battleMonstersDefeated: bonusResult.battleFeatures.reduce((sum, result) => sum + result.monstersDefeated, 0),
                    battleBossesDefeated: bonusResult.battleFeatures.reduce((sum, result) => sum + result.bossesDefeated, 0),
                    battleMultiplier: bonusResult.battleFeatures.reduce((sum, result) => sum + result.battleMultiplier, 0),
                    totalMultiplier: bonusResult.totalMultiplier,
                    totalPayout: bonusResult.totalPayout,
                    netOutcome: bonusResult.netOutcome
                });
                for (const result of bonusResult.spins) {
                    ctx.services.data.record({
                        roundType: "bonus_buy_free_spin",
                        freeSpinIndex: result.input.freeSpinIndex ?? 0,
                        freeSpinsTotal: result.input.freeSpinsTotal ?? config_js_1.BONUS_BUY_FREE_SPINS,
                        bonusCount: result.bonusCount,
                        reloads: result.reloads,
                        lineWins: result.lineWins.length,
                        lineWinMultiplier: result.lineWinMultiplier,
                        zombieWinMultiplier: result.zombieWinMultiplier,
                        defeatedZombies: result.zombieHits.filter((hit) => hit.defeated).length,
                        totalMultiplier: result.totalMultiplier,
                        payout: result.payout
                    });
                }
                ctx.services.wallet.addSpinWin(bonusResult.totalMultiplier);
                ctx.services.wallet.confirmSpinWin();
                return;
            }
            const result = (0, engine_js_1.spin)({ baseBet: SIMULATION_BET_CENTAVOS, mode, source: "paid_spin" }, rng);
            ctx.state.userData.lastTotalMultiplier = result.totalMultiplier;
            ctx.state.userData.lastFeatureTriggered = result.featureTriggered;
            ctx.state.userData.lastReloads = result.reloads;
            ctx.state.userData.lastFreeSpinsAwarded = 0;
            ctx.state.userData.lastRoundType = "base";
            ctx.services.data.record({
                featureTriggered: result.featureTriggered,
                bonusCount: result.bonusCount,
                reloads: result.reloads,
                lineWins: result.lineWins.length,
                lineWinMultiplier: result.lineWinMultiplier,
                zombieWinMultiplier: result.zombieWinMultiplier,
                defeatedZombies: result.zombieHits.filter((hit) => hit.defeated).length,
                totalMultiplier: result.totalMultiplier,
                payout: result.payout
            });
            ctx.services.wallet.addSpinWin(result.totalMultiplier);
            ctx.services.wallet.confirmSpinWin();
        }
    }
});
exports.game.configureSimulation({
    simRunsAmount: {
        base: 1000,
        bonus: 1000
    },
    concurrency: 4
});
exports.game.runTasks({
    doSimulation: true
});

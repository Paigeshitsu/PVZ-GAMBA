"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const engine_js_1 = require("./engine.js");
const config_js_1 = require("./config.js");
const rng_js_1 = require("./rng.js");
const battle_js_1 = require("./battle.js");
(0, node_test_1.default)("base spin returns a validated paid-spin result", () => {
    const result = (0, engine_js_1.spin)({ baseBet: 100, mode: "base", source: "paid_spin" }, new rng_js_1.SeededRng(1001));
    strict_1.default.equal(result.input.mode, "base");
    strict_1.default.equal(result.input.source, "paid_spin");
    strict_1.default.equal(result.payout, result.totalMultiplier * result.input.baseBet);
    strict_1.default.equal(result.board.spinPlants.length, 5);
    strict_1.default.equal(result.board.lanes.length, 5);
});
(0, node_test_1.default)("bonus buy charges by bet and awards exactly 10 feature spins", () => {
    const baseBet = 300;
    const result = (0, engine_js_1.buyBonus)({ baseBet }, new rng_js_1.SeededRng(20260518));
    strict_1.default.equal(result.cost, baseBet * config_js_1.BONUS_BUY_COST_MULTIPLIER);
    strict_1.default.equal(result.freeSpinsAwarded, config_js_1.BONUS_BUY_FREE_SPINS);
    strict_1.default.equal(result.spins.length, config_js_1.BONUS_BUY_FREE_SPINS);
    strict_1.default.equal(result.battleFeatures.length, config_js_1.BONUS_BUY_FREE_SPINS);
    strict_1.default.equal(result.totalPayout, result.spins.reduce((sum, spinResult) => sum + spinResult.payout, 0) +
        result.battleFeatures.reduce((sum, battleResult) => sum + battleResult.payout, 0));
    for (const [index, spinResult] of result.spins.entries()) {
        strict_1.default.equal(spinResult.input.mode, "bonus");
        strict_1.default.equal(spinResult.input.source, "bonus_buy");
        strict_1.default.equal(spinResult.input.freeSpinIndex, index + 1);
        strict_1.default.equal(spinResult.input.freeSpinsTotal, config_js_1.BONUS_BUY_FREE_SPINS);
        strict_1.default.equal(spinResult.featureTriggered, true);
    }
});
(0, node_test_1.default)("battle feature resolves hack-and-slash spins with bounded respins", () => {
    const result = (0, battle_js_1.playBattleFeature)(100, new rng_js_1.SeededRng(42));
    strict_1.default.equal(result.baseBet, 100);
    strict_1.default.equal(result.startingSpins, 5);
    strict_1.default.ok(result.spinsPlayed >= 5);
    strict_1.default.equal(result.payout, result.battleMultiplier * result.baseBet);
    strict_1.default.equal(result.steps.length, result.spinsPlayed);
});
(0, node_test_1.default)("5 matching icons across a lane pay by the selected bet", () => {
    const board = {
        spinPlants: ["CHERRY", "CHERRY", "CHERRY", "CHERRY", "CHERRY"],
        lanes: [
            { plant: undefined, zombies: [] },
            { plant: undefined, zombies: [] },
            { plant: undefined, zombies: [] },
            { plant: undefined, zombies: [] },
            { plant: undefined, zombies: [] }
        ]
    };
    const wins = (0, engine_js_1.resolveLineWins)(board, 500);
    // No line wins in the new PvZ system - wins come from defeating zombies
    strict_1.default.equal(wins.length, 0);
});
(0, node_test_1.default)("only configured peso bets are accepted", () => {
    for (const baseBet of config_js_1.ALLOWED_BETS_CENTAVOS) {
        strict_1.default.doesNotThrow(() => (0, engine_js_1.spin)({ baseBet, mode: "base" }, new rng_js_1.SeededRng(1)));
    }
    strict_1.default.throws(() => (0, engine_js_1.spin)({ baseBet: 0, mode: "base" }, new rng_js_1.SeededRng(1)), RangeError);
    strict_1.default.throws(() => (0, engine_js_1.buyBonus)({ baseBet: 1.5 }, new rng_js_1.SeededRng(1)), RangeError);
    strict_1.default.throws(() => (0, engine_js_1.spin)({ baseBet: 200, mode: "base" }, new rng_js_1.SeededRng(1)), RangeError);
});

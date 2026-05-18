import assert from "node:assert/strict";
import test from "node:test";
import { buyBonus, resolveLineWins, spin } from "./engine.js";
import { ALLOWED_BETS_CENTAVOS, BONUS_BUY_COST_MULTIPLIER, BONUS_BUY_FREE_SPINS } from "./config.js";
import { SeededRng } from "./rng.js";
import type { Board } from "./types.js";
import { playBattleFeature } from "./battle.js";

test("base spin returns a validated paid-spin result", () => {
  const result = spin({ baseBet: 100, mode: "base", source: "paid_spin" }, new SeededRng(1001));

  assert.equal(result.input.mode, "base");
  assert.equal(result.input.source, "paid_spin");
  assert.equal(result.payout, result.totalMultiplier * result.input.baseBet);
  assert.equal(result.board.length, 5);
});

test("bonus buy charges by bet and awards exactly 10 feature spins", () => {
  const baseBet = 300;
  const result = buyBonus({ baseBet }, new SeededRng(20260518));

  assert.equal(result.cost, baseBet * BONUS_BUY_COST_MULTIPLIER);
  assert.equal(result.freeSpinsAwarded, BONUS_BUY_FREE_SPINS);
  assert.equal(result.spins.length, BONUS_BUY_FREE_SPINS);
  assert.equal(result.battleFeatures.length, BONUS_BUY_FREE_SPINS);
  assert.equal(
    result.totalPayout,
    result.spins.reduce((sum, spinResult) => sum + spinResult.payout, 0) +
      result.battleFeatures.reduce((sum, battleResult) => sum + battleResult.payout, 0)
  );

  for (const [index, spinResult] of result.spins.entries()) {
    assert.equal(spinResult.input.mode, "bonus");
    assert.equal(spinResult.input.source, "bonus_buy");
    assert.equal(spinResult.input.freeSpinIndex, index + 1);
    assert.equal(spinResult.input.freeSpinsTotal, BONUS_BUY_FREE_SPINS);
    assert.equal(spinResult.featureTriggered, true);
  }
});

test("battle feature resolves hack-and-slash spins with bounded respins", () => {
  const result = playBattleFeature(100, new SeededRng(42));

  assert.equal(result.baseBet, 100);
  assert.equal(result.startingSpins, 5);
  assert.ok(result.spinsPlayed >= 5);
  assert.equal(result.payout, result.battleMultiplier * result.baseBet);
  assert.equal(result.steps.length, result.spinsPlayed);
});

test("5 matching icons across a lane pay by the selected bet", () => {
  const board: Board = [
    [{ symbol: "CHERRY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }],
    [{ symbol: "CHERRY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }],
    [{ symbol: "CHERRY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }],
    [{ symbol: "CHERRY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }],
    [{ symbol: "CHERRY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }, { symbol: "EMPTY" }]
  ];
  const [win] = resolveLineWins(board, 500);

  assert.equal(win?.row, 0);
  assert.equal(win?.symbol, "CHERRY");
  assert.equal(win?.multiplier, 40);
  assert.equal(win?.payout, 20000);
});

test("only configured peso bets are accepted", () => {
  for (const baseBet of ALLOWED_BETS_CENTAVOS) {
    assert.doesNotThrow(() => spin({ baseBet, mode: "base" }, new SeededRng(1)));
  }

  assert.throws(() => spin({ baseBet: 0, mode: "base" }, new SeededRng(1)), RangeError);
  assert.throws(() => buyBonus({ baseBet: 1.5 }, new SeededRng(1)), RangeError);
  assert.throws(() => spin({ baseBet: 200, mode: "base" }, new SeededRng(1)), RangeError);
});

import {
  GameMode,
  GameSymbol,
  GeneratedReelSet,
  InferGameType,
  ResultSet,
  SPIN_TYPE,
  createSlotGame,
  defineGameModes,
  defineSymbols,
  defineUserState
} from "@slot-engine/core";
import { buyBonus, spin } from "./math/engine.js";
import type { Rng, WeightedItem } from "./math/rng.js";
import { BONUS_BUY_COST_MULTIPLIER, BONUS_BUY_FREE_SPINS, DEFAULT_RTP, MAX_WIN_MULTIPLIER } from "./math/config.js";

const rootDir = process.cwd();
const SIMULATION_BET_CENTAVOS = 100;

function makeSlotEngineRngAdapter(randomFloat: (low: number, high: number) => number): Rng {
  return {
    next: () => randomFloat(0, 1),
    pickWeighted<T>(items: WeightedItem<T>[]): T {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let roll = randomFloat(0, total);

      for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) {
          return item.value;
        }
      }

      return items[items.length - 1]!.value;
    }
  };
}

export const symbols = defineSymbols({
  B: new GameSymbol({ id: "B", properties: { isScatter: true, role: "bonus" } }),
  N: new GameSymbol({ id: "N", properties: { role: "reload" } }),
  P1: new GameSymbol({ id: "P1", properties: { role: "plant", damage: 2 } }),
  P2: new GameSymbol({ id: "P2", properties: { role: "plant", damage: 4 } }),
  P3: new GameSymbol({ id: "P3", properties: { role: "plant", damage: 8 } }),
  W: new GameSymbol({ id: "W", properties: { role: "plant", damage: 12 } }),
  C: new GameSymbol({ id: "C", properties: { role: "plant", damage: 16 } }),
  S: new GameSymbol({ id: "S", properties: { role: "plant", damage: 6 } }),
  D: new GameSymbol({ id: "D", properties: { role: "instantKill" } }),
  CH: new GameSymbol({ id: "CH", properties: { role: "plantReset" } }),
  Z15: new GameSymbol({ id: "Z15", properties: { role: "zombie", multiplier: 15 } }),
  Z20: new GameSymbol({ id: "Z20", properties: { role: "zombie", multiplier: 20 } }),
  Z50: new GameSymbol({ id: "Z50", properties: { role: "zombie", multiplier: 50 } })
});

export type SymbolsType = typeof symbols;

export const userState = defineUserState({
  lastTotalMultiplier: 0,
  lastFeatureTriggered: false,
  lastReloads: 0,
  lastFreeSpinsAwarded: 0,
  lastRoundType: "base"
});

export type UserStateType = typeof userState;

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

function makeReelSet(id: string): GeneratedReelSet {
  return new GeneratedReelSet({
    id,
    symbolWeights: sdkSymbolWeights,
    rowsAmount: 80,
    seed: 20260518
  });
}

function makeAnyResultSet(reelSetId: string): ResultSet<UserStateType> {
  return new ResultSet<UserStateType>({
    criteria: "any",
    quota: 1,
    reelWeights: {
      [SPIN_TYPE.BASE_GAME]: { [reelSetId]: 1 },
      [SPIN_TYPE.FREE_SPINS]: { [reelSetId]: 1 }
    }
  });
}

export const gameModes = defineGameModes({
  base: new GameMode({
    name: "base",
    cost: 1,
    rtp: DEFAULT_RTP,
    reelsAmount: 5,
    symbolsPerReel: [5, 5, 5, 5, 5],
    isBonusBuy: false,
    reelSets: [makeReelSet("base-main")],
    resultSets: [makeAnyResultSet("base-main")]
  }),
  bonus: new GameMode({
    name: "bonus",
    cost: BONUS_BUY_COST_MULTIPLIER,
    rtp: DEFAULT_RTP,
    reelsAmount: 5,
    symbolsPerReel: [5, 5, 5, 5, 5],
    isBonusBuy: true,
    reelSets: [makeReelSet("bonus-main")],
    resultSets: [makeAnyResultSet("bonus-main")]
  })
});

export type GameModesType = typeof gameModes;
export type GameType = InferGameType<GameModesType, SymbolsType, UserStateType>;

export const game = createSlotGame<GameType>({
  id: "pvz-slot-framework",
  name: "PvZ Slot Framework",
  rootDir,
  maxWinX: MAX_WIN_MULTIPLIER,
  scatterToFreespins: {},
  gameModes,
  symbols,
  userState,
  hooks: {
    onHandleGameFlow(ctx) {
      const mode = ctx.state.currentGameMode === "bonus" ? "bonus" : "base";
      const rng = makeSlotEngineRngAdapter(ctx.services.rng.randomFloat);

      if (mode === "bonus") {
        const bonusResult = buyBonus({ baseBet: SIMULATION_BET_CENTAVOS }, rng);

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
            freeSpinsTotal: result.input.freeSpinsTotal ?? BONUS_BUY_FREE_SPINS,
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

      const result = spin({ baseBet: SIMULATION_BET_CENTAVOS, mode, source: "paid_spin" }, rng);

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

game.configureSimulation({
  simRunsAmount: {
    base: 1000,
    bonus: 1000
  },
  concurrency: 4
});

game.runTasks({
  doSimulation: true
});

import type { GameSymbol, SymbolId } from "./types.js";

export const SYMBOLS: Record<SymbolId, GameSymbol> = {
  EMPTY: { id: "EMPTY", kind: "empty" },
  BONUS: { id: "BONUS", kind: "bonus", isBonus: true },
  NUT: { id: "NUT", kind: "utility", isReload: true },
  PEASHOOTER_1: {
    id: "PEASHOOTER_1",
    kind: "plant",
    damage: 2,
    featureUpgradeTo: "MUSHROOM_1"
  },
  PEASHOOTER_2: {
    id: "PEASHOOTER_2",
    kind: "plant",
    damage: 4,
    featureUpgradeTo: "MUSHROOM_2"
  },
  PEASHOOTER_3: {
    id: "PEASHOOTER_3",
    kind: "plant",
    damage: 8,
    featureUpgradeTo: "MUSHROOM_3"
  },
  WATERMELON: {
    id: "WATERMELON",
    kind: "plant",
    damage: 12,
    featureUpgradeTo: "MUSHROOM_3"
  },
  CHERRY: { id: "CHERRY", kind: "plant", damage: 16 },
  SQUASH: { id: "SQUASH", kind: "plant", damage: 6 },
  DOOM_SHROOM: {
    id: "DOOM_SHROOM",
    kind: "utility",
    isInstantKill: true
  },
  CHILI: {
    id: "CHILI",
    kind: "utility",
    isPlantReset: true
  },
  MUSHROOM_1: { id: "MUSHROOM_1", kind: "plant", damage: 3 },
  MUSHROOM_2: { id: "MUSHROOM_2", kind: "plant", damage: 6 },
  MUSHROOM_3: { id: "MUSHROOM_3", kind: "plant", damage: 10 },
  ZOMBIE_15: { id: "ZOMBIE_15", kind: "zombie", multiplier: 15 },
  ZOMBIE_20: { id: "ZOMBIE_20", kind: "zombie", multiplier: 20 },
  ZOMBIE_50: { id: "ZOMBIE_50", kind: "zombie", multiplier: 50 }
};

export function getSymbol(id: SymbolId): GameSymbol {
  return SYMBOLS[id];
}

import type { SymbolId } from "./types.js";

export const BONUS_TRIGGER_COUNT = 3;
export const BONUS_BUY_FREE_SPINS = 10;
export const BONUS_BUY_COST_MULTIPLIER = 100;
export const DEFAULT_RTP = 0.96;
export const MAX_WIN_MULTIPLIER = 5000;
export const CENTAVOS_PER_PESO = 100;

export const ALLOWED_BETS_CENTAVOS = [50, 100, 300, 500, 1000, 1500, 2000, 5000, 7500, 10000] as const;
export const ALLOWED_BETS_PESOS = ALLOWED_BETS_CENTAVOS.map((bet) => bet / CENTAVOS_PER_PESO);

export const FIVE_OF_A_KIND_PAYTABLE: Partial<Record<SymbolId, number>> = {
  BONUS: 100,
  DOOM_SHROOM: 75,
  CHILI: 50,
  CHERRY: 40,
  WATERMELON: 30,
  SQUASH: 20,
  PEASHOOTER_3: 15,
  MUSHROOM_3: 15,
  PEASHOOTER_2: 10,
  MUSHROOM_2: 10,
  PEASHOOTER_1: 5,
  MUSHROOM_1: 5,
  NUT: 3
};

export function validateBaseBet(baseBet: number): void {
  if (!Number.isSafeInteger(baseBet) || baseBet <= 0) {
    throw new RangeError("baseBet must be a positive integer in centavos.");
  }

  if (!ALLOWED_BETS_CENTAVOS.includes(baseBet as (typeof ALLOWED_BETS_CENTAVOS)[number])) {
    throw new RangeError(`baseBet must be one of the allowed peso bets: ${ALLOWED_BETS_PESOS.join(", ")}.`);
  }
}

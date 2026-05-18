"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIVE_OF_A_KIND_PAYTABLE = exports.ALLOWED_BETS_PESOS = exports.ALLOWED_BETS_CENTAVOS = exports.CENTAVOS_PER_PESO = exports.MAX_WIN_MULTIPLIER = exports.DEFAULT_RTP = exports.BONUS_BUY_COST_MULTIPLIER = exports.BONUS_BUY_FREE_SPINS = exports.BONUS_TRIGGER_COUNT = void 0;
exports.validateBaseBet = validateBaseBet;
exports.BONUS_TRIGGER_COUNT = 3;
exports.BONUS_BUY_FREE_SPINS = 10;
exports.BONUS_BUY_COST_MULTIPLIER = 100;
exports.DEFAULT_RTP = 0.96;
exports.MAX_WIN_MULTIPLIER = 5000;
exports.CENTAVOS_PER_PESO = 100;
exports.ALLOWED_BETS_CENTAVOS = [50, 100, 300, 500, 1000, 1500, 2000, 5000, 7500, 10000];
exports.ALLOWED_BETS_PESOS = exports.ALLOWED_BETS_CENTAVOS.map((bet) => bet / exports.CENTAVOS_PER_PESO);
exports.FIVE_OF_A_KIND_PAYTABLE = {
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
function validateBaseBet(baseBet) {
    if (!Number.isSafeInteger(baseBet) || baseBet <= 0) {
        throw new RangeError("baseBet must be a positive integer in centavos.");
    }
    if (!exports.ALLOWED_BETS_CENTAVOS.includes(baseBet)) {
        throw new RangeError(`baseBet must be one of the allowed peso bets: ${exports.ALLOWED_BETS_PESOS.join(", ")}.`);
    }
}

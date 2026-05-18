"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spin = spin;
exports.resolveLineWins = resolveLineWins;
exports.buyBonus = buyBonus;
const reels_js_1 = require("./reels.js");
const types_js_1 = require("./types.js");
const symbols_js_1 = require("./symbols.js");
const config_js_1 = require("./config.js");
const battle_js_1 = require("./battle.js");
function spin(input, rng) {
    (0, config_js_1.validateBaseBet)(input.baseBet);
    const events = [];
    const board = (0, reels_js_1.drawBoard)(rng);
    events.push({ type: "board_drawn", message: "Initial 5x5 board drawn." });
    const bonusCount = (0, reels_js_1.countSymbols)(board, "BONUS");
    const featureTriggered = input.mode === "bonus" || bonusCount >= config_js_1.BONUS_TRIGGER_COUNT;
    const darkMode = featureTriggered;
    if (featureTriggered) {
        events.push({
            type: "bonus_triggered",
            message: "Dark mode triggered; plant icons upgrade into mushrooms."
        });
        upgradePlantsToMushrooms(board);
        (0, reels_js_1.rerollPlantCells)(board, rng, (symbol) => symbol === "EMPTY" || symbol === "PEASHOOTER_1");
        events.push({
            type: "dark_mode_upgrade",
            message: "Plant layer upgraded and rerolled for feature resolution."
        });
    }
    if (hasSymbol(board, "CHILI")) {
        (0, reels_js_1.rerollPlantCells)(board, rng, () => true);
        events.push({
            type: "plant_reset",
            message: "Chili reset the plant board before attacks resolved."
        });
    }
    const reloads = (0, reels_js_1.countSymbols)(board, "NUT");
    for (let reload = 0; reload < reloads; reload += 1) {
        (0, reels_js_1.rerollPlantCells)(board, rng, (symbol) => symbol === "EMPTY" || symbol === "PEASHOOTER_1");
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
function resolveLineWins(board, baseBet) {
    (0, config_js_1.validateBaseBet)(baseBet);
    const lineWins = [];
    for (let row = 0; row < types_js_1.ROWS; row += 1) {
        const firstSymbol = board[0][row].symbol;
        const multiplier = config_js_1.FIVE_OF_A_KIND_PAYTABLE[firstSymbol] ?? 0;
        if (multiplier === 0) {
            continue;
        }
        const isFiveOfAKind = board.every((reel) => reel[row].symbol === firstSymbol);
        if (!isFiveOfAKind) {
            continue;
        }
        lineWins.push({
            row,
            symbol: firstSymbol,
            count: types_js_1.REELS,
            multiplier,
            payout: multiplier * baseBet
        });
    }
    return lineWins;
}
function buyBonus(input, rng) {
    (0, config_js_1.validateBaseBet)(input.baseBet);
    const cost = input.baseBet * config_js_1.BONUS_BUY_COST_MULTIPLIER;
    const events = [
        {
            type: "bonus_buy_purchased",
            message: `Bonus bought for ${config_js_1.BONUS_BUY_COST_MULTIPLIER}x bet.`
        },
        {
            type: "free_spin_awarded",
            message: `${config_js_1.BONUS_BUY_FREE_SPINS} free spins awarded.`
        }
    ];
    const spins = [];
    const battleFeatures = [];
    for (let spinIndex = 1; spinIndex <= config_js_1.BONUS_BUY_FREE_SPINS; spinIndex += 1) {
        spins.push(spin({
            baseBet: input.baseBet,
            mode: "bonus",
            source: "bonus_buy",
            freeSpinIndex: spinIndex,
            freeSpinsTotal: config_js_1.BONUS_BUY_FREE_SPINS
        }, rng));
        battleFeatures.push((0, battle_js_1.playBattleFeature)(input.baseBet, rng));
    }
    const spinMultiplier = spins.reduce((sum, result) => sum + result.totalMultiplier, 0);
    const battleMultiplier = battleFeatures.reduce((sum, result) => sum + result.battleMultiplier, 0);
    const totalMultiplier = spinMultiplier + battleMultiplier;
    const totalPayout = spins.reduce((sum, result) => sum + result.payout, 0) +
        battleFeatures.reduce((sum, result) => sum + result.payout, 0);
    return {
        type: "bonus_buy",
        baseBet: input.baseBet,
        cost,
        freeSpinsAwarded: config_js_1.BONUS_BUY_FREE_SPINS,
        spins,
        battleFeatures,
        totalMultiplier,
        totalPayout,
        netOutcome: totalPayout - cost,
        events
    };
}
function upgradePlantsToMushrooms(board) {
    for (const reel of board) {
        for (const cell of reel) {
            const upgradeTo = (0, symbols_js_1.getSymbol)(cell.symbol).featureUpgradeTo;
            if (upgradeTo) {
                cell.symbol = upgradeTo;
            }
        }
    }
}
function hasSymbol(board, symbol) {
    return board.some((reel) => reel.some((cell) => cell.symbol === symbol));
}
function resolveZombies(board, instantKill) {
    const hits = [];
    for (let reel = 0; reel < types_js_1.REELS; reel += 1) {
        for (let row = types_js_1.PLANT_ROWS; row < types_js_1.ROWS; row += 1) {
            const zombie = (0, symbols_js_1.getSymbol)(board[reel][row].symbol);
            if (zombie.kind !== "zombie") {
                continue;
            }
            const multiplier = zombie.multiplier ?? 0;
            const damageTaken = instantKill ? multiplier : laneDamage(board, reel);
            hits.push({
                position: { reel, row },
                symbol: zombie.id,
                multiplier,
                damageTaken,
                defeated: instantKill || damageTaken >= multiplier
            });
        }
    }
    return hits;
}
function laneDamage(board, reel) {
    let damage = 0;
    for (let row = 0; row < types_js_1.PLANT_ROWS; row += 1) {
        damage += (0, symbols_js_1.getSymbol)(board[reel][row].symbol).damage ?? 0;
    }
    const leftSplash = reel > 0 ? splashDamage(board, reel - 1) : 0;
    const rightSplash = reel < types_js_1.REELS - 1 ? splashDamage(board, reel + 1) : 0;
    return damage + leftSplash + rightSplash;
}
function splashDamage(board, reel) {
    let damage = 0;
    for (let row = 0; row < types_js_1.PLANT_ROWS; row += 1) {
        const symbol = board[reel][row].symbol;
        if (symbol === "WATERMELON" || symbol === "CHERRY") {
            damage += Math.floor(((0, symbols_js_1.getSymbol)(symbol).damage ?? 0) / 2);
        }
    }
    return damage;
}

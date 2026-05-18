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
    // Check each lane for 5-of-a-kind bonus (if plants were in rows in traditional sense)
    // For now, we'll skip this since plants are placed individually, not in rows
    // You can add custom line-win logic here if needed
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
    // Upgrade spun plants
    for (let i = 0; i < board.spinPlants.length; i++) {
        const upgradeTo = (0, symbols_js_1.getSymbol)(board.spinPlants[i]).featureUpgradeTo;
        if (upgradeTo) {
            board.spinPlants[i] = upgradeTo;
        }
    }
    // Upgrade plants in lanes
    for (const lane of board.lanes) {
        if (lane.plant) {
            const upgradeTo = (0, symbols_js_1.getSymbol)(lane.plant).featureUpgradeTo;
            if (upgradeTo) {
                lane.plant = upgradeTo;
            }
        }
    }
}
function hasSymbol(board, symbol) {
    // Check spin plants
    const hasInSpin = board.spinPlants.includes(symbol);
    // Check lanes (both plant and zombies)
    const hasInLanes = board.lanes.some((lane) => lane.plant === symbol || lane.zombies.some((z) => z.symbol === symbol));
    return hasInSpin || hasInLanes;
}
function resolveZombies(board, instantKill) {
    const hits = [];
    for (let laneIndex = 0; laneIndex < types_js_1.LANES; laneIndex += 1) {
        const lane = board.lanes[laneIndex];
        // No zombies in this lane
        if (lane.zombies.length === 0) {
            continue;
        }
        // Get plant damage if one is deployed in this lane
        const plantDamage = lane.plant ? ((0, symbols_js_1.getSymbol)(lane.plant).damage ?? 0) : 0;
        // Attack all zombies in this lane
        for (const zombie of lane.zombies) {
            const totalDamage = instantKill ? zombie.health : plantDamage;
            const defeated = instantKill || totalDamage >= zombie.health;
            hits.push({
                position: { reel: 0, row: laneIndex },
                symbol: zombie.symbol,
                multiplier: zombie.health, // The original HP value is the multiplier
                damageTaken: totalDamage,
                defeated
            });
        }
    }
    return hits;
}

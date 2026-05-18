"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playBattleFeature = playBattleFeature;
const config_js_1 = require("./config.js");
const BATTLE_REELS = 3;
const BOSS_INTERVAL = 4;
const battleSymbolWeights = [
    { value: "MISS", weight: 82 },
    { value: "DAGGER", weight: 7 },
    { value: "KNIFE", weight: 5 },
    { value: "SWORD", weight: 3 },
    { value: "AXE", weight: 1 },
    { value: "CHEST", weight: 2 }
];
const battleSymbols = {
    MISS: { id: "MISS", hits: 0, respinsAwarded: 0 },
    DAGGER: { id: "DAGGER", hits: 1, respinsAwarded: 1 },
    KNIFE: { id: "KNIFE", hits: 2, respinsAwarded: 1 },
    SWORD: { id: "SWORD", hits: 3, respinsAwarded: 1 },
    AXE: { id: "AXE", hits: 4, respinsAwarded: 1 },
    CHEST: { id: "CHEST", hits: 0, respinsAwarded: 1, chestMultiplier: 2 }
};
const levelUpAwards = [
    "weapon_upgrade",
    "chest_upgrade",
    "sticky_multiplier",
    "boss_chest_bonus",
    "opening_strike",
    "extra_battle_spin"
];
function playBattleFeature(baseBet, rng, startingSpins = 5) {
    (0, config_js_1.validateBaseBet)(baseBet);
    let spinsRemaining = startingSpins;
    let spinNumber = 0;
    let respinsAwarded = 0;
    let monstersDefeated = 0;
    let bossesDefeated = 0;
    let chestMultiplier = 0;
    let battleMultiplier = 0;
    const levelUps = [];
    const steps = [];
    let monster = createMonster(1);
    while (spinsRemaining > 0) {
        spinsRemaining -= 1;
        spinNumber += 1;
        const symbols = drawBattleSymbols(rng);
        const nonMissSymbols = symbols.filter((symbol) => symbol !== "MISS").length;
        const bonusRespins = nonMissSymbols === BATTLE_REELS ? 5 : 0;
        const symbolRespins = symbols.reduce((sum, symbol) => sum + battleSymbols[symbol].respinsAwarded, 0);
        const awardedThisSpin = symbolRespins + bonusRespins;
        respinsAwarded += awardedThisSpin;
        spinsRemaining += awardedThisSpin;
        let hitsApplied = 0;
        let criticalHits = 0;
        let chestWonThisSpin = 0;
        const monsterBefore = cloneMonster(monster);
        for (const symbol of symbols) {
            const battleSymbol = battleSymbols[symbol];
            if (battleSymbol.chestMultiplier) {
                const upgradedChest = battleSymbol.chestMultiplier + levelUps.filter((award) => award === "chest_upgrade").length;
                chestWonThisSpin += upgradedChest;
                continue;
            }
            const upgradedHits = battleSymbol.hits + levelUps.filter((award) => award === "weapon_upgrade").length;
            const isCritical = upgradedHits > 0 && rng.next() < 0.1;
            const hitValue = isCritical ? Math.max(upgradedHits, 3) : upgradedHits;
            const applied = Math.min(monster.remainingHealth, hitValue);
            monster.remainingHealth -= applied;
            hitsApplied += applied;
            if (isCritical) {
                criticalHits += 1;
            }
            if (monster.remainingHealth === 0) {
                break;
            }
        }
        let defeatedMonster;
        let levelUpAwarded;
        if (monster.remainingHealth === 0) {
            defeatedMonster = cloneMonster(monster);
            monstersDefeated += 1;
            chestWonThisSpin += monster.isBoss ? 10 * monster.level : 2 * monster.level;
            if (monster.isBoss) {
                bossesDefeated += 1;
                levelUpAwarded = levelUpAwards[levelUps.length % levelUpAwards.length];
                levelUps.push(levelUpAwarded);
                if (levelUpAwarded === "sticky_multiplier") {
                    battleMultiplier += 5;
                }
                if (levelUpAwarded === "extra_battle_spin") {
                    spinsRemaining += 1;
                    respinsAwarded += 1;
                }
            }
            monster = createMonster(monster.index + 1);
            if (levelUpAwarded === "opening_strike") {
                const openingStrike = Math.min(monster.remainingHealth, 2);
                monster.remainingHealth -= openingStrike;
                hitsApplied += openingStrike;
            }
        }
        chestMultiplier += chestWonThisSpin;
        battleMultiplier += chestWonThisSpin;
        steps.push({
            spinNumber,
            symbols,
            hitsApplied,
            criticalHits,
            respinsAwarded: awardedThisSpin,
            chestMultiplier: chestWonThisSpin,
            monsterBefore,
            monsterAfter: cloneMonster(monster),
            defeatedMonster,
            levelUpAwarded
        });
    }
    return {
        baseBet,
        startingSpins,
        spinsPlayed: spinNumber,
        respinsAwarded,
        monstersDefeated,
        bossesDefeated,
        levelUps,
        chestMultiplier,
        battleMultiplier,
        payout: battleMultiplier * baseBet,
        steps
    };
}
function drawBattleSymbols(rng) {
    return Array.from({ length: BATTLE_REELS }, () => rng.pickWeighted(battleSymbolWeights));
}
function createMonster(index) {
    const level = Math.min(4, Math.ceil(index / BOSS_INTERVAL));
    const isBoss = index % BOSS_INTERVAL === 0;
    const startingHealth = isBoss ? level + 5 : level + 2;
    return {
        index,
        level,
        isBoss,
        startingHealth,
        remainingHealth: startingHealth
    };
}
function cloneMonster(monster) {
    return { ...monster };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawBoard = drawBoard;
exports.cloneBoard = cloneBoard;
exports.countSymbols = countSymbols;
exports.rerollPlantCells = rerollPlantCells;
const types_js_1 = require("./types.js");
const plantLayerWeights = [
    { value: "PEASHOOTER_1", weight: 24 },
    { value: "PEASHOOTER_2", weight: 16 },
    { value: "PEASHOOTER_3", weight: 10 },
    { value: "WATERMELON", weight: 6 },
    { value: "CHERRY", weight: 4 },
    { value: "SQUASH", weight: 5 },
    { value: "NUT", weight: 8 },
    { value: "BONUS", weight: 5 },
    { value: "DOOM_SHROOM", weight: 1 },
    { value: "CHILI", weight: 1 },
    { value: "EMPTY", weight: 20 }
];
const zombieLayerWeights = [
    { value: "ZOMBIE_15", weight: 28 },
    { value: "ZOMBIE_20", weight: 14 },
    { value: "ZOMBIE_50", weight: 4 },
    { value: "BONUS", weight: 4 },
    { value: "EMPTY", weight: 50 }
];
function drawBoard(rng) {
    return Array.from({ length: types_js_1.REELS }, (_, reel) => Array.from({ length: types_js_1.ROWS }, (_, row) => {
        const weights = row < types_js_1.PLANT_ROWS ? plantLayerWeights : zombieLayerWeights;
        return { symbol: rng.pickWeighted(weights) };
    }));
}
function cloneBoard(board) {
    return board.map((reel) => reel.map((cell) => ({ ...cell })));
}
function countSymbols(board, symbol) {
    return board.flat().filter((cell) => cell.symbol === symbol).length;
}
function rerollPlantCells(board, rng, predicate) {
    for (let reel = 0; reel < types_js_1.REELS; reel += 1) {
        for (let row = 0; row < types_js_1.PLANT_ROWS; row += 1) {
            if (predicate(board[reel][row].symbol)) {
                board[reel][row] = { symbol: rng.pickWeighted(plantLayerWeights) };
            }
        }
    }
}

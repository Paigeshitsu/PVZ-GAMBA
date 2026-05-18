import type { Board, Cell, SymbolId } from "./types.js";
import { PLANT_ROWS, REELS, ROWS } from "./types.js";
import type { Rng, WeightedItem } from "./rng.js";

const plantLayerWeights: WeightedItem<SymbolId>[] = [
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

const zombieLayerWeights: WeightedItem<SymbolId>[] = [
  { value: "ZOMBIE_15", weight: 28 },
  { value: "ZOMBIE_20", weight: 14 },
  { value: "ZOMBIE_50", weight: 4 },
  { value: "BONUS", weight: 4 },
  { value: "EMPTY", weight: 50 }
];

export function drawBoard(rng: Rng): Board {
  return Array.from({ length: REELS }, (_, reel) =>
    Array.from({ length: ROWS }, (_, row): Cell => {
      const weights = row < PLANT_ROWS ? plantLayerWeights : zombieLayerWeights;
      return { symbol: rng.pickWeighted(weights) };
    })
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((reel) => reel.map((cell) => ({ ...cell })));
}

export function countSymbols(board: Board, symbol: SymbolId): number {
  return board.flat().filter((cell) => cell.symbol === symbol).length;
}

export function rerollPlantCells(board: Board, rng: Rng, predicate: (symbol: SymbolId) => boolean): void {
  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < PLANT_ROWS; row += 1) {
      if (predicate(board[reel]![row]!.symbol)) {
        board[reel]![row] = { symbol: rng.pickWeighted(plantLayerWeights) };
      }
    }
  }
}

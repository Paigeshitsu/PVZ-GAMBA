import type { Board, Lane, SymbolId } from "./types.js";
import { LANES, REELS, ROWS } from "./types.js";
import type { Rng, WeightedItem } from "./rng.js";
import { getSymbol } from "./symbols.js";

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
  // Spin 5 plants for player to deploy
  const spinPlants: SymbolId[] = Array.from({ length: 5 }, () =>
    rng.pickWeighted(plantLayerWeights)
  );

  // Initialize lanes with zombies (player starts with empty lanes)
  const lanes: Lane[] = Array.from({ length: LANES }, () => {
    const zombieSymbol = rng.pickWeighted(zombieLayerWeights);
    const zombies =
      zombieSymbol === "EMPTY"
        ? []
        : [
            {
              symbol: zombieSymbol,
              health: getSymbol(zombieSymbol).multiplier ?? 0
            }
          ];

    return {
      plant: undefined, // Player will place plants
      zombies
    };
  });

  return { spinPlants, lanes };
}

export function cloneBoard(board: Board): Board {
  return {
    spinPlants: [...board.spinPlants],
    lanes: board.lanes.map((lane) => ({
      plant: lane.plant,
      zombies: lane.zombies.map((z) => ({ ...z }))
    }))
  };
}

export function countSymbols(board: Board, symbol: SymbolId): number {
  const spinCount = board.spinPlants.filter((s) => s === symbol).length;
  const laneCount = board.lanes.filter(
    (lane) => lane.plant === symbol || lane.zombies.some((z) => z.symbol === symbol)
  ).length;
  return spinCount + laneCount;
}

export function rerollPlantCells(board: Board, rng: Rng, predicate: (symbol: SymbolId) => boolean): void {
  // Reroll spin plants
  for (let i = 0; i < board.spinPlants.length; i++) {
    if (predicate(board.spinPlants[i]!)) {
      board.spinPlants[i] = rng.pickWeighted(plantLayerWeights);
    }
  }

  // Reroll lane plants
  for (const lane of board.lanes) {
    if (lane.plant && predicate(lane.plant)) {
      lane.plant = rng.pickWeighted(plantLayerWeights);
    }
  }
}

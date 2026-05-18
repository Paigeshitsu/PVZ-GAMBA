import { buyBonus, spin } from "./math/engine.js";
import { SeededRng } from "./math/rng.js";

const rng = new SeededRng(20260518);
const baseBet = 100;

for (let i = 0; i < 5; i += 1) {
  const result = spin({ baseBet, mode: "base" }, rng);
  console.log(JSON.stringify(result, null, 2));
}

const bonusBuy = buyBonus({ baseBet }, rng);
console.log(JSON.stringify(bonusBuy, null, 2));

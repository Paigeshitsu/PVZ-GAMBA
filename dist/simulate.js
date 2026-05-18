"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("./math/engine.js");
const rng_js_1 = require("./math/rng.js");
const rng = new rng_js_1.SeededRng(20260518);
const baseBet = 100;
for (let i = 0; i < 5; i += 1) {
    const result = (0, engine_js_1.spin)({ baseBet, mode: "base" }, rng);
    console.log(JSON.stringify(result, null, 2));
}
const bonusBuy = (0, engine_js_1.buyBonus)({ baseBet }, rng);
console.log(JSON.stringify(bonusBuy, null, 2));

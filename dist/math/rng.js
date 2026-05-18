"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRng = exports.CryptoRng = void 0;
const node_crypto_1 = require("node:crypto");
const RANDOM_RANGE = 2 ** 48 - 1;
class CryptoRng {
    next() {
        return (0, node_crypto_1.randomInt)(0, RANDOM_RANGE) / RANDOM_RANGE;
    }
    pickWeighted(items) {
        return pickWeighted(items, this.next());
    }
}
exports.CryptoRng = CryptoRng;
class SeededRng {
    state;
    constructor(seed = 1) {
        this.state = seed >>> 0;
    }
    next() {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }
    pickWeighted(items) {
        return pickWeighted(items, this.next());
    }
}
exports.SeededRng = SeededRng;
function pickWeighted(items, randomUnit) {
    if (items.length === 0) {
        throw new RangeError("Cannot pick from an empty weighted item list.");
    }
    const total = items.reduce((sum, item) => {
        if (!Number.isFinite(item.weight) || item.weight <= 0) {
            throw new RangeError("Weighted item weights must be positive finite numbers.");
        }
        return sum + item.weight;
    }, 0);
    let roll = randomUnit * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) {
            return item.value;
        }
    }
    return items[items.length - 1].value;
}

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { buyBonus, spin } from "./math/engine.js";
import { CryptoRng } from "./math/rng.js";
import { ALLOWED_BETS_CENTAVOS, ALLOWED_BETS_PESOS, CENTAVOS_PER_PESO } from "./math/config.js";
import type { BattleFeatureResult, Board, BonusBuyResult, SpinResult, SymbolId } from "./math/types.js";

const START_PORT = Number(process.env.PORT ?? 3000);
const HOST = "127.0.0.1";
const MAX_PORT_ATTEMPTS = 10;
const allowPortFallback = process.argv.includes("--fallback-port");
const rng = new CryptoRng();

const symbolLabels: Record<SymbolId, string> = {
  EMPTY: "----",
  BONUS: "BON",
  NUT: "NUT",
  PEASHOOTER_1: "PEA1",
  PEASHOOTER_2: "PEA2",
  PEASHOOTER_3: "PEA3",
  WATERMELON: "MEL",
  CHERRY: "CHR",
  SQUASH: "SQU",
  DOOM_SHROOM: "DOOM",
  CHILI: "CHIL",
  MUSHROOM_1: "M1",
  MUSHROOM_2: "M2",
  MUSHROOM_3: "M3",
  ZOMBIE_15: "Z15",
  ZOMBIE_20: "Z20",
  ZOMBIE_50: "Z50"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/__health") {
      sendJson(response, {
        ok: true,
        app: "pvz-slot-framework",
        startedAt: serverStartedAt,
        pid: process.pid
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, pageHtml());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/config") {
      sendJson(response, {
        allowedBetsCentavos: ALLOWED_BETS_CENTAVOS,
        allowedBetsPesos: ALLOWED_BETS_PESOS,
        symbolLabels
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/spin") {
      const body = await readJsonBody(request);
      const result = spin({ baseBet: parseBaseBet(body), mode: "base", source: "paid_spin" }, rng);
      sendJson(response, { roundType: "base_spin", result: serializeSpin(result) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/bonus-buy") {
      const body = await readJsonBody(request);
      const result = buyBonus({ baseBet: parseBaseBet(body) }, rng);
      sendJson(response, { roundType: "bonus_buy", result: serializeBonusBuy(result) });
      return;
    }

    sendJson(response, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(
      response,
      {
        error: error instanceof Error ? error.message : "Unknown server error"
      },
      400
    );
  }
});

const serverStartedAt = new Date().toISOString();

listen(START_PORT);

function listen(port: number, attempt = 1): void {
  server.once("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && allowPortFallback && attempt < MAX_PORT_ATTEMPTS) {
      console.log(`Port ${port} is already in use. Trying ${port + 1}...`);
      listen(port + 1, attempt + 1);
      return;
    }

    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
      console.error("Close the old dev server or run with a different port, for example:");
      console.error("  $env:PORT=3001; npm run dev");
      process.exitCode = 1;
      return;
    }

    console.error(error);
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    console.log(`Slot demo running at http://${HOST}:${port}`);
    console.log(`Health check: http://${HOST}:${port}/__health`);
  });
}

function parseBaseBet(body: unknown): number {
  if (!body || typeof body !== "object" || !("baseBet" in body)) {
    throw new Error("Request body must include baseBet in centavos.");
  }

  const baseBet = Number((body as { baseBet: unknown }).baseBet);
  if (!Number.isSafeInteger(baseBet)) {
    throw new Error("baseBet must be an integer centavo value.");
  }

  return baseBet;
}

function serializeSpin(result: SpinResult): unknown {
  return {
    input: result.input,
    board: serializeBoard(result.board),
    featureTriggered: result.featureTriggered,
    darkMode: result.darkMode,
    bonusCount: result.bonusCount,
    reloads: result.reloads,
    lineWins: result.lineWins,
    lineWinMultiplier: result.lineWinMultiplier,
    zombieWinMultiplier: result.zombieWinMultiplier,
    defeatedZombies: result.zombieHits.filter((hit) => hit.defeated).length,
    totalMultiplier: result.totalMultiplier,
    payout: result.payout,
    events: result.events
  };
}

function serializeBonusBuy(result: BonusBuyResult): unknown {
  const spinSummaries = result.spins.map((spinResult) => serializeSpin(spinResult));
  const battleFeatures = result.battleFeatures.map(serializeBattleFeature);

  return {
    type: result.type,
    baseBet: result.baseBet,
    cost: result.cost,
    freeSpinsAwarded: result.freeSpinsAwarded,
    spins: spinSummaries,
    battleFeatures,
    battleSummary: {
      monstersDefeated: result.battleFeatures.reduce((sum, feature) => sum + feature.monstersDefeated, 0),
      bossesDefeated: result.battleFeatures.reduce((sum, feature) => sum + feature.bossesDefeated, 0),
      battleMultiplier: result.battleFeatures.reduce((sum, feature) => sum + feature.battleMultiplier, 0)
    },
    totalMultiplier: result.totalMultiplier,
    totalPayout: result.totalPayout,
    netOutcome: result.netOutcome,
    events: result.events
  };
}

function serializeBattleFeature(feature: BattleFeatureResult): unknown {
  return {
    startingSpins: feature.startingSpins,
    spinsPlayed: feature.spinsPlayed,
    respinsAwarded: feature.respinsAwarded,
    monstersDefeated: feature.monstersDefeated,
    bossesDefeated: feature.bossesDefeated,
    levelUps: feature.levelUps,
    chestMultiplier: feature.chestMultiplier,
    battleMultiplier: feature.battleMultiplier,
    payout: feature.payout
  };
}

function serializeBoard(board: Board): string[][] {
  // Return a 5x5 view of symbols.
  // Rows 0..2 come from deployed "attack" plant reels, rows 3..4 come from lane zombies.
  // This matches what the browser renderer expects: board[colReel][row].
  return Array.from({ length: 5 }, (_, reel) => {
    return Array.from({ length: 5 }, (_, row) => {
      if (row < 3) {
        // Show the chosen plant per reel for rows 0..2.
        // (The demo engine currently stores 5 plants, one per reel.)
        return board.spinPlants[reel]!;
      }

      // Browser zombie section expects rows 3..4 to correspond to lane indexes 0..1.
      // This keeps the zombie container visually paired with the plants.
      const laneIndex = row - 3; // row 3 -> lane 0, row 4 -> lane 1
      const lane = board.lanes[laneIndex]!;
      // Use first zombie target symbol if present
      const zombie = lane.zombies[0]?.symbol;
      return zombie ?? "EMPTY";
    });
  });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response: ServerResponse, payload: unknown, statusCode = 200): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
}

function pageHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Slot Demo Framework</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #10110f;
      --panel: #1d211b;
      --panel-2: #252a22;
      --text: #f4f1e8;
      --muted: #b7b0a1;
      --accent: #d7b56d;
      --green: #71c781;
      --red: #d86a60;
      --line: #3d4437;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 24px 0;
    }
    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .subtle { color: var(--muted); font-size: 14px; }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 390px;
      gap: 16px;
      align-items: start;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 13px;
    }
    select, button {
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-2);
      color: var(--text);
      font: inherit;
    }
    button {
      cursor: pointer;
      font-weight: 700;
    }
    button.primary { background: #32633a; border-color: #4b8f55; }
    button.bonus { background: #775b22; border-color: #a17a2f; }
    button:disabled { opacity: 0.5; cursor: wait; }
    .board,
    .zombie-board {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .headers, .lane {
      display: grid;
      grid-template-columns: 76px repeat(5, minmax(64px, 1fr));
      gap: 8px;
      align-items: center;
    }
    .zombie-board .headers,
    .zombie-board .lane {
      grid-template-columns: 62px repeat(5, minmax(46px, 1fr));
      gap: 6px;
    }
    .headers div {
      color: var(--muted);
      text-align: center;
      font-size: 12px;
    }
    .lane-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    .cell {
      min-height: 58px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #151812;
      font-family: Consolas, "Courier New", monospace;
      font-size: 15px;
      font-weight: 700;
      transition: transform 120ms ease, background 120ms ease;
    }
    .cell.spin { transform: translateY(-2px); background: #2c2413; }
    .cell.attack { border-color: #3f6746; }
    .cell.zombie { border-color: #653d39; }
    .zombie-shell {
      margin-top: 12px;
      padding: 10px;
      border: 1px solid #653d39;
      border-radius: 8px;
      background: #171411;
    }
    .zombie-title {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 13px;
    }
    .battle-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    .battle-stats .metric strong {
      font-size: 16px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    .metric {
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
    }
    .metric span { display: block; color: var(--muted); font-size: 12px; }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; }
    .flow {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .flow div {
      border-left: 3px solid var(--accent);
      background: var(--panel-2);
      padding: 8px 10px;
      color: var(--muted);
      font-size: 13px;
    }
    pre {
      max-height: 440px;
      overflow: auto;
      padding: 12px;
      margin: 10px 0 0;
      border-radius: 6px;
      background: #0b0c0a;
      border: 1px solid var(--line);
      color: #d7e8d2;
      font-size: 12px;
      line-height: 1.45;
    }
    .events {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .events div {
      padding: 8px;
      border-radius: 6px;
      background: var(--panel-2);
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .summary { grid-template-columns: repeat(2, 1fr); }
      .headers, .lane { grid-template-columns: 58px repeat(5, minmax(48px, 1fr)); gap: 5px; }
      .zombie-board .headers, .zombie-board .lane { grid-template-columns: 58px repeat(5, minmax(48px, 1fr)); }
      .cell { min-height: 48px; font-size: 13px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Slot Demo Framework</h1>
        <div class="subtle">Local demo only. The real website backend can replace these JSON endpoints later.</div>
      </div>
      <div class="subtle">API: /api/spin, /api/bonus-buy, /api/config</div>
    </header>

    <div class="layout">
      <section class="panel">
        <div class="controls">
          <label>
            Bet
            <select id="bet"></select>
          </label>
          <label>
            Action
            <button id="spin" class="primary">Spin Base Game</button>
          </label>
          <button id="bonus" class="bonus">Buy Bonus</button>
          <button id="reset">Reset Demo</button>
        </div>

        <div class="subtle">Slot mechanics: attack lanes, bonus scatters, reloads, line wins, and payout calculation.</div>
        <div class="board" id="slotBoard"></div>

        <div class="summary">
          <div class="metric"><span>Bet</span><strong id="metricBet">PHP 0.00</strong></div>
          <div class="metric"><span>Multiplier</span><strong id="metricMultiplier">0x</strong></div>
          <div class="metric"><span>Payout</span><strong id="metricPayout">PHP 0.00</strong></div>
          <div class="metric"><span>Feature</span><strong id="metricFeature">Idle</strong></div>
        </div>

        <div class="events" id="events"></div>
      </section>

      <aside class="panel">
        <strong>Zombie Container</strong>
        <div class="zombie-shell">
          <div class="zombie-title">
            <span>Zombie target lanes</span>
            <span>Z15 / Z20 / Z50</span>
          </div>
          <div class="zombie-board" id="zombieBoard"></div>
          <div class="battle-stats">
            <div class="metric"><span>Defeated</span><strong id="metricDefeated">0</strong></div>
            <div class="metric"><span>Zombie Win</span><strong id="metricZombieWin">0x</strong></div>
            <div class="metric"><span>Battle Kills</span><strong id="metricBattleKills">0</strong></div>
            <div class="metric"><span>Battle Win</span><strong id="metricBattleWin">0x</strong></div>
          </div>
        </div>

        <div class="events" id="zombieEvents"></div>

        <br>
        <strong>Dataflow</strong>
        <div class="flow">
          <div>1. Browser selects a bet in centavos.</div>
          <div>2. Browser posts JSON to the local demo API.</div>
          <div>3. API validates the bet and calls the math engine.</div>
          <div>4. API returns real spin data for rendering and future backend wiring.</div>
        </div>
        <pre id="json">{}</pre>
      </aside>
    </div>
  </main>

  <script>
    const labels = ${JSON.stringify(symbolLabels)};
    const attackSymbols = ["EMPTY", "BONUS", "NUT", "PEASHOOTER_1", "PEASHOOTER_2", "PEASHOOTER_3", "WATERMELON", "CHERRY", "SQUASH", "DOOM_SHROOM", "CHILI", "MUSHROOM_1", "MUSHROOM_2", "MUSHROOM_3"];
    const zombieSymbols = ["EMPTY", "BONUS", "ZOMBIE_15", "ZOMBIE_20", "ZOMBIE_50"];
    const emptyBoard = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => "EMPTY"));
    const state = { busy: false, board: emptyBoard };

    const slotBoardEl = document.getElementById("slotBoard");
    const zombieBoardEl = document.getElementById("zombieBoard");
    const betEl = document.getElementById("bet");
    const eventsEl = document.getElementById("events");
    const zombieEventsEl = document.getElementById("zombieEvents");
    const jsonEl = document.getElementById("json");
    const spinButton = document.getElementById("spin");
    const bonusButton = document.getElementById("bonus");

    init();

    async function init() {
      const config = await fetchJson("/api/config");
      betEl.innerHTML = config.allowedBetsCentavos.map((centavos, index) =>
        '<option value="' + centavos + '">' + formatPeso(centavos) + '</option>'
      ).join("");
      betEl.value = "100";
      renderBoards(emptyBoard);
      bindControls();
    }

    function bindControls() {
      spinButton.addEventListener("click", () => play("/api/spin"));
      bonusButton.addEventListener("click", () => play("/api/bonus-buy"));
      document.getElementById("reset").addEventListener("click", () => {
        state.board = emptyBoard;
        renderBoards(state.board);
        renderEvents([]);
        renderZombieEvents([]);
        renderJson({});
        updateMetrics({ bet: Number(betEl.value), multiplier: 0, payout: 0, feature: "Idle" });
        updateZombieMetrics({ defeated: 0, zombieWin: 0, battleKills: 0, battleWin: 0 });
      });
    }

    async function play(endpoint) {
      if (state.busy) return;
      setBusy(true);
      const baseBet = Number(betEl.value);
      updateMetrics({ bet: baseBet, multiplier: 0, payout: 0, feature: "Spinning" });
      await animate();

      try {
        const response = await fetchJson(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseBet })
        });

        if (response.roundType === "bonus_buy") {
          const finalSpin = response.result.spins[response.result.spins.length - 1];
          state.board = finalSpin.board;
          renderBoards(state.board);
          renderBonusResult(response.result);
        } else {
          state.board = response.result.board;
          renderBoards(state.board);
          renderSpinResult(response.result);
        }

        renderJson(response);
      } catch (error) {
        renderEvents([{ message: error.message || String(error) }]);
      } finally {
        setBusy(false);
      }
    }

    async function animate() {
      for (let frame = 0; frame < 12; frame += 1) {
        renderBoards(randomBoard(), true);
        await sleep(65 + frame * 7);
      }
    }

    function renderBoards(board, spinning) {
      renderSlotBoard(board, spinning);
      renderZombieBoard(board, spinning);
    }

    function renderSlotBoard(board, spinning) {
      const rows = [];
      rows.push('<div class="headers"><div></div><div>Reel 1</div><div>Reel 2</div><div>Reel 3</div><div>Reel 4</div><div>Reel 5</div></div>');

      for (let row = 0; row < 3; row += 1) {
        const laneLabel = "ATK " + (row + 1);
        const cells = board.map((reel) => {
          const symbol = reel[row];
          return '<div class="cell attack' + (spinning ? " spin" : "") + '">' + labels[symbol] + '</div>';
        }).join("");
        rows.push('<div class="lane"><div class="lane-label">' + laneLabel + '</div>' + cells + '</div>');
      }

      slotBoardEl.innerHTML = rows.join("");
    }

    function renderZombieBoard(board, spinning) {
      const rows = [];
      rows.push('<div class="headers"><div></div><div>R1</div><div>R2</div><div>R3</div><div>R4</div><div>R5</div></div>');

      for (let row = 3; row < 5; row += 1) {
        const laneLabel = "ZMB " + (row - 2);
        const cells = board.map((reel) => {
          const symbol = reel[row];
          return '<div class="cell zombie' + (spinning ? " spin" : "") + '">' + labels[symbol] + '</div>';
        }).join("");
        rows.push('<div class="lane"><div class="lane-label">' + laneLabel + '</div>' + cells + '</div>');
      }

      zombieBoardEl.innerHTML = rows.join("");
    }

    function renderSpinResult(result) {
      updateMetrics({
        bet: result.input.baseBet,
        multiplier: result.totalMultiplier,
        payout: result.payout,
        feature: result.featureTriggered ? "Triggered" : "Base"
      });
      updateZombieMetrics({
        defeated: result.defeatedZombies,
        zombieWin: result.zombieWinMultiplier,
        battleKills: 0,
        battleWin: 0
      });
      renderEvents(result.events);
      renderZombieEvents([
        { message: result.defeatedZombies + " zombie(s) defeated for " + result.zombieWinMultiplier + "x." }
      ]);
    }

    function renderBonusResult(result) {
      updateMetrics({
        bet: result.baseBet,
        multiplier: result.totalMultiplier,
        payout: result.totalPayout,
        feature: "Bonus Buy"
      });
      const finalSpin = result.spins[result.spins.length - 1];
      updateZombieMetrics({
        defeated: finalSpin.defeatedZombies,
        zombieWin: finalSpin.zombieWinMultiplier,
        battleKills: result.battleSummary.monstersDefeated,
        battleWin: result.battleSummary.battleMultiplier
      });
      renderEvents([
        { message: "Bonus cost: " + formatPeso(result.cost) },
        { message: "Feature spins: " + result.freeSpinsAwarded },
        { message: "Net outcome: " + formatPeso(result.netOutcome) }
      ]);
      renderZombieEvents([
        { message: "Final free spin defeated " + finalSpin.defeatedZombies + " zombie(s)." },
        { message: "Battle defeated " + result.battleSummary.monstersDefeated + " monster(s)." },
        { message: "Battle defeated " + result.battleSummary.bossesDefeated + " boss(es)." },
        { message: "Battle multiplier: " + result.battleSummary.battleMultiplier + "x." }
      ]);
    }

    function updateMetrics(values) {
      document.getElementById("metricBet").textContent = formatPeso(values.bet);
      document.getElementById("metricMultiplier").textContent = values.multiplier + "x";
      document.getElementById("metricPayout").textContent = formatPeso(values.payout);
      document.getElementById("metricFeature").textContent = values.feature;
    }

    function updateZombieMetrics(values) {
      document.getElementById("metricDefeated").textContent = values.defeated;
      document.getElementById("metricZombieWin").textContent = values.zombieWin + "x";
      document.getElementById("metricBattleKills").textContent = values.battleKills;
      document.getElementById("metricBattleWin").textContent = values.battleWin + "x";
    }

    function renderEvents(events) {
      eventsEl.innerHTML = events.map((event) => '<div>' + event.message + '</div>').join("");
    }

    function renderZombieEvents(events) {
      zombieEventsEl.innerHTML = events.map((event) => '<div>' + event.message + '</div>').join("");
    }

    function renderJson(payload) {
      jsonEl.textContent = JSON.stringify(payload, null, 2);
    }

    function randomBoard() {
      return Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, (_, row) => {
          const symbols = row < 3 ? attackSymbols : zombieSymbols;
          return symbols[Math.floor(Math.random() * symbols.length)];
        })
      );
    }

    async function fetchJson(url, options) {
      const response = await fetch(url, options);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Request failed");
      return payload;
    }

    function formatPeso(centavos) {
      return "PHP " + (centavos / ${CENTAVOS_PER_PESO}).toFixed(2);
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function setBusy(isBusy) {
      state.busy = isBusy;
      spinButton.disabled = isBusy;
      bonusButton.disabled = isBusy;
    }
  </script>
</body>
</html>`;
}

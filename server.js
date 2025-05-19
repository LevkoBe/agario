const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// Vector2, Entity, Food, Cell, Player classes remain the same as your last provided version
// Player class might need 'wasAliveLastTick' if not already present from previous changes for death reporting.
// Let's assume Player class is as follows for clarity with wasAliveLastTick:
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  normalize() {
    const len = this.length();
    if (len > 0) {
      return new Vector2(this.x / len, this.y / len);
    }
    return new Vector2();
  }
  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y);
  }
  subtract(v) {
    return new Vector2(this.x - v.x, this.y - v.y);
  }
  scale(f) {
    return new Vector2(this.x * f, this.y * f);
  }
}

class Entity {
  constructor(id, position = new Vector2(), radius = 10, color = "#ffffff") {
    this.id = id;
    this.position = position;
    this.radius = radius;
    this.color = color;
  }
  update(dt) {}
  collidesWith(other) {
    const distance = Math.sqrt(
      Math.pow(this.position.x - other.position.x, 2) +
        Math.pow(this.position.y - other.position.y, 2)
    );
    return distance < this.radius + other.radius;
  }
}

class Food extends Entity {
  constructor(id, position) {
    super(id, position, 5, getRandomColor());
  }
}

class Cell extends Entity {
  constructor(id, position, mass = 10, velocity = new Vector2()) {
    const radius = Math.sqrt(mass) * 4;
    super(id, position, radius, getRandomColor());
    this.mass = mass;
    this.velocity = velocity;
  }
  update(dt) {
    this.position = this.position.add(this.velocity.scale(dt));
  }
}

class Player {
  constructor(id, nickname) {
    this.id = id;
    this.nickname = nickname;
    this.cells = [
      new Cell(
        `${id}-cell-0`,
        new Vector2(Math.random() * 1000, Math.random() * 1000)
      ),
    ];
    this.score = 0;
    this.lastInput = new Vector2();
    this.wasAliveLastTick = true; // Important for accurate death reporting
    this.updateScore();
  }
  updateScore() {
    this.score = this.cells.reduce((total, cell) => total + cell.mass, 0);
  }
  isAlive() {
    return this.cells.length > 0;
  }
  split() {
    /* Server-side split logic */
  }
  update(dt) {
    for (const cell of this.cells) {
      const speed = 1000 / Math.sqrt(cell.mass);
      cell.velocity = this.lastInput.normalize().scale(speed);
      cell.update(dt);
    }
  }
}

class GameWorld {
  constructor(width = 2000, height = 2000, targetBotCount = 20) {
    // Added targetBotCount
    this.width = width;
    this.height = height;
    this.players = new Map();
    this.foods = new Set();
    this.botTargets = new Map();
    this.targetBotCount = targetBotCount;
    this._lastAssignedBotNumber = 0; // For "Bot #X" nicknames

    for (let i = 0; i < 100; i++) {
      // Initial food spawn
      this.spawnFood();
    }
    this.ensureBotPopulation(); // Spawn initial bots
  }

  spawnNewBot() {
    const botId = `bot-${uuidv4()}`;

    // Determine the next bot number for the nickname
    let maxNum = 0;
    for (const p of this.players.values()) {
      if (p.id.startsWith("bot-")) {
        const match = p.nickname.match(/^Bot #(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    this._lastAssignedBotNumber =
      Math.max(this._lastAssignedBotNumber, maxNum) + 1;

    const botNickname = `Bot #${this._lastAssignedBotNumber}`;
    const newBot = new Player(botId, botNickname);
    this.addPlayer(newBot); // addPlayer is an existing method
    // console.log(`Spawned new bot: ${botNickname} (ID: ${botId})`);
  }

  ensureBotPopulation() {
    let currentLiveBotCount = 0;
    for (const player of this.players.values()) {
      if (player.id.startsWith("bot-") && player.isAlive()) {
        currentLiveBotCount++;
      }
    }

    const botsNeeded = this.targetBotCount - currentLiveBotCount;
    if (botsNeeded > 0) {
      // console.log(`Current live bots: ${currentLiveBotCount}, Target: ${this.targetBotCount}. Spawning ${botsNeeded} new bot(s).`);
      for (let i = 0; i < botsNeeded; i++) {
        this.spawnNewBot();
      }
    }
  }

  update(dt) {
    // Store player alive status before updates and collisions for accurate death detection
    for (const player of this.players.values()) {
      player.wasAliveLastTick = player.isAlive();
    }

    for (const [id, player] of this.players.entries()) {
      if (player.isAlive()) {
        player.update(dt);
        for (const cell of player.cells) {
          cell.position.x = Math.max(
            cell.radius,
            Math.min(this.width - cell.radius, cell.position.x)
          );
          cell.position.y = Math.max(
            cell.radius,
            Math.min(this.height - cell.radius, cell.position.y)
          );
        }
      }
    }

    this.updateBots(dt); // Bot AI movement logic
    const deathsReport = this.checkCollisions(); // Handles eating and reports deaths

    // After all updates and collision resolutions for the tick:
    this.ensureBotPopulation(); // Maintain bot count by spawning new ones if needed

    return deathsReport; // Return death info for `death` messages
  }

  findClosestFood(player) {
    if (!player.isAlive() || player.cells.length === 0) return null;
    const playerCell = player.cells[0];
    let closestFood = null;
    let minDistance = Number.MAX_VALUE;
    for (const food of this.foods) {
      const distance = playerCell.position.subtract(food.position).length();
      if (distance < minDistance) {
        minDistance = distance;
        closestFood = food;
      }
    }
    return closestFood;
  }

  updateBots(dt) {
    // Bot AI logic
    for (const [id, player] of this.players.entries()) {
      if (
        !id.startsWith("bot-") ||
        !player.isAlive() ||
        player.cells.length === 0
      ) {
        if (id.startsWith("bot-") && !player.isAlive()) {
          this.botTargets.delete(id);
        }
        continue;
      }
      const mainCell = player.cells[0];
      if (
        !this.botTargets.has(id) ||
        this.botTargets.get(id).subtract(mainCell.position).length() <
          mainCell.radius
      ) {
        const closestFood = this.findClosestFood(player);
        if (closestFood) {
          this.botTargets.set(
            id,
            new Vector2(closestFood.position.x, closestFood.position.y)
          );
        } else {
          const newTarget = new Vector2(
            Math.random() * this.width,
            Math.random() * this.height
          );
          this.botTargets.set(id, newTarget);
        }
      }
      const target = this.botTargets.get(id);
      if (target) {
        player.lastInput = target.subtract(mainCell.position).normalize();
      }
    }
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }
  removePlayer(id) {
    this.players.delete(id);
    this.botTargets.delete(id);
  }
  spawnFood() {
    const food = new Food(
      `food-${uuidv4()}`,
      new Vector2(Math.random() * this.width, Math.random() * this.height)
    );
    this.foods.add(food);
  }

  checkCollisions() {
    const allPlayersInitially = Array.from(this.players.values());
    const activePlayersForCollision = allPlayersInitially.filter((p) =>
      p.isAlive()
    ); // Use players alive at start of collision check

    const foodIdsToRemove = new Set();
    const cellIdsEatenThisTick = new Set();
    const newlyDeceasedPlayersReport = []; // Phase 1: Food Consumption

    for (const player of activePlayersForCollision) {
      // Iterate based on who was alive for this phase
      for (const cell of player.cells) {
        if (cellIdsEatenThisTick.has(cell.id)) continue;
        for (const food of this.foods) {
          if (foodIdsToRemove.has(food.id)) continue;
          if (cell.collidesWith(food)) {
            cell.mass += 1;
            cell.radius = Math.sqrt(cell.mass) * 4;
            foodIdsToRemove.add(food.id);
            break;
          }
        }
      }
    }
    let foodSpawnCounter = 0;
    this.foods = new Set(
      Array.from(this.foods).filter((f) => {
        if (foodIdsToRemove.has(f.id)) {
          foodSpawnCounter++;
          return false;
        }
        return true;
      })
    );
    for (let i = 0; i < foodSpawnCounter; i++) {
      this.spawnFood();
    } // Phase 2: Player Cell vs. Player Cell Consumption

    for (let i = 0; i < activePlayersForCollision.length; i++) {
      const player1 = activePlayersForCollision[i];
      if (
        !player1.isAlive() ||
        player1.cells.every((c) => cellIdsEatenThisTick.has(c.id))
      )
        continue;
      for (let j = i + 1; j < activePlayersForCollision.length; j++) {
        const player2 = activePlayersForCollision[j];
        if (
          !player2.isAlive() ||
          player2.cells.every((c) => cellIdsEatenThisTick.has(c.id))
        )
          continue;
        const p1CellsSnapshot = [...player1.cells];
        const p2CellsSnapshot = [...player2.cells];
        for (const cell1 of p1CellsSnapshot) {
          if (cellIdsEatenThisTick.has(cell1.id)) continue;
          for (const cell2 of p2CellsSnapshot) {
            if (cellIdsEatenThisTick.has(cell2.id)) continue;
            if (cell1.collidesWith(cell2)) {
              const massThresh = 1.01;
              const c1m = cell1.mass;
              const c2m = cell2.mass;
              if (c1m > c2m * massThresh) {
                const actualC1 = player1.cells.find((c) => c.id === cell1.id);
                if (actualC1 && !cellIdsEatenThisTick.has(cell2.id)) {
                  actualC1.mass += c2m;
                  actualC1.radius = Math.sqrt(actualC1.mass) * 4;
                  cellIdsEatenThisTick.add(cell2.id);
                }
              } else if (c2m > c1m * massThresh) {
                const actualC2 = player2.cells.find((c) => c.id === cell2.id);
                if (actualC2 && !cellIdsEatenThisTick.has(cell1.id)) {
                  actualC2.mass += c1m;
                  actualC2.radius = Math.sqrt(actualC2.mass) * 4;
                  cellIdsEatenThisTick.add(cell1.id);
                }
              }
            }
          }
        }
      }
    } // Phase 3: Remove eaten cells, update scores, identify deaths

    for (const player of allPlayersInitially) {
      // Iterate all original players to check their status change
      const scoreBeforeCellRemovalAndUpdate = player.score; // Score after food/eating others, before their own cells potentially removed making them die
      const wasActuallyAliveBeforeThisCollisionCheck = player.wasAliveLastTick; // Status recorded at the very start of GameWorld.update()

      if (player.isAlive()) {
        // Only filter cells if player currently has any
        player.cells = player.cells.filter(
          (cell) => !cellIdsEatenThisTick.has(cell.id)
        );
      }
      player.updateScore(); // Recalculate score based on remaining cells

      if (wasActuallyAliveBeforeThisCollisionCheck && !player.isAlive()) {
        newlyDeceasedPlayersReport.push({
          id: player.id,
          finalScore: scoreBeforeCellRemovalAndUpdate,
        });
      }
      if (!player.isAlive()) {
        if (player.id.startsWith("bot-")) {
          this.botTargets.delete(player.id);
        }
      }
    }
    return newlyDeceasedPlayersReport;
  }

  getLeaderboard() {
    /* ... same as before ... */ return Array.from(this.players.values())
      .filter((p) => p.isAlive())
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        rank: i + 1,
      }));
  }
  getState() {
    /* ... same as before, ensuring timestamp ... */ return {
      timestamp: Date.now(),
      visiblePlayers: Array.from(this.players.values())
        .filter((p) => p.isAlive())
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score,
          cells: p.cells.map((c) => ({
            id: c.id,
            x: c.position.x,
            y: c.position.y,
            radius: c.radius,
            color: c.color,
          })),
        })),
      visibleFood: Array.from(this.foods).map((f) => ({
        id: f.id,
        x: f.position.x,
        y: f.position.y,
        radius: f.radius,
        color: f.color,
      })),
    };
  }
}

class GameState {
  constructor() {
    // GameWorld constructor now handles initial bot population via its targetBotCount parameter
    this.gameWorld = new GameWorld(2000, 2000, 20); // width, height, targetBotCount
  }

  broadcast(wss) {
    const state = this.gameWorld.getState();
    broadcast(wss, { type: "gameState", ...state });
  }
  broadcastLeaderboard(wss) {
    /* ... same as before ... */ const alive = this.gameWorld.getLeaderboard();
    const topN = 10;
    const topData = alive
      .slice(0, topN)
      .map((p) => ({ nickname: p.nickname, score: p.score }));
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN && c.id) {
        const pE = this.gameWorld.players.get(c.id);
        let pers;
        if (pE) {
          const lE = alive.find((p) => p.id === c.id);
          if (lE) {
            pers = { rank: lE.rank, score: lE.score };
          } else {
            pers = { rank: 0, score: pE.score };
          }
        } else {
          pers = { rank: 0, score: 0 };
        }
        sendTo(c, { type: "leaderboard", topPlayers: topData, personal: pers });
      }
    });
  }
  handleInput(id, dir) {
    const p = this.gameWorld.players.get(id);
    if (p && p.isAlive()) {
      p.lastInput = new Vector2(dir.x, dir.y);
    }
  }
  handleJoin(id, nickname, ws) {
    const p = new Player(id, nickname);
    this.gameWorld.addPlayer(p);
    sendTo(ws, { type: "playerData", id: p.id, nickname: p.nickname });
  }
  handleDisconnect(id) {
    this.gameWorld.removePlayer(id);
  }
  handlePlayerDeaths(deceasedPlayers, wss) {
    deceasedPlayers.forEach((deathInfo) => {
      wss.clients.forEach((client) => {
        if (
          client.id === deathInfo.id &&
          client.readyState === WebSocket.OPEN
        ) {
          sendTo(client, { type: "death", score: deathInfo.finalScore });
        }
      });
    });
  }
}

class GameLoop {
  constructor(gameState, wss) {
    this.gameState = gameState;
    this.wss = wss;
    this.interval = 16;
    this.lastTime = Date.now();
  }
  start() {
    setInterval(() => this.tick(), this.interval);
    setInterval(() => this.secondTick(), 1000);
  }
  secondTick() {
    this.gameState.broadcastLeaderboard(this.wss);
  }
  tick() {
    const currentTime = Date.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const newlyDeceasedPlayers = this.gameState.gameWorld.update(dt);
    if (newlyDeceasedPlayers && newlyDeceasedPlayers.length > 0) {
      this.gameState.handlePlayerDeaths(newlyDeceasedPlayers, this.wss);
    }
    this.gameState.broadcast(this.wss);
  }
}

// getRandomColor, broadcast, sendTo, WebSocket server setup (wss, PORT, etc.)
// remain the same as your last provided version.
function getRandomColor() {
  const c = [
    "#FF5252",
    "#FF4081",
    "#E040FB",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
    "#FFFF00",
    "#FFD740",
    "#FFAB40",
    "#FF6E40",
  ];
  return c[Math.floor(Math.random() * c.length)];
}
function broadcast(wss, data) {
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(data));
    }
  });
}
function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const gameState = new GameState();
const gameLoop = new GameLoop(gameState, wss);
console.log(`WebSocket server started on port ${PORT}`);
gameLoop.start();
wss.on("connection", (ws) => {
  const cId = uuidv4();
  ws.id = cId;
  console.log(`Client connected: ${cId}`);
  ws.on("message", (msg) => {
    try {
      const d = JSON.parse(msg);
      switch (d.type) {
        case "join":
          gameState.handleJoin(ws.id, d.nickname, ws);
          break;
        case "input":
          gameState.handleInput(ws.id, d.direction);
          break;
        case "split":
          break;
        case "leave":
          gameState.handleDisconnect(ws.id);
          ws.close();
          break;
        default:
          console.warn(`Unknown message type: ${d.type}`);
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  });
  ws.on("close", () => {
    console.log(`Client disconnected: ${ws.id}`);
    gameState.handleDisconnect(ws.id);
  });
});

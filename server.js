const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// Game classes implementation
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

  update(dt) {
    // Base update method
  }

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

  spawn() {
    // Food spawn logic
  }
}

class Cell extends Entity {
  constructor(id, position, mass = 10, velocity = new Vector2()) {
    // Size based on mass
    const radius = Math.sqrt(mass) * 4;
    super(id, position, radius, getRandomColor());
    this.mass = mass;
    this.velocity = velocity;
  }

  update(dt) {
    // Update position based on velocity
    this.position = this.position.add(this.velocity.scale(dt));

    // Update radius based on mass
    this.radius = Math.sqrt(this.mass) * 4;
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
    this.bestScore = 0;
  }

  isAlive() {
    return this.cells.length > 0;
  }

  split() {
    // To be implemented in future phases
  }

  update(dt) {
    // Update all cells
    for (const cell of this.cells) {
      // Set velocity based on input with constant speed
      const speed = 1000 / Math.sqrt(cell.mass); // Speed decreases with mass
      cell.velocity = this.lastInput.normalize().scale(speed);
      cell.update(dt);
    }

    // Calculate score as sum of all cell masses
    this.score = this.cells.reduce((total, cell) => total + cell.mass, 0);

    // Update best score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
  }
}

class GameWorld {
  constructor(width = 2000, height = 2000) {
    this.width = width;
    this.height = height;
    this.players = new Map();
    this.foods = new Set();
    this.botTargets = new Map(); // Store target positions for bot movement

    // Initialize with some food
    for (let i = 0; i < 100; i++) {
      this.spawnFood();
    }
  }

  update(dt) {
    // Update all players
    for (const [id, player] of this.players.entries()) {
      player.update(dt);

      // Keep cells within boundaries
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

    // Update bot behavior
    this.updateBots(dt);

    // Check collisions
    this.checkCollisions();
  }

  findClosestFood(player) {
    let playerRadius = player.cells[0].radius;
    let closestFood = null;
    let minDistance = Number.MAX_VALUE;

    for (const food of this.foods) {
      // ignore food near corners
      if (
        (food.position.x > this.width - playerRadius ||
          food.position.x < playerRadius) &&
        (food.position.y < playerRadius ||
          food.position.y > this.height - playerRadius)
      )
        continue;

      const distance = player.cells[0].position
        .subtract(food.position)
        .length();
      if (distance < minDistance) {
        minDistance = distance;
        closestFood = food;
      }
    }

    return closestFood;
  }

  updateBots(dt) {
    // Handle bot movement - they move to random targets
    for (const [id, player] of this.players.entries()) {
      // Only proceed for bots
      if (!id.startsWith("bot-")) continue;

      // If no target exists or the bot is close to the target, set a new target
      if (
        !this.botTargets.has(id) ||
        this.botTargets.get(id).subtract(player.cells[0].position).length() <
          player.cells[0].radius
      ) {
        const newTarget = this.findClosestFood(player).position;
        this.botTargets.set(id, new Vector2(newTarget.x, newTarget.y));
      }

      // Move towards target
      const target = this.botTargets.get(id);
      const direction = target.subtract(player.cells[0].position).normalize();
      player.lastInput = direction;
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
    // Check player cells vs food
    for (const [playerId, player] of this.players.entries()) {
      for (const cell of player.cells) {
        for (const food of this.foods) {
          if (cell.collidesWith(food)) {
            // Player consumes food
            cell.mass += 1;
            this.foods.delete(food);
            this.spawnFood(); // Spawn a new food
          }
        }
      }
    }

    // Check player cells vs other player cells (for future implementations)
    // This would handle player cells eating other player cells
  }

  // Prepare a simplified state for sending to clients
  getState() {
    return {
      players: Array.from(this.players.values()).map((player) => ({
        id: player.id,
        nickname: player.nickname,
        score: player.score,
        cells: player.cells.map((cell) => ({
          id: cell.id,
          x: cell.position.x,
          y: cell.position.y,
          radius: cell.radius,
          color: cell.color,
        })),
      })),
      foods: Array.from(this.foods).map((food) => ({
        id: food.id,
        x: food.position.x,
        y: food.position.y,
        radius: food.radius,
        color: food.color,
      })),
    };
  }
}

class GameState {
  constructor() {
    this.gameWorld = new GameWorld();
    // Add a bot player
    const botPlayer = new Player("bot-1", "Bot Player");
    this.gameWorld.addPlayer(botPlayer);
  }

  broadcast(wss) {
    const state = this.gameWorld.getState();
    broadcast(wss, { type: "state", data: state });
  }

  handleInput(id, dir) {
    const player = this.gameWorld.players.get(id);
    if (player) {
      player.lastInput = new Vector2(dir.x, dir.y);
    }
  }

  handleJoin(id, nickname, ws) {
    // Create new player
    const player = new Player(id, nickname);
    this.gameWorld.addPlayer(player);

    // Send player data back
    sendTo(ws, {
      type: "playerData",
      data: {
        id: player.id,
        nickname: player.nickname,
        bestScore: player.bestScore,
      },
    });
  }

  handleDisconnect(id) {
    this.gameWorld.removePlayer(id);
  }
}

class GameLoop {
  constructor(gameState, wss) {
    this.gameState = gameState;
    this.wss = wss;
    this.interval = 16; // ~60 FPS
    this.lastTime = Date.now();
  }

  start() {
    setInterval(() => this.tick(), this.interval);
  }

  tick() {
    const currentTime = Date.now();
    const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update game world
    this.gameState.gameWorld.update(dt);

    // Broadcast state to all clients
    this.gameState.broadcast(this.wss);
  }
}

// Helper functions
function getRandomColor() {
  const colors = [
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
  return colors[Math.floor(Math.random() * colors.length)];
}

function broadcast(wss, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Initialize the WebSocket server
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const gameState = new GameState();
const gameLoop = new GameLoop(gameState, wss);

console.log(`WebSocket server started on port ${PORT}`);

// Start the game loop
gameLoop.start();

// Handle WebSocket connections
wss.on("connection", (ws) => {
  const clientId = uuidv4();
  ws.id = clientId;

  console.log(`Client connected: ${clientId}`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "join":
          gameState.handleJoin(clientId, data.nickname, ws);
          break;
        case "input":
          gameState.handleInput(clientId, data.direction);
          break;
        case "split":
          // To be implemented in future phases
          break;
        case "scoreRequest":
          // To be implemented in future phases (leaderboard)
          break;
        case "leave":
          gameState.handleDisconnect(clientId);
          break;
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${clientId}`);
    gameState.handleDisconnect(clientId);
  });
});

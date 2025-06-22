import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { ClientMessage } from "./types.js";
import { RoomManager } from "./roomManager.js";
import { MessageHandlers } from "./messageHandlers.js";

export class GameServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private messageHandlers: MessageHandlers;
  private clients: Map<WebSocket, { robotId?: string; roomId?: string }> =
    new Map();
  private gameLoopInterval: NodeJS.Timeout;
  private leaderboardInterval: NodeJS.Timeout;

  constructor(port: number = 8080) {
    const server = http.createServer();
    this.wss = new WebSocketServer({ server });
    this.roomManager = new RoomManager();

    this.messageHandlers = new MessageHandlers(
      this.roomManager,
      this.clients,
      this.send.bind(this),
      this.sendError.bind(this)
    );

    this.wss.on("connection", this.handleConnection.bind(this));

    this.gameLoopInterval = setInterval(() => this.gameLoop(), 1000 / 60);

    this.leaderboardInterval = setInterval(
      () => this.updateLeaderboards(),
      1000
    );

    server.listen(port, () => {
      console.log(`Game server running on port ${port}`);
    });
  }

  private handleConnection(ws: WebSocket): void {
    console.log("New client connected");
    this.clients.set(ws, {});

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.messageHandlers.handleMessage(ws, message);
      } catch (error) {
        console.error("Invalid message format:", error);
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.handleDisconnection(ws);
    });
  }

  private handleDisconnection(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client?.robotId && client?.roomId) {
      this.roomManager.removeRobot(client.roomId, client.robotId);

      this.broadcastToRoom(client.roomId, {
        type: "playerLeft",
        id: client.robotId,
      });
    }

    this.clients.delete(ws);
    console.log("Client disconnected");
  }

  private gameLoop(): void {
    for (const [roomId, room] of this.roomManager.getAllRooms()) {
      const destructions = this.roomManager.updateRoom(room);
      destructions.forEach(({ destroyedId, attackerId }) =>
        this.notifyDestroyed(room, destroyedId, attackerId)
      );
      this.sendGameState(roomId);
    }
  }

  private sendGameState(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const gameState = {
      type: "gameState",
      robots: Array.from(room.robots.values()).map((robot) => ({
        id: robot.id,
        nickname: robot.nickname,
        mass: robot.mass,
        tools: robot.tools,
        position: robot.position,
        radius: robot.radius,
        color: robot.color,
      })),
      junk: Array.from(room.junk.values()),
      structures: Array.from(room.structures.values()),
      timestamp: Date.now(),
    };

    this.broadcastToRoom(roomId, gameState);
  }

  private updateLeaderboards(): void {
    for (const [roomId, room] of this.roomManager.getAllRooms()) {
      const sortedRobots = Array.from(room.robots.values()).sort(
        (a, b) => b.mass - a.mass
      );

      const leaderboard = {
        type: "leaderboard",
        top: sortedRobots.slice(0, 10).map((robot) => ({
          nickname: robot.nickname,
          mass: robot.mass,
        })),
      };

      // so not Send personalized leaderboard to each client
      for (const [ws, client] of this.clients) {
        if (client.roomId === roomId && client.robotId) {
          const robot = room.robots.get(client.robotId);
          if (robot) {
            const rank = sortedRobots.findIndex((r) => r.id === robot.id) + 1;
            this.send(ws, {
              ...leaderboard,
              self: { rank, mass: robot.mass },
            });
          }
        }
      }
    }
  }

  private notifyDestroyed(
    room: ReturnType<RoomManager["getRoom"]>,
    destroyedId: string,
    attackerId: string
  ): void {
    if (!room) return;
    for (const [ws, client] of this.clients) {
      if (client.robotId === destroyedId) {
        const robot = room.robots.get(destroyedId);
        this.send(ws, {
          type: "destroyed",
          score: robot?.mass || 0,
          by: attackerId,
        });
        break;
      }
    }
  }

  private broadcastToRoom(roomId: string, message: unknown): void {
    for (const [ws, client] of this.clients) {
      if (client.roomId === roomId) {
        this.send(ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: "error", message: error });
  }

  public shutdown(): void {
    clearInterval(this.gameLoopInterval);
    clearInterval(this.leaderboardInterval);
    this.wss.close();
  }
}

const gameServer = new GameServer(8080);

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  gameServer.shutdown();
  process.exit(0);
});

export default GameServer;

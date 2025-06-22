import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  ClientMessage,
  JoinMessage,
  MoveMessage,
  ActivateToolMessage,
  DropJunkMessage,
  ConstructBaseMessage,
  EvolveMessage,
  Junk,
  Structure,
} from "./types.js";
import { RoomManager } from "./roomManager.js";
import { ToolManager } from "./toolManager.js";
import { GameUtils } from "./utils.js";

export class MessageHandlers {
  constructor(
    private roomManager: RoomManager,
    private clients: Map<WebSocket, { robotId?: string; roomId?: string }>,
    private sendFn: (ws: WebSocket, message: unknown) => void,
    private sendErrorFn: (ws: WebSocket, error: string) => void
  ) {}

  handleJoin(ws: WebSocket, message: JoinMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

    let roomId: string;

    if (message.privateRoom === true) {
      roomId = uuidv4();
      this.roomManager.createRoom(roomId, message.mode || "ffa", true);
    } else if (typeof message.privateRoom === "string") {
      roomId = message.privateRoom;
      if (!this.roomManager.getRoom(roomId)) {
        this.sendErrorFn(ws, "Room not found");
        return;
      }
    } else {
      roomId = "public";
    }

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      this.sendErrorFn(ws, "Room not available");
      return;
    }

    const robot = this.roomManager.createRobot(message.nickname, room);
    client.robotId = robot.id;
    client.roomId = roomId;

    this.sendFn(ws, {
      type: "spawnConfirm",
      id: robot.id,
      nickname: message.nickname,
      roomId: roomId,
      initialMass: 10,
    });

    console.log(`Player ${message.nickname} joined room ${roomId}`);
  }

  handleMove(ws: WebSocket, message: MoveMessage): void {
    const client = this.clients.get(ws);
    if (!client?.robotId || !client?.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    const robot = room?.robots.get(client.robotId);

    if (robot) {
      robot.direction = message.direction;
      robot.lastUpdate = Date.now();
    }
  }

  handleActivateTool(ws: WebSocket, message: ActivateToolMessage): void {
    const client = this.clients.get(ws);
    if (!client?.robotId || !client?.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    const robot = room?.robots.get(client.robotId);

    if (!robot || !room) return;

    ToolManager.activateTool(robot, message.tool, message.target, room);
  }

  handleDropJunk(ws: WebSocket, message: DropJunkMessage): void {
    console.log(message);
    const client = this.clients.get(ws);
    if (!client?.robotId || !client?.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    const robot = room?.robots.get(client.robotId);

    if (!robot || robot.mass <= 5) return;

    const dropAmount = Math.floor(robot.mass * 0.1);
    robot.mass -= dropAmount;
    robot.radius = GameUtils.calculateRadius(robot.mass);

    const junk: Junk = {
      id: uuidv4(),
      position: {
        x: robot.position.x + (Math.random() - 0.5) * 50,
        y: robot.position.y + (Math.random() - 0.5) * 50,
      },
      mass: dropAmount,
      type: GameUtils.getRandomJunkType(),
    };

    room!.junk.set(junk.id, junk);
  }

  handleConstructBase(ws: WebSocket, message: ConstructBaseMessage): void {
    const client = this.clients.get(ws);
    if (!client?.robotId || !client?.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    const robot = room?.robots.get(client.robotId);

    if (!robot || robot.mass < 50) return;

    robot.mass -= 50;
    robot.radius = GameUtils.calculateRadius(robot.mass);

    const base: Structure = {
      id: uuidv4(),
      position: message.position,
      type: "base",
      health: 100,
      ownerId: robot.id,
    };

    room!.structures.set(base.id, base);
  }

  handleEvolve(ws: WebSocket, message: EvolveMessage): void {
    const client = this.clients.get(ws);
    if (!client?.robotId || !client?.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    const robot = room?.robots.get(client.robotId);

    if (!robot || robot.mass < 20) return;

    robot.mass -= 20;
    robot.radius = GameUtils.calculateRadius(robot.mass);

    switch (message.upgrade) {
      case "speed":
        robot.speed += 0.2;
        break;
      case "defense":
        robot.defense += 0.3;
        break;
      case "attack":
        robot.attack += 0.25;
        break;
      case "toolSlot":
        if (robot.tools.length < 4) {
          const availableTools = ToolManager.getAvailableTools(robot);
          if (availableTools.length > 0) {
            robot.tools.push(availableTools[0]);
          }
        }
        break;
    }
  }

  handleMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case "join":
        this.handleJoin(ws, message);
        break;
      case "move":
        this.handleMove(ws, message);
        break;
      case "activateTool":
        this.handleActivateTool(ws, message);
        break;
      case "dropJunk":
        this.handleDropJunk(ws, message);
        break;
      case "constructBase":
        this.handleConstructBase(ws, message);
        break;
      case "evolve":
        this.handleEvolve(ws, message);
        break;
    }
  }
}

import {
  WebSocketMessage,
  SpawnConfirmMessage,
  GameStateMessage,
  DestroyedMessage,
  LeaderboardMessage,
  PlayerLeftMessage,
  JoinMessage,
  MoveMessage,
  ActivateToolMessage,
  DropJunkMessage,
  ConstructBaseMessage,
  SpeedupMessage,
  CreateBotMessage,
  SelectBotTypeMessage,
  Position,
  ConnectionStatus,
  ToolType,
} from "./types";

export interface WebSocketCallbacks {
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onSpawnConfirm: (message: SpawnConfirmMessage) => void;
  onGameState: (message: GameStateMessage) => void;
  onDestroyed: (message: DestroyedMessage) => void;
  onLeaderboard: (message: LeaderboardMessage) => void;
  onPlayerLeft: (message: PlayerLeftMessage) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks;

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(serverUrl: string): void {
    if (this.ws) {
      this.ws.close();
    }

    this.callbacks.onConnectionStatusChange("connecting");
    this.ws = new WebSocket(serverUrl);

    this.ws.onopen = () => {
      this.callbacks.onConnectionStatusChange("connected");
      console.log("Connected to server");
    };

    this.ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.callbacks.onConnectionStatusChange("disconnected");
      console.log("Disconnected from server");
    };

    this.ws.onerror = (error) => {
      this.callbacks.onConnectionStatusChange("disconnected");
      console.error("WebSocket error:", error);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "spawnConfirm":
        this.callbacks.onSpawnConfirm(message as SpawnConfirmMessage);
        break;
      case "gameState":
        this.callbacks.onGameState(message as GameStateMessage);
        break;
      case "destroyed":
        this.callbacks.onDestroyed(message as DestroyedMessage);
        break;
      case "leaderboard":
        this.callbacks.onLeaderboard(message as LeaderboardMessage);
        break;
      case "playerLeft":
        this.callbacks.onPlayerLeft(message as PlayerLeftMessage);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public joinGame(nickname: string, mode: string, privateRoom?: boolean): void {
    if (!this.isConnected()) {
      console.error("Not connected to server");
      return;
    }

    const joinMessage: JoinMessage = {
      type: "join",
      nickname,
      mode,
      ...(privateRoom ? { privateRoom: true } : {}),
    };

    this.send(joinMessage);
  }

  public sendMovement(direction: Position): void {
    const message: MoveMessage = {
      type: "move",
      direction,
    };
    this.send(message);
  }

  public activateTool(tool: ToolType, target?: Position): void {
    const message: ActivateToolMessage = {
      type: "activateTool",
      tool,
      ...(target ? { target } : {}),
    };
    this.send(message);
  }

  public dropJunk(): void {
    const message: DropJunkMessage = {
      type: "dropJunk",
    };
    this.send(message);
  }

  public speedup(): void {
    const message: SpeedupMessage = {
      type: "speedup",
    };
    this.send(message);
  }

  public constructBase(position: Position): void {
    const message: ConstructBaseMessage = {
      type: "constructBase",
      position,
    };
    this.send(message);
  }

  public createBot(): void {
    const message: CreateBotMessage = {
      type: "createBot",
    };
    this.send(message);
  }

  public selectBotType(botTypeIndex: number): void {
    const message: SelectBotTypeMessage = {
      type: "selectBotType",
      index: botTypeIndex,
    };
    this.send(message);
  }
}

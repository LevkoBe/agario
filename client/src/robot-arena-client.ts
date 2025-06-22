import { GameRenderer } from "./renderer";
import { UIManager } from "./ui-manager";
import { InputHandler, InputHandlerCallbacks } from "./input-handler";
import { WebSocketManager, WebSocketCallbacks } from "./websocket-manager";
import {
  GameState,
  PlayerData,
  Camera,
  Mouse,
  Position,
  ConnectionStatus,
  SpawnConfirmMessage,
  GameStateMessage,
  DestroyedMessage,
  LeaderboardMessage,
  PlayerLeftMessage,
  ToolType,
  UpgradeType,
} from "./types";

export class RobotArenaClient {
  private renderer: GameRenderer;
  private uiManager: UIManager;
  private inputHandler: InputHandler;
  private wsManager: WebSocketManager;

  private gameState: GameState;
  private playerId: string | null = null;
  private playerData: PlayerData | null = null;
  private camera: Camera;
  private mouse: Mouse;
  private lastMoveDirection: Position | null = null;

  constructor() {
    this.gameState = {
      robots: [],
      junk: [],
      structures: [],
    };
    this.camera = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };

    this.renderer = new GameRenderer("gameCanvas");
    this.uiManager = new UIManager();

    const wsCallbacks: WebSocketCallbacks = {
      onConnectionStatusChange: (status) =>
        this.handleConnectionStatusChange(status),
      onSpawnConfirm: (message) => this.handleSpawnConfirm(message),
      onGameState: (message) => this.handleGameState(message),
      onDestroyed: (message) => this.handleDestroyed(message),
      onLeaderboard: (message) => this.handleLeaderboard(message),
      onPlayerLeft: (message) => this.handlePlayerLeft(message),
    };
    this.wsManager = new WebSocketManager(wsCallbacks);

    const inputCallbacks: InputHandlerCallbacks = {
      onMouseMove: (mouse) => this.handleMouseMove(mouse),
      onMouseClick: (worldPos) => this.handleMouseClick(worldPos),
      onActivateTool: (tool, target) => this.handleActivateTool(tool, target),
      onDropJunk: () => this.handleDropJunk(),
      onConstructBase: () => this.handleConstructBase(),
      onEvolve: (upgrade) => this.handleEvolve(upgrade),
      onEnterPressed: () => this.handleEnterPressed(),
    };
    this.inputHandler = new InputHandler(
      this.renderer.getCanvas(),
      inputCallbacks
    );

    this.startRenderLoop();
  }

  private handleConnectionStatusChange(status: ConnectionStatus): void {
    this.uiManager.updateConnectionStatus(status);
  }

  private handleSpawnConfirm(message: SpawnConfirmMessage): void {
    this.playerId = message.id;
    this.playerData = {
      id: message.id,
      nickname: message.nickname,
      roomId: message.roomId,
      mass: message.initialMass,
    };
    this.renderer.setPlayerId(this.playerId);
    this.uiManager.hideJoinScreen();
  }

  private handleGameState(message: GameStateMessage): void {
    this.gameState = message;
    this.updatePlayerStats();
  }

  private handleDestroyed(message: DestroyedMessage): void {
    this.uiManager.showGameOverAlert(message.score, message.by);
    this.showJoinScreen();
  }

  private handleLeaderboard(message: LeaderboardMessage): void {
    this.uiManager.updateLeaderboard(message);
  }

  private handlePlayerLeft(message: PlayerLeftMessage): void {
    this.gameState.robots = this.gameState.robots.filter(
      (robot) => robot.id !== message.id
    );
  }

  private handleMouseMove(mouse: Mouse): void {
    this.mouse = mouse;
    this.renderer.setMouse(mouse);
    this.sendMovement();
  }

  private handleMouseClick(worldPos: Position): void {
    console.log(worldPos);
    // Store last click position for targeted tools
    // This is handled by the InputHandler
  }

  private handleActivateTool(tool: ToolType, target?: Position): void {
    this.wsManager.activateTool(tool, target);
    this.uiManager.activateToolFeedback(tool);
  }

  private handleDropJunk(): void {
    this.wsManager.dropJunk();
  }

  private handleConstructBase(): void {
    const player = this.gameState.robots.find((r) => r.id === this.playerId);
    if (player) {
      this.wsManager.constructBase(player.position);
    }
  }

  private handleEvolve(upgrade: UpgradeType): void {
    this.wsManager.evolve(upgrade);
  }

  private handleEnterPressed(): void {
    this.joinGame();
  }

  public connect(serverUrl: string): void {
    this.wsManager.connect(serverUrl);
  }

  public joinGame(): void {
    const formData = this.uiManager.getJoinFormData();
    if (!formData) return;

    if (!this.wsManager.isConnected()) {
      this.uiManager.showErrorAlert("Not connected to server");
      return;
    }

    setTimeout(() => {
      if (this.wsManager.isConnected()) {
        this.wsManager.joinGame(
          formData.nickname,
          formData.mode,
          formData.privateRoom
        );
      } else {
        this.uiManager.showErrorAlert("Failed to connect to server");
      }
    }, 1000);
  }

  private sendMovement(): void {
    if (!this.wsManager.isConnected() || !this.playerData) return;

    const canvas = this.renderer.getCanvas();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = this.mouse.x - centerX;
    const dy = this.mouse.y - centerY;

    const length = Math.sqrt(dx * dx + dy * dy);
    const direction: Position =
      length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };

    if (
      !this.lastMoveDirection ||
      Math.abs(direction.x - this.lastMoveDirection.x) > 0.01 ||
      Math.abs(direction.y - this.lastMoveDirection.y) > 0.01
    ) {
      this.wsManager.sendMovement(direction);
      this.lastMoveDirection = direction;
    }
  }

  private updatePlayerStats(): void {
    const player = this.gameState.robots.find((r) => r.id === this.playerId);
    if (player) {
      this.uiManager.updatePlayerStats(player.mass);
      this.updateCamera(player.position);
      this.uiManager.updateTools(player.tools || []);
    }
  }

  private updateCamera(playerPos: Position): void {
    if (playerPos) {
      this.camera.x = playerPos.x;
      this.camera.y = playerPos.y;
      this.renderer.setCamera(this.camera);
      this.inputHandler.setCamera(this.camera);
    }
  }

  private showJoinScreen(): void {
    this.uiManager.showJoinScreen();
    this.playerData = null;
    this.playerId = null;
    this.renderer.setPlayerId(null);
  }

  private startRenderLoop(): void {
    const render = () => {
      this.renderer.render(this.gameState);
      requestAnimationFrame(render);
    };
    render();
  }

  public connectToServer(serverUrl: string): void {
    this.connect(serverUrl);
  }

  public disconnect(): void {
    this.wsManager.disconnect();
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getPlayerData(): PlayerData | null {
    return this.playerData ? { ...this.playerData } : null;
  }
}

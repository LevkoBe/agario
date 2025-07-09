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
  private currentTool: ToolType | null = null;
  private movementDirection: Position = { x: 0, y: 0 };

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
      onActivateTool: (target) => this.handleActivateTool(target),
      onToolChange: (direction) => this.handleToolChange(direction),
      onToolSelect: (toolIndex) => this.handleToolSelect(toolIndex),
      onDropJunk: () => this.handleDropJunk(),
      onCreateBot: () => this.handleCreateBot(),
      onBotTypeSelect: (botTypeIndex) => this.handleBotTypeSelect(botTypeIndex),
      onConfirmAction: () => this.handleConfirmAction(),
      onMovement: (direction, pressed) =>
        this.handleMovement(direction, pressed),
      onSpeedup: () => this.handleSpeedup(),
    };
    this.inputHandler = new InputHandler(
      this.renderer.getCanvas(),
      inputCallbacks
    );

    this.startRenderLoop();
    this.startMovementLoop();
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

    // Enable input handling when game starts
    this.inputHandler.setKeyboardMovementEnabled(true);
    this.inputHandler.setMouseActivationEnabled(true);
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
    this.sendMouseMovement();
  }

  private handleActivateTool(target?: Position): void {
    if (this.currentTool) {
      this.wsManager.activateTool(this.currentTool, target);
      this.uiManager.activateToolFeedback(this.currentTool);
    }
  }

  private handleToolChange(direction: "next" | "prev"): void {
    const player = this.gameState.robots.find((r) => r.id === this.playerId);
    if (!player || !player.tools) return;

    const currentIndex = player.tools.indexOf(
      this.currentTool || player.tools[0]
    );
    let newIndex: number;

    if (direction === "next") {
      newIndex = (currentIndex + 1) % player.tools.length;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : player.tools.length - 1;
    }

    this.currentTool = player.tools[newIndex];
    this.uiManager.updateSelectedTool(this.currentTool);
  }

  private handleToolSelect(toolIndex: number): void {
    const player = this.gameState.robots.find((r) => r.id === this.playerId);
    if (!player || !player.tools || toolIndex >= player.tools.length) return;

    this.currentTool = player.tools[toolIndex];
    this.uiManager.updateSelectedTool(this.currentTool);
  }

  private handleDropJunk(): void {
    this.wsManager.dropJunk();
  }

  private handleCreateBot(): void {
    // This could trigger a bot creation UI or send a create bot request
    // Implementation depends on your game's bot creation system
    console.log("Create bot requested");
  }

  private handleBotTypeSelect(botTypeIndex: number): void {
    // Handle bot type selection after create bot was pressed
    console.log("Bot type selected:", botTypeIndex);
    // You might want to send this to the server or update UI
  }

  private handleConfirmAction(): void {
    this.joinGame();
  }

  private handleMovement(
    direction: "up" | "down" | "left" | "right",
    pressed: boolean
  ): void {
    switch (direction) {
      case "up":
        this.movementDirection.y = pressed ? -1 : 0;
        break;
      case "down":
        this.movementDirection.y = pressed ? 1 : 0;
        break;
      case "left":
        this.movementDirection.x = pressed ? -1 : 0;
        break;
      case "right":
        this.movementDirection.x = pressed ? 1 : 0;
        break;
    }
  }

  private handleSpeedup(): void {
    // Handle speedup/boost functionality
    this.wsManager.speedup();
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

  private sendMouseMovement(): void {
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

  private sendKeyboardMovement(): void {
    if (!this.wsManager.isConnected() || !this.playerData) return;

    const movementState = this.inputHandler.getMovementState();
    const direction: Position = { x: 0, y: 0 };

    if (movementState.up) direction.y -= 1;
    if (movementState.down) direction.y += 1;
    if (movementState.left) direction.x -= 1;
    if (movementState.right) direction.x += 1;

    const length = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y
    );
    if (length > 0) {
      direction.x /= length;
      direction.y /= length;
    }

    if (
      !this.lastMoveDirection ||
      Math.abs(direction.x - this.lastMoveDirection.x) > 0.01 ||
      Math.abs(direction.y - this.lastMoveDirection.y) > 0.01
    ) {
      this.wsManager.sendMovement(direction);
      this.lastMoveDirection = direction;
    }
  }

  private startMovementLoop(): void {
    const sendMovement = () => {
      this.sendKeyboardMovement();
      requestAnimationFrame(sendMovement);
    };
    sendMovement();
  }

  private updatePlayerStats(): void {
    const player = this.gameState.robots.find((r) => r.id === this.playerId);
    if (player) {
      this.uiManager.updatePlayerStats(player.mass);
      this.updateCamera(player.position);
      this.uiManager.updateTools(player.tools || []);

      // Set current tool if not set
      if (!this.currentTool && player.tools && player.tools.length > 0) {
        this.currentTool = player.tools[0];
        this.uiManager.updateSelectedTool(this.currentTool);
      }
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

    // Disable input handling when not in game
    this.inputHandler.setKeyboardMovementEnabled(false);
    this.inputHandler.setMouseActivationEnabled(false);
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

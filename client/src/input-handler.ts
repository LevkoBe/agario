import { Position, Mouse } from "./types";
import { InputConfig, defaultInputConfig } from "./configs/inputConfig";

export interface InputHandlerCallbacks {
  onMouseMove: (mouse: Mouse) => void;
  onActivateTool: (target?: Position) => void;
  onToolChange: (direction: "next" | "prev") => void;
  onToolSelect: (toolIndex: number) => void;
  onDropJunk: () => void;
  onCreateBot: () => void;
  onBotTypeSelect: (botTypeIndex: number) => void;
  onConfirmAction: () => void;
  onMovement: (
    direction: "up" | "down" | "left" | "right",
    pressed: boolean
  ) => void;
  onSpeedup: () => void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private mouse: Mouse;
  private keys: Record<string, boolean>;
  private lastClickPos?: Position;
  private callbacks: InputHandlerCallbacks;
  private camera: Position;
  private config: InputConfig;
  private awaitingBotTypeSelection: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: InputHandlerCallbacks,
    config: InputConfig = defaultInputConfig
  ) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0 };
    this.keys = {};
    this.callbacks = callbacks;
    this.camera = { x: 0, y: 0 };
    this.config = config;

    this.setupEventListeners();
  }

  public setCamera(camera: Position): void {
    this.camera = camera;
  }

  public setKeyboardMovementEnabled(enabled: boolean): void {
    this.config.keyboardMovementEnabled = enabled;
  }

  public setMouseActivationEnabled(enabled: boolean): void {
    this.config.mouseActivationEnabled = enabled;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.callbacks.onMouseMove(this.mouse);
    });

    this.canvas.addEventListener("click", (e) => {
      if (this.config.mouseActivationEnabled) {
        const rect = this.canvas.getBoundingClientRect();
        const worldX =
          e.clientX - rect.left - this.canvas.width / 2 + this.camera.x;
        const worldY =
          e.clientY - rect.top - this.canvas.height / 2 + this.camera.y;

        this.lastClickPos = { x: worldX, y: worldY };
        this.callbacks.onActivateTool(this.lastClickPos);
      }
    });

    window.addEventListener("keydown", (e) => {
      const joinScreen = document.getElementById(this.config.ui.joinScreenId);
      const exitScreen = document.getElementById(this.config.ui.exitScreenId);
      const isGameActive =
        joinScreen?.classList.contains(this.config.ui.hiddenClass) &&
        exitScreen?.classList.contains(this.config.ui.hiddenClass);

      if (isGameActive) {
        this.handleKeyDown(e);
      } else if (e.code === this.config.keyBindings.actions.confirmAction) {
        this.callbacks.onConfirmAction();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;

      if (this.config.keyboardMovementEnabled) {
        this.handleMovementKeyUp(e);
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    this.keys[code] = true;

    if (this.awaitingBotTypeSelection) {
      const botTypeIndex = this.config.keyBindings.botTypeSelection[code];
      if (botTypeIndex !== undefined) {
        this.callbacks.onBotTypeSelect(botTypeIndex);
        this.awaitingBotTypeSelection = false;
        return;
      }
    }

    if (this.config.keyboardMovementEnabled) {
      this.handleMovementKeyDown(e);
    }

    const toolIndex = this.config.keyBindings.toolSelection[code];
    if (toolIndex !== undefined) {
      this.callbacks.onToolSelect(toolIndex);
      return;
    }

    const actions = this.config.keyBindings.actions;
    switch (code) {
      case actions.dropJunk:
        e.preventDefault();
        this.callbacks.onDropJunk();
        break;
      case actions.activateTool:
        this.callbacks.onActivateTool(this.lastClickPos);
        break;
      case actions.speedup:
        this.callbacks.onSpeedup();
        break;
      case actions.nextTool:
        this.callbacks.onToolChange("next");
        break;
      case actions.prevTool:
        this.callbacks.onToolChange("prev");
        break;
      case actions.createBot:
        this.callbacks.onCreateBot();
        this.awaitingBotTypeSelection = true;
        break;
      case actions.confirmAction:
        this.callbacks.onConfirmAction();
        break;
    }
  }

  private handleMovementKeyDown(e: KeyboardEvent): void {
    const movement = this.config.keyBindings.movement;
    const code = e.code;

    if (code === movement.up) {
      this.callbacks.onMovement("up", true);
    } else if (code === movement.down) {
      this.callbacks.onMovement("down", true);
    } else if (code === movement.left) {
      this.callbacks.onMovement("left", true);
    } else if (code === movement.right) {
      this.callbacks.onMovement("right", true);
    }
  }

  private handleMovementKeyUp(e: KeyboardEvent): void {
    const movement = this.config.keyBindings.movement;
    const code = e.code;

    if (code === movement.up) {
      this.callbacks.onMovement("up", false);
    } else if (code === movement.down) {
      this.callbacks.onMovement("down", false);
    } else if (code === movement.left) {
      this.callbacks.onMovement("left", false);
    } else if (code === movement.right) {
      this.callbacks.onMovement("right", false);
    }
  }

  public getMouse(): Mouse {
    return { ...this.mouse };
  }

  public isKeyPressed(keyCode: string): boolean {
    return this.keys[keyCode] || false;
  }

  public getMovementState(): {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  } {
    if (!this.config.keyboardMovementEnabled) {
      return { up: false, down: false, left: false, right: false };
    }

    const movement = this.config.keyBindings.movement;
    return {
      up: this.keys[movement.up] || false,
      down: this.keys[movement.down] || false,
      left: this.keys[movement.left] || false,
      right: this.keys[movement.right] || false,
    };
  }
}

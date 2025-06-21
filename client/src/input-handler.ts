import { Position, Mouse, ToolType, UpgradeType } from "./types";

export interface InputHandlerCallbacks {
  onMouseMove: (mouse: Mouse) => void;
  onMouseClick: (worldPos: Position) => void;
  onActivateTool: (tool: ToolType, target?: Position) => void;
  onDropJunk: () => void;
  onConstructBase: () => void;
  onEvolve: (upgrade: UpgradeType) => void;
  onEnterPressed: () => void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private mouse: Mouse;
  private keys: Record<string, boolean>;
  private lastClickPos?: Position;
  private callbacks: InputHandlerCallbacks;
  private camera: Position;

  constructor(canvas: HTMLCanvasElement, callbacks: InputHandlerCallbacks) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0 };
    this.keys = {};
    this.callbacks = callbacks;
    this.camera = { x: 0, y: 0 };

    this.setupEventListeners();
  }

  public setCamera(camera: Position): void {
    this.camera = camera;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.callbacks.onMouseMove(this.mouse);
    });

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const worldX =
        e.clientX - rect.left - this.canvas.width / 2 + this.camera.x;
      const worldY =
        e.clientY - rect.top - this.canvas.height / 2 + this.camera.y;

      this.lastClickPos = { x: worldX, y: worldY };
      this.callbacks.onMouseClick(this.lastClickPos);
    });

    window.addEventListener("keydown", (e) => {
      if (document.getElementById("joinScreen")?.classList.contains("hidden")) {
        this.handleKeyDown(e);
      } else if (e.key === "Enter") {
        this.callbacks.onEnterPressed();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys[key] = true;

    switch (key) {
      case "q":
        this.callbacks.onActivateTool("blaster");
        break;
      case "w":
        this.callbacks.onActivateTool("magnet");
        break;
      case "e":
        this.callbacks.onActivateTool("teleport", this.lastClickPos);
        break;
      case "r":
        this.callbacks.onActivateTool("transformer");
        break;
      case " ":
        e.preventDefault();
        this.callbacks.onDropJunk();
        break;
      case "f":
        this.callbacks.onConstructBase();
        break;
      case "1":
        this.callbacks.onEvolve("speed");
        break;
      case "2":
        this.callbacks.onEvolve("defense");
        break;
      case "3":
        this.callbacks.onEvolve("attack");
        break;
      case "4":
        this.callbacks.onEvolve("toolSlot");
        break;
    }
  }

  public getMouse(): Mouse {
    return { ...this.mouse };
  }

  public isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] || false;
  }
}

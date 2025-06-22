import { GameState, Robot, Junk, Structure, Camera, Mouse } from "./types";

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private mouse: Mouse;
  private playerId: string | null;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with ID '${canvasId}' not found`);
    }

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("2D rendering context not supported");
    }
    this.ctx = context;

    this.camera = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.playerId = null;

    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public setCamera(camera: Camera): void {
    this.camera = camera;
  }

  public setMouse(mouse: Mouse): void {
    this.mouse = mouse;
  }

  public setPlayerId(playerId: string | null): void {
    this.playerId = playerId;
  }

  public render(gameState: GameState): void {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawJunk(gameState.junk);
    this.drawStructures(gameState.structures);
    this.drawRobots(gameState.robots);
    this.drawCrosshair();
  }

  private drawGrid(): void {
    const gridSize = 50;
    const offsetX = -this.camera.x % gridSize;
    const offsetY = -this.camera.y % gridSize;

    this.ctx.strokeStyle = "rgba(0, 255, 136, 0.1)";
    this.ctx.lineWidth = 1;

    for (let x = offsetX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = offsetY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawRobots(robots: Robot[]): void {
    robots.forEach((robot) => {
      const screenX = robot.position.x - this.camera.x + this.canvas.width / 2;
      const screenY = robot.position.y - this.camera.y + this.canvas.height / 2;

      // Robot body
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, robot.radius || 20, 0, 2 * Math.PI);
      this.ctx.fillStyle =
        robot.color || (robot.id === this.playerId ? "#00ff88" : "#ff6b6b");
      this.ctx.fill();
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Robot nickname
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "12px Courier New";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        robot.nickname,
        screenX,
        screenY - (robot.radius || 20) - 5
      );

      // Mass indicator
      this.ctx.fillStyle = "#00ff88";
      this.ctx.font = "10px Courier New";
      this.ctx.fillText(
        Math.round(robot.mass).toString(),
        screenX,
        screenY + 5
      );
    });
  }

  private drawJunk(junk: Junk[]): void {
    junk.forEach((item) => {
      const screenX = item.position.x - this.camera.x + this.canvas.width / 2;
      const screenY = item.position.y - this.camera.y + this.canvas.height / 2;

      const size = Math.max(3, Math.min(15, item.mass / 10));

      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, size, 0, 2 * Math.PI);

      switch (item.type) {
        case "metal":
          this.ctx.fillStyle = "#c0c0c0";
          break;
        case "circuit":
          this.ctx.fillStyle = "#00ff00";
          break;
        case "energy":
          this.ctx.fillStyle = "#ffff00";
          break;
        default:
          this.ctx.fillStyle = "#888888";
      }

      this.ctx.fill();
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  private drawStructures(structures: Structure[]): void {
    structures.forEach((structure) => {
      const screenX =
        structure.position.x - this.camera.x + this.canvas.width / 2;
      const screenY =
        structure.position.y - this.camera.y + this.canvas.height / 2;

      if (structure.type === "base") {
        this.ctx.fillStyle =
          structure.ownerId === this.playerId ? "#00ff88" : "#ff4444";
        this.ctx.fillRect(screenX - 25, screenY - 25, 50, 50);
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenX - 25, screenY - 25, 50, 50);

        if (structure.health !== undefined) {
          const healthPercent = structure.health / 100;
          this.ctx.fillStyle = "#ff0000";
          this.ctx.fillRect(screenX - 25, screenY - 35, 50, 5);
          this.ctx.fillStyle = "#00ff00";
          this.ctx.fillRect(screenX - 25, screenY - 35, 50 * healthPercent, 5);
        }
      } else if (structure.type === "wall") {
        this.ctx.fillStyle = "#666666";
        this.ctx.fillRect(screenX - 15, screenY - 15, 30, 30);
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(screenX - 15, screenY - 15, 30, 30);
      }
    });
  }

  private drawCrosshair(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(this.mouse.x, this.mouse.y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

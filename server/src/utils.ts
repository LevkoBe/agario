import { Position, GameRoom, JunkType } from "./types.js";

export class GameUtils {
  static getRandomSpawnPosition(room: GameRoom): Position {
    return {
      x: Math.random() * (room.bounds.width - 100) + 50,
      y: Math.random() * (room.bounds.height - 100) + 50,
    };
  }

  static getRandomColor(): string {
    const colors = [
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#FFA500",
      "#800080",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  static calculateRadius(mass: number): number {
    return Math.sqrt(mass) * 3;
  }

  static checkCollision(
    pos1: Position,
    radius1: number,
    pos2: Position,
    radius2: number
  ): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius1 + radius2;
  }

  static getRandomJunkType(): JunkType {
    const types: JunkType[] = ["metal", "circuit", "energy"];
    return types[Math.floor(Math.random() * types.length)];
  }

  static clampToRoomBounds(
    position: Position,
    radius: number,
    room: GameRoom
  ): Position {
    return {
      x: Math.max(radius, Math.min(room.bounds.width - radius, position.x)),
      y: Math.max(radius, Math.min(room.bounds.height - radius, position.y)),
    };
  }

  static calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
  }
}

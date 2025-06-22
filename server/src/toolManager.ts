import { v4 as uuidv4 } from "uuid";
import { Robot, Position, GameRoom, Tool, Junk } from "./types.js";
import { GameUtils } from "./utils.js";

export class ToolManager {
  static activateBlaster(
    robot: Robot,
    target: Position | undefined,
    room: GameRoom
  ): void {
    if (!target) return;

    const blastRadius = 100;
    for (const otherRobot of room.robots.values()) {
      if (otherRobot.id !== robot.id) {
        const distance = GameUtils.calculateDistance(
          otherRobot.position,
          target
        );
        if (distance <= blastRadius) {
          const damage = robot.attack * 10;
          otherRobot.mass = Math.max(1, otherRobot.mass - damage);
          otherRobot.radius = GameUtils.calculateRadius(otherRobot.mass);
        }
      }
    }
  }

  static activateMagnet(robot: Robot, room: GameRoom): void {
    const magnetRadius = 150;
    for (const [, junk] of room.junk) {
      const distance = GameUtils.calculateDistance(
        junk.position,
        robot.position
      );
      if (distance <= magnetRadius) {
        const dx = robot.position.x - junk.position.x;
        const dy = robot.position.y - junk.position.y;
        const moveDistance = Math.min(distance, 20);
        junk.position.x += (dx / distance) * moveDistance;
        junk.position.y += (dy / distance) * moveDistance;
      }
    }
  }

  static activateTeleport(
    robot: Robot,
    target: Position | undefined,
    room: GameRoom
  ): void {
    if (!target) return;

    robot.position = GameUtils.clampToRoomBounds(target, robot.radius, room);
  }

  static activateTransformer(robot: Robot, room: GameRoom): void {
    if (robot.mass > 20) {
      const convertAmount = Math.floor(robot.mass * 0.15);
      robot.mass -= convertAmount;
      robot.radius = GameUtils.calculateRadius(robot.mass);

      for (let i = 0; i < 3; i++) {
        const junk: Junk = {
          id: uuidv4(),
          position: {
            x: robot.position.x + (Math.random() - 0.5) * 80,
            y: robot.position.y + (Math.random() - 0.5) * 80,
          },
          mass: convertAmount / 3,
          type: "energy",
        };
        room.junk.set(junk.id, junk);
      }
    }
  }

  static activateTool(
    robot: Robot,
    tool: Tool,
    target: Position | undefined,
    room: GameRoom
  ): void {
    if (!robot.tools.includes(tool)) return;

    switch (tool) {
      case "blaster":
        this.activateBlaster(robot, target, room);
        break;
      case "magnet":
        this.activateMagnet(robot, room);
        break;
      case "teleport":
        this.activateTeleport(robot, target, room);
        break;
      case "transformer":
        this.activateTransformer(robot, room);
        break;
    }
  }

  static getAvailableTools(robot: Robot): Tool[] {
    const allTools: Tool[] = ["blaster", "magnet", "teleport", "transformer"];
    return allTools.filter((tool) => !robot.tools.includes(tool));
  }
}

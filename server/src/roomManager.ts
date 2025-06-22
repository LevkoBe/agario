import { v4 as uuidv4 } from "uuid";
import { GameRoom, GameMode, Robot, Junk } from "./types.js";
import { GameUtils } from "./utils.js";

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  constructor() {
    this.createRoom("public", "ffa", false);
  }

  createRoom(id: string, mode: GameMode, isPrivate: boolean): GameRoom {
    const room: GameRoom = {
      id,
      robots: new Map(),
      junk: new Map(),
      structures: new Map(),
      mode,
      isPrivate,
      bounds: { width: 2000, height: 2000 },
    };

    this.rooms.set(id, room);
    console.log(
      `Created room ${id} (${mode}, ${isPrivate ? "private" : "public"})`
    );
    return room;
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  getAllRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  deleteRoom(id: string): boolean {
    return this.rooms.delete(id);
  }

  updateRoom(room: GameRoom) {
    // const now = Date.now();

    // Update robot positions
    for (const robot of room.robots.values()) {
      if (robot.direction.x !== 0 || robot.direction.y !== 0) {
        const speed = robot.speed * 2;
        robot.position.x += robot.direction.x * speed;
        robot.position.y += robot.direction.y * speed;

        const clampedPosition = GameUtils.clampToRoomBounds(
          robot.position,
          robot.radius,
          room
        );
        robot.position = clampedPosition;
      }
    }

    // Check collisions between robots and junk
    for (const robot of room.robots.values()) {
      for (const [junkId, junk] of room.junk) {
        if (
          GameUtils.checkCollision(
            robot.position,
            robot.radius,
            junk.position,
            5
          )
        ) {
          robot.mass += junk.mass;
          robot.radius = GameUtils.calculateRadius(robot.mass);
          room.junk.delete(junkId);
        }
      }
    }

    // Check robot vs robot collisions (eating)
    const robots = Array.from(room.robots.values());
    const destructions: { destroyedId: string; attackerId: string }[] = [];
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const robot1 = robots[i];
        const robot2 = robots[j];

        if (
          GameUtils.checkCollision(
            robot1.position,
            robot1.radius,
            robot2.position,
            robot2.radius
          )
        ) {
          if (robot1.mass > robot2.mass * 1.2) {
            robot1.mass += robot2.mass;
            robot1.radius = GameUtils.calculateRadius(robot1.mass);
            room.robots.delete(robot2.id);

            destructions.push({
              destroyedId: robot2.id,
              attackerId: robot1.id,
            });
          } else if (robot2.mass > robot1.mass * 1.2) {
            robot2.mass += robot1.mass;
            robot2.radius = GameUtils.calculateRadius(robot2.mass);
            room.robots.delete(robot1.id);

            destructions.push({
              destroyedId: robot1.id,
              attackerId: robot2.id,
            });
          }
        }
      }
    }

    // Spawn new junk randomly
    if (room.junk.size < 200 && Math.random() < 0.1) {
      const junk: Junk = {
        id: uuidv4(),
        position: {
          x: Math.random() * room.bounds.width,
          y: Math.random() * room.bounds.height,
        },
        mass: Math.random() * 3 + 1,
        type: GameUtils.getRandomJunkType(),
      };
      room.junk.set(junk.id, junk);
    }

    return destructions;
  }

  createRobot(nickname: string, room: GameRoom): Robot {
    const robotId = uuidv4();
    const robot: Robot = {
      id: robotId,
      nickname,
      mass: 10,
      tools: [],
      position: GameUtils.getRandomSpawnPosition(room),
      radius: GameUtils.calculateRadius(10),
      color: GameUtils.getRandomColor(),
      ownerId: robotId,
      speed: 1,
      defense: 1,
      attack: 1,
      direction: { x: 0, y: 0 },
      lastUpdate: Date.now(),
    };

    room.robots.set(robotId, robot);
    return robot;
  }

  removeRobot(roomId: string, robotId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.robots.delete(robotId);
  }
}

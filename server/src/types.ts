export type GameMode = "ffa" | "teams" | "sandbox";
export type Tool = "blaster" | "magnet" | "teleport" | "transformer";
export type Upgrade = "speed" | "defense" | "attack" | "toolSlot";
export type JunkType = "metal" | "circuit" | "energy";
export type StructureType = "base" | "wall";

export interface Position {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  nickname: string;
  mass: number;
  tools: Tool[];
  position: Position;
  radius: number;
  color: string;
  ownerId: string;
  speed: number;
  defense: number;
  attack: number;
  direction: Position;
  lastUpdate: number;
}

export interface Junk {
  id: string;
  position: Position;
  mass: number;
  type?: JunkType;
}

export interface Structure {
  id: string;
  position: Position;
  type: StructureType;
  health: number;
  ownerId?: string;
}

export interface GameRoom {
  id: string;
  robots: Map<string, Robot>;
  junk: Map<string, Junk>;
  structures: Map<string, Structure>;
  mode: GameMode;
  isPrivate: boolean;
  bounds: { width: number; height: number };
}

// Message types
export interface JoinMessage {
  type: "join";
  nickname: string;
  mode?: GameMode;
  privateRoom?: boolean | string;
}

export interface MoveMessage {
  type: "move";
  direction: Position;
}

export interface ActivateToolMessage {
  type: "activateTool";
  tool: Tool;
  target?: Position;
}

export interface DropJunkMessage {
  type: "dropJunk";
}

export interface ConstructBaseMessage {
  type: "constructBase";
  position: Position;
}

export interface EvolveMessage {
  type: "evolve";
  upgrade: Upgrade;
}

export type ClientMessage =
  | JoinMessage
  | MoveMessage
  | ActivateToolMessage
  | DropJunkMessage
  | ConstructBaseMessage
  | EvolveMessage;

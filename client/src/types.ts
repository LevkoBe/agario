export interface Position {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  nickname: string;
  position: Position;
  mass: number;
  radius?: number;
  color?: string;
  tools?: ToolType[];
}

export interface Junk {
  position: Position;
  mass: number;
  type: "metal" | "circuit" | "energy";
}

export interface Structure {
  type: "base" | "wall";
  position: Position;
  ownerId?: string;
  health?: number;
}

export interface GameState {
  robots: Robot[];
  junk: Junk[];
  structures: Structure[];
}

export interface PlayerData {
  id: string;
  nickname: string;
  roomId: string;
  mass: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface Mouse {
  x: number;
  y: number;
}

export interface LeaderboardEntry {
  nickname: string;
  mass: number;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  self?: {
    rank: number;
    mass: number;
  };
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface SpawnConfirmMessage extends WebSocketMessage {
  type: "spawnConfirm";
  id: string;
  nickname: string;
  roomId: string;
  initialMass: number;
}

export interface GameStateMessage extends WebSocketMessage {
  type: "gameState";
  robots: Robot[];
  junk: Junk[];
  structures: Structure[];
}

export interface DestroyedMessage extends WebSocketMessage {
  type: "destroyed";
  score: number;
  by?: string;
}

export interface LeaderboardMessage extends WebSocketMessage {
  type: "leaderboard";
  top: LeaderboardEntry[];
  self?: {
    rank: number;
    mass: number;
  };
}

export interface PlayerLeftMessage extends WebSocketMessage {
  type: "playerLeft";
  id: string;
}

export interface JoinMessage extends WebSocketMessage {
  type: "join";
  nickname: string;
  mode: string;
  privateRoom?: boolean;
}

export interface MoveMessage extends WebSocketMessage {
  type: "move";
  direction: Position;
}

export interface ActivateToolMessage extends WebSocketMessage {
  type: "activateTool";
  tool: string;
  target?: Position;
}

export interface DropJunkMessage extends WebSocketMessage {
  type: "dropJunk";
}

export interface ConstructBaseMessage extends WebSocketMessage {
  type: "constructBase";
  position: Position;
}
export interface SpeedupMessage extends WebSocketMessage {
  type: "speedup";
}
export interface CreateBotMessage extends WebSocketMessage {
  type: "createBot";
}
export interface SelectBotTypeMessage extends WebSocketMessage {
  type: "selectBotType";
  index: number;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type ToolType = "blaster" | "magnet" | "teleport" | "transformer";

export type BotType = "moving" | "shooting" | "protecting";

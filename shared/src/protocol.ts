/**
 * All possible messages exchanged between client and server.
 */
export type Message =
  | JoinMessage
  | InputMessage
  | SplitMessage
  | FeedMessage
  | SpeedupMessage
  | LeaveMessage
  | PlayerDataMessage
  | GameStateMessage
  | DeathMessage
  | LeaderboardMessage
  | AvailableSkinsMessage
  | CustomSkinBroadcastMessage
  | PlayerDisconnectedMessage;

// Client → Server

export interface JoinMessage {
  type: "join";
  nickname: string;
  mode?: "FFA" | "Death Match" | "Teams" | "Other";
  privateServer?: true | string; // Guid
  customSkin?: string; // base64 or skin ID
}

export interface InputMessage {
  type: "input";
  direction: {
    x: number;
    y: number;
  };
}

export interface SplitMessage {
  type: "split";
}

export interface FeedMessage {
  type: "feed";
}

export interface SpeedupMessage {
  type: "speedup";
}

export interface LeaveMessage {
  type: "leave";
}

// Server → Client

export interface PlayerDataMessage {
  type: "playerData";
  id: string; // Guid
  nickname: string;
  width: number;
  height: number;
  roomId: string; // Guid
  currentImages: Array<{
    id: string;
    image: string; // base64 or skin ID
  }>;
}

export interface GameStateMessage {
  type: "gameState";
  visiblePlayers: Array<{
    id: string;
    nickname: string;
    score: number;
    cells: Array<{
      x: number;
      y: number;
      radius: number;
      color: string; // e.g., "rgb(255,0,0)"
    }>;
    abilities?: {
      speed: number; // 0 - 5
    };
  }>;
  visibleFood: Array<{
    x: number;
    y: number;
    radius: number;
    color: number;
    type?: "normal" | "speed" | "shield" | "unknown";
    visibility?: number; // 0 - 100
  }>;
  timestamp: number;
}

export interface DeathMessage {
  type: "death";
  score: number;
}

export interface LeaderboardMessage {
  type: "leaderboard";
  topPlayers: Array<{
    nickname: string;
    score: number;
  }>;
  personal: {
    rank: number;
    score: number;
  };
}

export interface AvailableSkinsMessage {
  type: "availableSkins";
  skins: Array<{
    id: string;
    image: string; // base64
  }>;
}

export interface CustomSkinBroadcastMessage {
  type: "customSkinBroadcast";
  id: string;
  image: string; // base64 or skin ID
}

export interface PlayerDisconnectedMessage {
  type: "playerDisconnected";
  id: string;
}

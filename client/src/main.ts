import { RobotArenaClient } from "./robot-arena-client";
const websocketServerUrl: string = "ws://localhost:8080";

let game: RobotArenaClient;

declare global {
  interface Window {
    joinGame: () => void;
  }
}

window.joinGame = function (): void {
  if (game) {
    game.joinGame();
  }
};

window.addEventListener("load", () => {
  game = new RobotArenaClient();
  game.connectToServer(websocketServerUrl);
  console.log("Robot Arena Client initialized");
});

window.addEventListener("beforeunload", () => {
  if (game) {
    game.disconnect();
  }
});

export { RobotArenaClient };

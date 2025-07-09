import { LeaderboardData, ConnectionStatus, ToolType } from "./types";

export class UIManager {
  constructor() {
    this.focusNicknameInput();
  }

  private focusNicknameInput(): void {
    const nicknameInput = document.getElementById(
      "nicknameInput"
    ) as HTMLInputElement;
    if (nicknameInput) {
      nicknameInput.focus();
    }
  }

  public updatePlayerStats(mass: number): void {
    const playerMassElement = document.getElementById("playerMass");
    if (playerMassElement) {
      playerMassElement.textContent = Math.round(mass).toString();
    }
  }

  public updateTools(tools: ToolType[]): void {
    const toolElements = document.querySelectorAll(
      ".tool-slot"
    ) as NodeListOf<HTMLElement>;
    toolElements.forEach((el) => (el.style.display = "none"));

    tools.forEach((tool) => {
      const element = document.getElementById(`tool-${tool}`) as HTMLElement;
      if (element) {
        element.style.display = "inline-block";
        element.classList.remove("tool-selected", "tool-active");
      }
    });
  }

  public updateSelectedTool(tool: ToolType): void {
    const allToolElements = document.querySelectorAll(".tool-slot");
    allToolElements.forEach((el) =>
      el.classList.remove("tool-selected", "tool-active")
    );

    const toolElement = document.getElementById(`tool-${tool}`) as HTMLElement;
    if (toolElement) {
      toolElement.classList.add("tool-selected");
    }
  }

  public activateToolFeedback(tool: ToolType): void {
    const toolElement = document.getElementById(`tool-${tool}`) as HTMLElement;
    if (toolElement) {
      toolElement.classList.add("tool-active");
      setTimeout(() => toolElement.classList.remove("tool-active"), 200);
    }
  }

  public updateLeaderboard(data: LeaderboardData): void {
    const list = document.getElementById("leaderboardList");
    if (!list) return;

    list.innerHTML = "";

    data.top.forEach((player, index) => {
      const item = document.createElement("div");
      item.className = "leaderboard-item";
      item.innerHTML = `<span>${index + 1}. ${
        player.nickname
      }</span> <span>${Math.round(player.mass)}</span>`;
      list.appendChild(item);
    });

    if (data.self) {
      const playerRankElement = document.getElementById("playerRank");
      const playerScoreElement = document.getElementById("playerScore");

      if (playerRankElement) {
        playerRankElement.textContent = data.self.rank.toString();
      }
      if (playerScoreElement) {
        playerScoreElement.textContent = Math.round(data.self.mass).toString();
      }
    }
  }

  public updateConnectionStatus(status: ConnectionStatus): void {
    const element = document.getElementById("connectionStatus");
    if (element) {
      element.className = status;
      element.textContent = status.toUpperCase();
    }
  }

  public hideJoinScreen(): void {
    this.toggleScreens({
      joinScreen: false,
      stats: true,
      leaderboard: true,
      controls: true,
      tools: true,
    });
  }

  public showJoinScreen(): void {
    this.toggleScreens({
      joinScreen: true,
      stats: false,
      leaderboard: false,
      controls: false,
      tools: false,
    });
  }

  private toggleScreens(state: Record<string, boolean>): void {
    Object.entries(state).forEach(([id, visible]) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle("hidden", !visible);
      }
    });
  }

  public showGameOverAlert(score: number, destroyedBy?: string): void {
    const message = `Game Over! Final Score: ${score}${
      destroyedBy ? " (Destroyed by another player)" : ""
    }`;
    alert(message);
  }

  public showErrorAlert(message: string): void {
    alert(message);
  }

  public getJoinFormData(): {
    nickname: string;
    mode: string;
    privateRoom: boolean;
    serverUrl: string;
  } | null {
    const nicknameInput = document.getElementById(
      "nicknameInput"
    ) as HTMLInputElement;
    const modeSelect = document.getElementById(
      "modeSelect"
    ) as HTMLSelectElement;
    const privateRoomCheck = document.getElementById(
      "privateRoomCheck"
    ) as HTMLInputElement;
    const serverUrlInput = document.getElementById(
      "serverUrl"
    ) as HTMLInputElement;

    if (!nicknameInput || !modeSelect || !privateRoomCheck || !serverUrlInput) {
      return null;
    }

    const nickname = nicknameInput.value.trim();
    const mode = modeSelect.value;
    const privateRoom = privateRoomCheck.checked;
    const serverUrl = serverUrlInput.value.trim();

    if (!nickname) {
      this.showErrorAlert("Please enter a nickname");
      return null;
    }

    if (!serverUrl) {
      this.showErrorAlert("Please enter server URL");
      return null;
    }

    return { nickname, mode, privateRoom, serverUrl };
  }

  public resetToolUI(): void {
    const toolElements = document.querySelectorAll(".tool-slot");
    toolElements.forEach((el) => {
      el.classList.remove("tool-selected", "tool-active");
      (el as HTMLElement).style.display = "none";
    });
  }
}

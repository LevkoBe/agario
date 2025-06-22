import { LeaderboardData, ConnectionStatus } from "./types";

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

  public updateTools(tools: string[]): void {
    const toolElements = document.querySelectorAll(
      ".tool-slot"
    ) as NodeListOf<HTMLElement>;
    toolElements.forEach((el) => (el.style.display = "none"));

    if (tools) {
      tools.forEach((tool) => {
        const element = document.getElementById(`tool-${tool}`) as HTMLElement;
        if (element) {
          element.style.display = "inline-block";
        }
      });
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
    const elementsToHide = ["joinScreen"];
    const elementsToShow = ["stats", "leaderboard", "controls", "tools"];

    elementsToHide.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add("hidden");
      }
    });

    elementsToShow.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove("hidden");
      }
    });
  }

  public showJoinScreen(): void {
    const elementsToShow = ["joinScreen"];
    const elementsToHide = ["stats", "leaderboard", "controls", "tools"];

    elementsToShow.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove("hidden");
      }
    });

    elementsToHide.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add("hidden");
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

  public activateToolFeedback(tool: string): void {
    const toolElement = document.getElementById(`tool-${tool}`) as HTMLElement;
    if (toolElement) {
      toolElement.classList.add("tool-active");
      setTimeout(() => toolElement.classList.remove("tool-active"), 200);
    }
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
}

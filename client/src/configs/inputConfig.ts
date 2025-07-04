export interface InputConfig {
  keyBindings: {
    actions: {
      dropJunk: string;
      activateTool: string;
      speedup: string;
      nextTool: string;
      prevTool: string;
      createBot: string;
      confirmAction: string;
    };
    toolSelection: Record<string, number>;
    botTypeSelection: Record<string, number>;
    movement: {
      up: string;
      down: string;
      left: string;
      right: string;
    };
  };
  ui: {
    joinScreenId: string;
    exitScreenId: string;
    hiddenClass: string;
  };
  keyboardMovementEnabled: boolean;
  mouseActivationEnabled: boolean;
}

export function createDigitMapping(
  startIndex: number = 0
): Record<string, number> {
  const mapping: Record<string, number> = {};
  const digitKeys = [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
  ];

  digitKeys.forEach((key, i) => {
    mapping[key] = startIndex + i;
  });

  return mapping;
}

export const defaultInputConfig: InputConfig = {
  keyBindings: {
    actions: {
      dropJunk: "KeyX",
      activateTool: "Space",
      speedup: "ShiftLeft",
      nextTool: "KeyE",
      prevTool: "KeyQ",
      createBot: "KeyB",
      confirmAction: "Enter",
    },
    toolSelection: createDigitMapping(0),
    botTypeSelection: createDigitMapping(0),
    movement: {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    },
  },
  ui: {
    joinScreenId: "joinScreen",
    exitScreenId: "exitScreen",
    hiddenClass: "hidden",
  },
  keyboardMovementEnabled: false,
  mouseActivationEnabled: false,
};

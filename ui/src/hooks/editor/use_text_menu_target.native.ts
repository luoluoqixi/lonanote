import { TextInput } from "react-native";

export type TextMenuAction = "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";

export function useTextMenuTarget() {
  const isActive = () => Boolean(TextInput.State.currentlyFocusedInput());
  return {
    active: isActive(),
    isActive,
    selectable: false,
    writable: false,
    selected: false,
    execute: async (action: TextMenuAction) => {
      void action;
    },
  };
}

import type { EditorCommand } from "../bridge/protocol";

type FocusTarget = { focus(): unknown; focusInput(): void };

/** 菜单归还焦点时保留当前选区；普通 focus 仍沿用定位文末的既有行为。 */
export function applyEditorFocusCommand(
  editor: FocusTarget,
  command: Extract<EditorCommand, { type: "editor.focus" }>,
): void {
  if (command.preserveSelection) editor.focusInput();
  else editor.focus();
}

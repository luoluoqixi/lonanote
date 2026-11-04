import type { ViewShortcutAction } from "@/assets/editor/src/bridge/view_shortcuts";

export function useAppViewShortcuts(_execute: (action: ViewShortcutAction) => Promise<void>) {
  void _execute;
}

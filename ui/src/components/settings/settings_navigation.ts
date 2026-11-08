import type { SettingsPageId } from "./settings_config";

export type SettingsLocation = { id: SettingsPageId; params: Record<string, string> };
export type SettingsNavigationAction =
  | { type: "back" }
  | { type: "push" | "reset"; id: SettingsPageId; params?: Record<string, string> };
export function settingsNavigation(
  stack: SettingsLocation[],
  action: SettingsNavigationAction,
): SettingsLocation[] {
  if (action.type === "back") return stack.length > 1 ? stack.slice(0, -1) : stack;
  const location = { id: action.id, params: action.params ?? {} };
  return action.type === "reset" ? [location] : [...stack, location];
}

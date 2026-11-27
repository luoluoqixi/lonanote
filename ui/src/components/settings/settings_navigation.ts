import type { SettingsPageId } from "./settings_config";

export type SettingsLocation = { id: SettingsPageId; params: Record<string, string> };
export type SettingsNavigationAction =
  | { type: "back" }
  | { type: "push" | "reset"; id: SettingsPageId; params?: Record<string, string> };

/** 桌面设置侧栏采用纵向 tab 键盘导航，Tab 留给浏览器移动至内容区。 */
export function settingsTabTarget(
  ids: readonly SettingsPageId[],
  currentId: SettingsPageId,
  key: string,
): SettingsPageId | undefined {
  if (!ids.length) return undefined;
  if (key === "Home") return ids[0];
  if (key === "End") return ids[ids.length - 1];
  const index = Math.max(0, ids.indexOf(currentId));
  if (key === "ArrowDown") return ids[(index + 1) % ids.length];
  if (key === "ArrowUp") return ids[(index + ids.length - 1) % ids.length];
  return undefined;
}

export function settingsNavigation(
  stack: SettingsLocation[],
  action: SettingsNavigationAction,
): SettingsLocation[] {
  if (action.type === "back") return stack.length > 1 ? stack.slice(0, -1) : stack;
  const location = { id: action.id, params: action.params ?? {} };
  return action.type === "reset" ? [location] : [...stack, location];
}

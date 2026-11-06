export type ViewShortcutAction =
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "toggleFullscreen"
  | "newWindow";

export function getViewShortcutAction(
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    repeat: boolean;
    isComposing: boolean;
    shiftKey?: boolean;
  },
  platform: string,
): ViewShortcutAction | null {
  if (!["windows", "linux", "macos"].includes(platform) || event.altKey || event.isComposing)
    return null;
  if (event.key === "F11" && !event.ctrlKey && !event.metaKey && !event.repeat)
    return "toggleFullscreen";
  if (platform === "macos" ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey)
    return null;
  if (event.key.toLowerCase() === "n" && event.shiftKey && !event.repeat) return "newWindow";
  if (["+", "=", "Add"].includes(event.key)) return "zoomIn";
  if (["-", "Subtract"].includes(event.key)) return "zoomOut";
  if (event.key === "0") return "zoomReset";
  return null;
}

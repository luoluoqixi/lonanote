import type { EditorPlatform, EditorPreferences } from "../bridge/protocol";

export function getEditorLinkOpenMode(
  platform: EditorPlatform,
  preferences: Pick<EditorPreferences, "linkOpenRequiresCtrl">,
): "click" | "controlOrCommand" {
  return platform !== "ios" && platform !== "android" && preferences.linkOpenRequiresCtrl !== false
    ? "controlOrCommand"
    : "click";
}

export function shouldActivateEditorLink(
  platform: EditorPlatform,
  preferences: Pick<EditorPreferences, "linkOpenRequiresCtrl">,
  event: Pick<MouseEvent, "button" | "ctrlKey" | "metaKey">,
): boolean {
  return (
    event.button === 0 &&
    (getEditorLinkOpenMode(platform, preferences) === "click" ||
      (platform === "macos" ? event.metaKey : event.ctrlKey))
  );
}

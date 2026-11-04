export type EditorAppMenuKey = {
  type: "keydown" | "keyup";
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
};

export function isEditorAppMenuKey(value: unknown): value is EditorAppMenuKey {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    (event.type === "keydown" || event.type === "keyup") &&
    typeof event.key === "string" &&
    event.key.length > 0 &&
    event.key.length <= 32 &&
    ["altKey", "ctrlKey", "metaKey", "shiftKey", "repeat", "isComposing"].every(
      (key) => typeof event[key] === "boolean",
    )
  );
}

/** iframe 内键盘事件不冒泡；仅转发桌面 Alt 序列，普通编辑键继续由编辑器处理。 */
export function installEditorAppMenuKeys(
  win: Window,
  platform: () => string,
  send: (key: EditorAppMenuKey) => void,
) {
  const handle = (event: KeyboardEvent) => {
    if (!["windows", "linux"].includes(platform()) || (!event.altKey && event.key !== "Alt"))
      return;
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.isComposing &&
      (event.key === "Alt" || ["f", "e", "s", "h"].includes(event.key.toLowerCase()))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
    send({
      type: event.type as EditorAppMenuKey["type"],
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
    });
  };
  win.addEventListener("keydown", handle, true);
  win.addEventListener("keyup", handle, true);
  return () => {
    win.removeEventListener("keydown", handle, true);
    win.removeEventListener("keyup", handle, true);
  };
}

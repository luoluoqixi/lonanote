import type { TreeInputIntent } from "./tree_types";

export function treeKeyboardIntent({
  key,
  shiftKey,
  ctrlKey,
  metaKey,
  editable,
}: {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  editable?: boolean;
}): TreeInputIntent | null {
  if (editable) return null;
  const selection = shiftKey ? "range" : ctrlKey || metaKey ? "toggle" : "replace";
  switch (key) {
    case "ArrowDown":
      return { type: "moveFocus", delta: 1 };
    case "ArrowUp":
      return { type: "moveFocus", delta: -1 };
    case "ArrowRight":
      return { type: "expand" };
    case "ArrowLeft":
      return { type: "collapse" };
    case "Enter":
      return { type: "activate" };
    case " ":
      return ctrlKey || metaKey || shiftKey ? { type: "select", selection } : { type: "activate" };
    default:
      return null;
  }
}

export function createTreeScrollCoordinator(scroll: (index: number) => void) {
  let target: { path: string; epoch: number; retries: number; index: number | null } | null = null;
  return {
    request: (path: string, epoch: number) => {
      target = { path, epoch, retries: 0, index: null };
    },
    cancel: () => {
      target = null;
    },
    update: (paths: string[], epoch: number) => {
      if (!target) return;
      if (target.epoch !== epoch) {
        target = null;
        return;
      }
      const index = paths.indexOf(target.path);
      if (index >= 0 && target.index === null) {
        target.index = index;
        scroll(index);
      }
    },
    retry: () => {
      if (!target || target.index === null || target.retries >= 2) return;
      target.retries++;
      scroll(target.index);
    },
  };
}

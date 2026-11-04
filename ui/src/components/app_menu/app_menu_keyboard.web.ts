export const appMenuMnemonics: Record<string, string> = {
  file: "F",
  edit: "E",
  selection: "S",
  help: "H",
};

/** body 或已移除的原目标可能无法聚焦，仍须移除菜单自身的焦点。 */
export function restoreAppMenuFocus(doc: Document, previous: HTMLElement | null) {
  const focused = doc.activeElement as HTMLElement | null;
  if (previous?.isConnected) previous.focus();
  if (
    doc.activeElement === focused &&
    focused?.closest("[data-app-menubar], [role=menu], [data-app-menu-trigger]")
  )
    focused.blur();
}

/** 应用级 Alt 助记键；菜单内方向键交给 rn-ui-kit 的 roving focus。 */
export function installAppMenuKeyboard(
  win: Window,
  actions: {
    blocked(): boolean;
    focus(): void;
    open(id: string): void;
    reset(reason: "keyboard" | "pointer" | "blur"): void;
    showHints(show: boolean): void;
  },
) {
  let altAlone = false;
  let active = false;
  const reset = (reason: "keyboard" | "pointer" | "blur" = "keyboard") => {
    altAlone = false;
    active = false;
    actions.showHints(false);
    actions.reset(reason);
  };
  const down = (event: KeyboardEvent) => {
    if (
      actions.blocked() ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.getModifierState("AltGraph")
    ) {
      altAlone = false;
      return;
    }
    if (event.key === "Alt") {
      if (!event.repeat) altAlone = true;
      actions.showHints(true);
      event.preventDefault();
      return;
    }
    altAlone = false;
    if (event.key === "Escape") {
      if (active) {
        event.preventDefault();
        event.stopPropagation();
        reset();
      }
      return;
    }
    if (!(event.altKey || active)) return;
    const match = Object.entries(appMenuMnemonics).find(
      ([, key]) => key === event.key.toUpperCase(),
    );
    if (match) {
      event.preventDefault();
      event.stopPropagation();
      active = true;
      actions.showHints(true);
      actions.open(match[0]);
    }
  };
  const up = (event: KeyboardEvent) => {
    if (event.key !== "Alt") return;
    if (altAlone && !actions.blocked()) {
      event.preventDefault();
      if (active) reset();
      else {
        active = true;
        actions.focus();
      }
    }
    altAlone = false;
    if (!active) actions.showHints(false);
  };
  win.addEventListener("keydown", down, true);
  win.addEventListener("keyup", up, true);
  const blur = () => reset("blur");
  const pointer = () => reset("pointer");
  win.addEventListener("blur", blur);
  win.addEventListener("pointerdown", pointer, true);
  return () => {
    win.removeEventListener("keydown", down, true);
    win.removeEventListener("keyup", up, true);
    win.removeEventListener("blur", blur);
    win.removeEventListener("pointerdown", pointer, true);
  };
}

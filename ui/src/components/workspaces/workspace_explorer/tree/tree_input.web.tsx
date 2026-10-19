import { treeKeyboardIntent } from "./tree_input_intent";
import type { TreeInputProps } from "./tree_input_props";

export function TreeInput({ children, activeDescendant, onIntent }: TreeInputProps) {
  return (
    <div
      role="tree"
      aria-label="工作区文件"
      aria-multiselectable
      aria-activedescendant={activeDescendant}
      tabIndex={0}
      style={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, outline: "none" }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        const target = event.target as HTMLElement;
        if (target.closest("button,a,[role=button],[role=menu]")) return;
        const editable = Boolean(
          target.closest(
            "input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]",
          ),
        );
        const intent = treeKeyboardIntent({
          key: event.key,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          editable,
        });
        if (intent) {
          event.preventDefault();
          event.stopPropagation();
          onIntent(intent);
        }
      }}
      onClickCapture={(event) => {
        // mousedown 的默认焦点先落在 Pressable，再于 click 阶段交给树根。
        // 按钮和菜单继续自行管理焦点；不在 pointerdown 时与浏览器默认行为竞争。
        const target = event.target as HTMLElement;
        if (
          event.button === 0 &&
          target.closest("[role=treeitem]") &&
          !target.closest("button,a,[role=button],input,textarea,select,[role=menu]")
        )
          event.currentTarget.focus({ preventScroll: true });
      }}
    >
      {children}
    </div>
  );
}

/** 欢迎页背景允许双击新建；按钮、历史记录等交互元素保持自己的操作。 */
export function isEmptyEditorTarget(target: { closest(selector: string): unknown }): boolean {
  return !target.closest(
    "button, a, input, textarea, select, [role=button], [role=menuitem], [data-editor-interactive]",
  );
}

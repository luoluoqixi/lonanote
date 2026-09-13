/** 工具栏 Padding Vertical */
export const MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL = 3;

/** 工具栏高度。 */
export const MOBILE_EDITOR_TOOLBAR_HEIGHT = 42;

/** iOS 26+ Liquid Glass 工具栏高度。 */
export const MOBILE_EDITOR_LIQUID_GLASS_TOOLBAR_HEIGHT = 46;

export function getMobileEditorToolbarHeight(isIos26OrLater: boolean): number {
  return isIos26OrLater ? MOBILE_EDITOR_LIQUID_GLASS_TOOLBAR_HEIGHT : MOBILE_EDITOR_TOOLBAR_HEIGHT;
}

export function getMobileEditorToolbarContainerHeight(isIos26OrLater: boolean): number {
  return getMobileEditorToolbarHeight(isIos26OrLater) + MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL * 2;
}

/** 尚未测得软键盘高度时，移动端工具栏面板使用的回退高度。 */
export const MOBILE_EDITOR_TOOLBAR_PANEL_FALLBACK_HEIGHT = 320;

/** 等待原生键盘从自定义面板恢复的最长时间。 */
export const MOBILE_EDITOR_KEYBOARD_RESTORE_TIMEOUT_MS = 800;

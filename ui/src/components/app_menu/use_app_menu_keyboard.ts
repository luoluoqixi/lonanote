/** 非 Web 平台不注册桌面键盘事件。 */
export function useAppMenuKeyboard(_options: { compact: boolean; capture(): void; close(): void }) {
  void _options;
  return {
    showHints: false,
    focusedId: null,
    restoreFocusOnClose: () => false,
    mnemonics: {} as Record<string, string>,
  };
}

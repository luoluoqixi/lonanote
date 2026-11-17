export type DialogWindowPolicyInput = {
  desktop: boolean;
  tauri: boolean;
  layoutMode: string;
  nativeDialogs: boolean;
  dialogRegistered: boolean;
};

export function shouldUseNativeDialogWindow(input: DialogWindowPolicyInput): boolean {
  return (
    input.desktop &&
    input.tauri &&
    input.layoutMode === "desktop" &&
    input.nativeDialogs &&
    input.dialogRegistered
  );
}

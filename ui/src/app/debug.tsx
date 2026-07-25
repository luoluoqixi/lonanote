import { RnUiKitDebugPanel } from "rn-ui-kit/debug";

export default function DebugScreen() {
  return (
    <RnUiKitDebugPanel
      backButtonLabel="开发者选项"
      navigationMode="host"
      panelSheetProps={{
        snapPoints: ["95%"],
      }}
    />
  );
}

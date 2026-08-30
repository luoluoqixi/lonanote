import { RnUiKitDebugPanel } from "rn-ui-kit/debug";

import { isAndroid } from "@/api/common";

export default function DebugScreen() {
  return (
    <RnUiKitDebugPanel
      backButtonLabel="开发者选项"
      navigationMode="host"
      panelSheetProps={{
        snapPoints: isAndroid() ? ["95%"] : undefined,
      }}
    />
  );
}

import { RnUiKitDebugPanel } from "rn-ui-kit/debug";

import { getAppHomeTitle } from "@/config";

export default function DebugScreen() {
  return (
    <RnUiKitDebugPanel
      backButtonLabel={getAppHomeTitle()}
      navigationMode="host"
      panelSheetProps={{
        snapPoints: ["95%"],
      }}
    />
  );
}

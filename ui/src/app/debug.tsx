import { NavigationIndependentTree } from "@react-navigation/native";
import { RnUiKitDebugPanel } from "rn-ui-kit/debug";

export default function DebugScreen() {
  return (
    <NavigationIndependentTree>
      <RnUiKitDebugPanel />
    </NavigationIndependentTree>
  );
}

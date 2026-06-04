import { Redirect, router } from "expo-router";

import {
  DebugHomeScreen,
  getDebugFullPageHref,
  isDebugFeatureEnabled,
  switchDebugPanelToTrueSheet,
  type DebugTabKey,
} from "@/components/debug";

export default function DebugHomeRouteScreen() {
  if (!isDebugFeatureEnabled()) {
    return <Redirect href="/" />;
  }

  return (
    <DebugHomeScreen
      onOpenFullPage={(key: DebugTabKey) => {
        router.push(getDebugFullPageHref(key));
      }}
      onSwitchToTrueSheet={() => {
        void switchDebugPanelToTrueSheet();
      }}
    />
  );
}

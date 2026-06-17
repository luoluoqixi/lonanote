import { Redirect, router } from "expo-router";

import {
  DebugHomeScreen,
  type DebugTabKey,
  getDebugFullPageHref,
  isDebugFeatureEnabled,
  openDebugSection,
} from "@/components/debug";

export default function DebugHomeRouteScreen() {
  if (!isDebugFeatureEnabled()) {
    return <Redirect href="/" />;
  }

  return (
    <DebugHomeScreen
      onOpenFullPage={(key: DebugTabKey) => {
        void openDebugSection(key).then((handled) => {
          if (!handled) {
            router.push(getDebugFullPageHref(key));
          }
        });
      }}
    />
  );
}

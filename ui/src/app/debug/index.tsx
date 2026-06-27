import { Redirect, router } from "expo-router";

import {
  DebugHomePage,
  type DebugTabKey,
  getDebugFullPageHref,
  isDebugFeatureEnabled,
} from "@/components/debug";

export default function DebugHomeRouteScreen() {
  if (!isDebugFeatureEnabled()) {
    return <Redirect href="/" />;
  }

  return (
    <DebugHomePage
      onOpenFullPage={(key: DebugTabKey) => {
        router.push(getDebugFullPageHref(key));
      }}
    />
  );
}

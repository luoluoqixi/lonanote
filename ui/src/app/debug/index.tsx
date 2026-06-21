import { Redirect, router } from "expo-router";

import {
  DebugHomePage,
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
    <DebugHomePage
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

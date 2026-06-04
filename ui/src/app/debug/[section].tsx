import { Redirect, useLocalSearchParams } from "expo-router";

import { DebugSectionScreen, isDebugFeatureEnabled, isDebugTabKey } from "@/components/debug";

export default function DebugFullPageScreen() {
  const { section } = useLocalSearchParams<{ section: string | string[] }>();
  const sectionKey = Array.isArray(section) ? section[0] : section;

  if (!isDebugFeatureEnabled() || !isDebugTabKey(sectionKey)) {
    return <Redirect href="/" />;
  }

  return <DebugSectionScreen hideInlineHeader layoutHost="screen" sectionKey={sectionKey} />;
}

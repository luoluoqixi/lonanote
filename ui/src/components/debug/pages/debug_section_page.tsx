import { StyleSheet } from "react-native";

import { os } from "@/api/common/platform";
import { ScrollView } from "@/components/ui";
import { TrueSheetScrollContent } from "@/components/ui/sheet/native_sheet/true_sheet/scroll_content";

import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";

export function DebugSectionPage({
  sectionKey,
  layoutHost = "default",
}: {
  sectionKey: DebugTabKey;
  layoutHost?: "default" | "nativeSheet";
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionPage = definition.Page;

  if (layoutHost === "nativeSheet" && definition.presentation === "static") {
    return (
      <TrueSheetScrollContent
        contentContainerStyle={styles.staticScrollContent}
        style={styles.staticScrollView}
      >
        <SectionPage />
      </TrueSheetScrollContent>
    );
  }

  if (definition.presentation === "static") {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior={os() === "ios" ? "automatic" : "never"}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.pageScrollView}
      >
        <SectionPage />
      </ScrollView>
    );
  }
  return <SectionPage />;
}

const styles = StyleSheet.create({
  staticScrollContent: {
    paddingBottom: 12,
  },
  staticScrollView: {
    flex: 1,
    minHeight: 0,
  },
  pageScrollView: {
    flex: 1,
    minHeight: 0,
  },
});

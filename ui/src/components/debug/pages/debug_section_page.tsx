import { StyleSheet } from "react-native";

import { TrueSheetScrollContent } from "@/components/ui/true_sheet/scroll_content";

import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";

export function DebugSectionPage({
  sectionKey,
  layoutHost = "default",
}: {
  sectionKey: DebugTabKey;
  layoutHost?: "default" | "trueSheet";
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionPage = definition.Page;

  if (layoutHost === "trueSheet" && definition.presentation === "static") {
    return (
      <TrueSheetScrollContent
        contentContainerStyle={styles.staticScrollContent}
        style={styles.staticScrollView}
      >
        <SectionPage />
      </TrueSheetScrollContent>
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
});

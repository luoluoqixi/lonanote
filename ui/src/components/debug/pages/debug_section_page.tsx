import { StyleSheet, View } from "react-native";

import { os } from "@/api/common/platform";
import { ScrollView, Text } from "@/components/ui";
import { TrueSheetScrollContent } from "@/components/ui/sheet/native_sheet/true_sheet/scroll_content";

import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";

export function DebugSectionPage({
  contentTitle,
  sectionKey,
  layoutHost = "default",
}: {
  contentTitle?: string;
  sectionKey: DebugTabKey;
  layoutHost?: "default" | "nativeSheet";
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionPage = definition.Page;
  const header =
    contentTitle == null ? undefined : <DebugSectionContentHeader title={contentTitle} />;

  if (layoutHost === "nativeSheet" && definition.presentation === "static") {
    return (
      <TrueSheetScrollContent
        contentContainerStyle={styles.staticScrollContent}
        style={styles.staticScrollView}
      >
        {header != null ? <View style={styles.staticContentHeader}>{header}</View> : null}
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
        <SectionPage header={header} />
      </ScrollView>
    );
  }
  return <SectionPage header={header} />;
}

function DebugSectionContentHeader({ title }: { title: string }) {
  return (
    <Text fontSize="$7" fontWeight="700" style={styles.contentTitle}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  contentTitle: {
    paddingBottom: 8,
  },
  staticScrollContent: {
    paddingBottom: 12,
  },
  staticScrollView: {
    flex: 1,
    minHeight: 0,
  },
  staticContentHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pageScrollView: {
    flex: 1,
    minHeight: 0,
  },
});

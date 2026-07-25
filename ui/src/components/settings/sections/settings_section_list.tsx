import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { NativeList } from "rn-ui-kit";

import type { AppLayoutMode } from "@/stores/ui";

export type SettingsPanelProps = {
  onLayoutModeChange?: (layoutMode: AppLayoutMode) => void;
  tracksNavigationBarScrollEdge?: boolean;
};

type SettingsSectionListProps = SettingsPanelProps & {
  children: ReactNode;
};

export function SettingsSectionList({
  children,
  tracksNavigationBarScrollEdge = false,
}: SettingsSectionListProps) {
  return (
    <View style={styles.container}>
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
        contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        {children}
      </NativeList>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    minHeight: 0,
  },
});

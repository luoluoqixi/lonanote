import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ScrollView, isIos26Plus } from "rn-ui-kit";

import { os } from "@/api/common";

import type { SettingsPanelProps } from "../sections";
import { type SettingsRouteKey, getSettingsRouteDefinition } from "./settings_route_registry";
import { SettingsScreenLayout } from "./settings_screen_layout";
import { useSettingsSectionSyncState } from "./use_settings_sync_state";

type SettingsSectionScreenProps = {
  sectionKey: SettingsRouteKey;
  sectionProps?: SettingsPanelProps;
};

function SettingsSectionScreen({ sectionKey, sectionProps }: SettingsSectionScreenProps) {
  const definition = getSettingsRouteDefinition(sectionKey);
  const syncState = useSettingsSectionSyncState(sectionKey);
  const SectionComponent = definition.Component;
  const usesNativeSettingsList = os() === "ios";
  const usesPreIos26ScrollEdgeHeader = usesNativeSettingsList && !isIos26Plus();

  return (
    <SettingsScreenLayout
      error={syncState.error}
      isLoading={syncState.isLoading}
      title={definition.label}
    >
      <View style={styles.panelHost}>
        {usesNativeSettingsList ? (
          <View style={styles.panelScrollView}>
            <SectionComponent
              {...sectionProps}
              tracksNavigationBarScrollEdge={usesPreIos26ScrollEdgeHeader}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.panelScrollContent}
            showsVerticalScrollIndicator
            style={styles.panelScrollView}
          >
            <SectionComponent {...sectionProps} />
          </ScrollView>
        )}
      </View>
    </SettingsScreenLayout>
  );
}

export function GlobalSettingsScreen() {
  const router = useRouter();

  return (
    <SettingsSectionScreen
      sectionKey="global"
      sectionProps={{
        onLayoutModeChange: (layoutMode) => {
          if (layoutMode === "wide") {
            router.replace("/");
          }
        },
      }}
    />
  );
}

export function AppearanceSettingsScreen() {
  return <SettingsSectionScreen sectionKey="appearance" />;
}

const styles = StyleSheet.create({
  panelHost: { flex: 1, minHeight: 0 },
  panelScrollContent: {},
  panelScrollView: { flex: 1, minHeight: 0 },
});

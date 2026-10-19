import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Dialog, NativeSheetStack, Tabs } from "rn-ui-kit";
import { RnUiKitDebugPanel } from "rn-ui-kit/debug";

import { isWeb } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { GmSettingsPage } from "../pages/gm_settings_page";
import { type SettingsPageId, getSettingsPage, settingsPages } from "../settings_config";

type DesktopSettingsDialogProps = {
  initialPageId?: SettingsPageId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger?: ReactNode;
};

export function DesktopSettingsDialog({
  initialPageId = "global",
  isOpen,
  onOpenChange,
  trigger,
}: DesktopSettingsDialogProps) {
  const { width, height } = useWindowDimensions();
  const dialogWidth = Math.max(280, Math.min(960, width - 48));
  const dialogHeight = Math.max(240, Math.min(720, height - 64));
  const { preferences } = useUiPreferences();
  const [isDebugSheetOpen, setIsDebugSheetOpen] = useState(false);
  const [isGmSheetOpen, setIsGmSheetOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<SettingsPageId>(initialPageId);
  const desktopPages = useMemo(
    () =>
      settingsPages.filter(
        (page) =>
          page.desktopTab &&
          (!page.requiresDeveloperOptions ||
            preferences.developer.optionsEnabled ||
            page.id === selectedPageId),
      ),
    [preferences.developer.optionsEnabled, selectedPageId],
  );

  useEffect(() => {
    if (getSettingsPage(initialPageId)) {
      setSelectedPageId(initialPageId);
    }
  }, [initialPageId]);

  const selectedPageConfig = getSettingsPage(selectedPageId);
  const selectedPage =
    selectedPageConfig &&
    (!selectedPageConfig.requiresDeveloperOptions ||
      preferences.developer.optionsEnabled ||
      selectedPageConfig.id === "developer")
      ? selectedPageConfig
      : desktopPages[0];
  const selectedTabId = selectedPage?.desktopTab
    ? selectedPage.id
    : (selectedPage?.parentId ?? desktopPages[0]?.id ?? "global");
  const SelectedPageComponent = selectedPage?.Component;

  return (
    <>
      <Dialog
        onOpenChange={onOpenChange}
        open={isOpen}
        title="设置"
        trigger={trigger}
        contentProps={{
          style: {
            height: dialogHeight,
            width: dialogWidth,
            maxWidth: dialogWidth,
            maxHeight: dialogHeight,
          },
        }}
        content={
          <View style={styles.root}>
            <Tabs
              aria-label="设置页面导航"
              onValueChange={(nextValue) => setSelectedPageId(nextValue as SettingsPageId)}
              orientation="vertical"
              style={styles.tabs}
              value={selectedTabId}
            >
              <ScrollView
                style={styles.navigation}
                contentContainerStyle={styles.navigationContent}
              >
                <Tabs.List aria-label="设置页面导航" style={styles.list}>
                  {desktopPages.map((page) => (
                    <Tabs.Trigger key={page.id} value={page.id} style={styles.navigationItem}>
                      {page.title}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </ScrollView>
              <View style={styles.content}>
                {SelectedPageComponent ? (
                  <SelectedPageComponent
                    onOpenDebugSheet={() => setIsDebugSheetOpen(true)}
                    onOpenGmSheet={() => setIsGmSheetOpen(true)}
                  />
                ) : null}
              </View>
            </Tabs>
          </View>
        }
      />

      {isWeb() ? (
        <>
          <RnUiKitDebugPanel
            panelSheetProps={{
              snapPoints: ["60%"],
            }}
            onOpenChange={setIsDebugSheetOpen}
            open={isDebugSheetOpen}
            sheetMode
          />
          <NativeSheetStack
            name="lonanote-gm-settings-sheet"
            onOpenChange={setIsGmSheetOpen}
            open={isGmSheetOpen}
            overlayPortalHostName="lonanote-gm-settings-sheet-overlay"
            sheetProps={{ snapPoints: ["60%"] }}
            screenOptions={{ headerShadowVisible: false }}
          >
            <NativeSheetStack.Screen name="index" options={{ title: "GM 调试" }}>
              {() => <GmSettingsPage />}
            </NativeSheetStack.Screen>
          </NativeSheetStack>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    alignSelf: "stretch",
    alignItems: "stretch",
    justifyContent: "flex-start",
    height: "auto",
    flexDirection: "column",
    gap: 4,
    width: "100%",
  },
  navigation: {
    width: 160,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
  },
  navigationContent: {
    paddingBottom: 4,
  },
  navigationItem: {
    height: 36,
    flexShrink: 0,
    justifyContent: "flex-start",
    paddingHorizontal: 12,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
});

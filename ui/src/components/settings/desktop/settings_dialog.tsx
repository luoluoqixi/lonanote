import { type ReactNode, Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, NativeSheetStack, Text, useUiTheme } from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";
import { useCurrentWorkspaceId } from "@/hooks/workspace/use_workspace_session";

import { type SettingsPageId, getSettingsPage, settingsPages } from "../settings_config";
import {
  type SettingsLocation,
  settingsNavigation,
  settingsTabTarget,
} from "../settings_navigation";

const RnUiKitDebugPanel = lazy(() =>
  import("rn-ui-kit/debug").then((m) => ({ default: m.RnUiKitDebugPanel })),
);

const GmSettingsPage = lazy(() =>
  import("../pages/gm_settings_page").then((m) => ({ default: m.GmSettingsPage })),
);

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
  const theme = useUiTheme();
  const tabGroupId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelId = `${tabGroupId}-panel`;
  const dialogWidth = Math.min(880, width * 0.88);
  const dialogHeight = Math.min(560, height * 0.8);
  const { preferences } = useUiPreferences();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const [isDebugSheetOpen, setIsDebugSheetOpen] = useState(false);
  const [isGmSheetOpen, setIsGmSheetOpen] = useState(false);
  // 首次打开才加载，关闭后保留宿主以完成 Sheet 自身的退出动画。
  const [hasOpenedDebugSheet, setHasOpenedDebugSheet] = useState(false);
  const [hasOpenedGmSheet, setHasOpenedGmSheet] = useState(false);
  const [navigation, setNavigation] = useState<SettingsLocation[]>([
    { id: initialPageId, params: {} },
  ]);
  const location = navigation[navigation.length - 1];
  const selectedPageId = location.id;
  const setSelectedPageId = (id: SettingsPageId) =>
    setNavigation((stack) => settingsNavigation(stack, { type: "reset", id }));
  const navigate = (id: SettingsPageId, params?: Record<string, string>) => {
    if (getSettingsPage(id))
      setNavigation((stack) => settingsNavigation(stack, { type: "push", id, params }));
  };
  const back = () => setNavigation((stack) => settingsNavigation(stack, { type: "back" }));
  const desktopPages = useMemo(
    () =>
      settingsPages.filter(
        (page) =>
          page.desktopTab &&
          (!page.requiresWorkspace || Boolean(currentWorkspaceId)) &&
          (!page.requiresDeveloperOptions ||
            preferences.developer.optionsEnabled ||
            page.id === selectedPageId),
      ),
    [currentWorkspaceId, preferences.developer.optionsEnabled, selectedPageId],
  );

  useEffect(() => {
    if (isOpen && getSettingsPage(initialPageId)) {
      setSelectedPageId(initialPageId);
    }
  }, [initialPageId, isOpen]);

  useEffect(() => {
    if (!currentWorkspaceId && getSettingsPage(selectedPageId)?.requiresWorkspace) {
      setSelectedPageId("global");
    }
  }, [currentWorkspaceId, selectedPageId]);

  const selectedPageConfig = getSettingsPage(selectedPageId);
  const selectedPage =
    selectedPageConfig &&
    (!selectedPageConfig.requiresWorkspace || Boolean(currentWorkspaceId)) &&
    (!selectedPageConfig.requiresDeveloperOptions ||
      preferences.developer.optionsEnabled ||
      selectedPageConfig.id === "developer")
      ? selectedPageConfig
      : desktopPages[0];
  const selectedTabId = selectedPage?.desktopTab
    ? selectedPage.id
    : (selectedPage?.parentId ?? desktopPages[0]?.id ?? "global");
  const SelectedPageComponent = selectedPage?.Component;

  const content = (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <ScrollView
          style={[styles.navigation, { width: width < 720 ? 116 : 144 }]}
          contentContainerStyle={styles.navigationContent}
        >
          <View
            accessibilityRole="tablist"
            accessibilityLabel="设置页面导航"
            aria-orientation="vertical"
            style={styles.list}
          >
            {desktopPages.map((page) => (
              <Button
                key={page.id}
                native={false}
                variant="ghost"
                size="sm"
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedTabId === page.id }}
                tabIndex={selectedTabId === page.id ? 0 : -1}
                herouiWebProps={{
                  id: `${tabGroupId}-${page.id}`,
                  render: (props) => (
                    <button
                      {...props}
                      role="tab"
                      aria-controls={panelId}
                      aria-selected={selectedTabId === page.id}
                      tabIndex={selectedTabId === page.id ? 0 : -1}
                    />
                  ),
                  ref: (element) => {
                    tabRefs.current[page.id] = element;
                  },
                  onKeyDown: (event) => {
                    const next = settingsTabTarget(
                      desktopPages.map((page) => page.id),
                      page.id,
                      event.key,
                    );
                    if (!next) return;
                    event.preventDefault();
                    setSelectedPageId(next);
                    tabRefs.current[next]?.focus();
                  },
                }}
                onPress={() => setSelectedPageId(page.id)}
                style={{
                  ...styles.navigationItem,
                  backgroundColor: selectedTabId === page.id ? theme.accent03 : undefined,
                  borderBottomWidth: selectedTabId === page.id ? 2 : 0,
                  borderBottomColor: theme.accent,
                }}
              >
                <Text style={{ fontSize: 13 }}>{page.title}</Text>
              </Button>
            ))}
          </View>
        </ScrollView>
        <View
          nativeID={panelId}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-${selectedTabId}`}
          style={styles.content}
        >
          {navigation.length > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 }}>
              <Button variant="ghost" size="sm" onPress={back} accessibilityLabel="返回上一级设置">
                返回
              </Button>
              <Text>{selectedPage?.title}</Text>
            </View>
          ) : null}
          {SelectedPageComponent ? (
            <Suspense fallback={null}>
              <SelectedPageComponent
                onNavigate={navigate}
                onBack={back}
                pageParams={location.params}
                onOpenDebugSheet={() => {
                  setHasOpenedDebugSheet(true);
                  setIsDebugSheetOpen(true);
                }}
                onOpenGmSheet={() => {
                  setHasOpenedGmSheet(true);
                  setIsGmSheetOpen(true);
                }}
              />
            </Suspense>
          ) : null}
        </View>
      </View>
      {hasOpenedDebugSheet ? (
        <Suspense fallback={null}>
          <RnUiKitDebugPanel
            panelSheetProps={{ snapPoints: ["60%"] }}
            onOpenChange={setIsDebugSheetOpen}
            open={isDebugSheetOpen}
            sheetMode
          />
        </Suspense>
      ) : null}
      {hasOpenedGmSheet ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}
    </View>
  );

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={isOpen}
      title="设置"
      titleProps={{ style: { fontSize: 16 } }}
      trigger={trigger}
      bodyProps={{
        herouiWebProps: {
          style: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          },
        },
      }}
      contentProps={{
        herouiNativeProps: {
          style: {
            height: dialogHeight,
            width: dialogWidth,
            maxWidth: dialogWidth,
            maxHeight: dialogHeight,
            padding: 16,
            backgroundColor: theme.background,
          },
        },
        herouiWebProps: {
          style: {
            height: dialogHeight,
            width: dialogWidth,
            maxWidth: dialogWidth,
            maxHeight: dialogHeight,
            padding: 16,
            backgroundColor: theme.background,
          },
        },
      }}
      content={content}
    />
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
    width: "100%",
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

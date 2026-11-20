import { type ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, NativeSheetStack, Tabs, Text, cn, useUiTheme } from "rn-ui-kit";

import { dialogWindows } from "@/api/commands/win/dialog_windows";
import { DialogContentReady } from "@/api/common/dialogs/dialog_content_boundary";
import { claimNativeSettingsDialogLaunch } from "@/api/common/dialogs/dialog_launch_guard";
import { isDialogWindowRendererFailure } from "@/api/common/dialogs/dialog_types";
import { isDesktop, isTauri } from "@/api/common/platform";
import { useUiPreferences } from "@/hooks/settings";
import { useCurrentWorkspaceId } from "@/hooks/workspace/use_workspace_session";

import { type SettingsPageId, getSettingsPage, settingsPages } from "../settings_config.desktop";
import { type SettingsLocation, settingsNavigation } from "../settings_navigation";

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
  nativeWindow?: boolean;
  onContentReady?: () => void;
  trigger?: ReactNode;
};

export function DesktopSettingsDialog({
  initialPageId = "global",
  isOpen,
  onOpenChange,
  nativeWindow = false,
  onContentReady,
  trigger,
}: DesktopSettingsDialogProps) {
  const { width, height } = useWindowDimensions();
  const theme = useUiTheme();
  const dialogWidth = nativeWindow ? Math.min(880, width) : Math.min(880, width * 0.88);
  const dialogHeight = nativeWindow ? Math.min(560, height) : Math.min(560, height * 0.8);
  const { preferences } = useUiPreferences();
  const useNativeWindow =
    !nativeWindow && isDesktop() && isTauri() && preferences.window.nativeDialogs;
  const [nativeWindowFailed, setNativeWindowFailed] = useState(false);
  const [nativeWindowPending, setNativeWindowPending] = useState(false);
  const nativeAbort = useRef<AbortController | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const initialPageIdRef = useRef(initialPageId);
  const isOpenRef = useRef(isOpen);
  initialPageIdRef.current = initialPageId;
  isOpenRef.current = isOpen;
  const currentWorkspaceId = useCurrentWorkspaceId();
  const [isDebugSheetOpen, setIsDebugSheetOpen] = useState(false);
  const [isGmSheetOpen, setIsGmSheetOpen] = useState(false);
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

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) nativeAbort.current?.abort();
    if (!claimNativeSettingsDialogLaunch(isOpen, useNativeWindow && !nativeWindowFailed)) {
      if (!isOpen) {
        setNativeWindowFailed(false);
      }
      return;
    }
    const abort = new AbortController();
    nativeAbort.current = abort;
    setNativeWindowPending(true);
    void dialogWindows
      .open(
        {
          requestId: crypto.randomUUID(),
          dialogId: "settings",
          payload: { initialPageId: initialPageIdRef.current },
          title: "设置",
          width: 880,
          height: 560,
        },
        { signal: abort.signal },
      )
      .then((result) => {
        if (abort.signal.aborted) return;
        if (isDialogWindowRendererFailure(result)) {
          if (isOpenRef.current) setNativeWindowFailed(true);
          return;
        }
        if (isOpenRef.current) onOpenChangeRef.current(false);
      })
      .catch((error) => {
        if (abort.signal.aborted) return;
        console.error("[settings] 原生设置窗口创建失败，回退到应用内 Dialog", error);
        if (isOpenRef.current) setNativeWindowFailed(true);
      })
      .finally(() => {
        if (nativeAbort.current === abort) setNativeWindowPending(false);
      });
  }, [isOpen, nativeWindowFailed, useNativeWindow]);

  const content = (
    <View style={styles.root}>
      <Tabs
        aria-label="设置页面导航"
        onValueChange={(nextValue) => setSelectedPageId(nextValue as SettingsPageId)}
        orientation="vertical"
        size="sm"
        style={styles.tabs}
        value={selectedTabId}
      >
        <ScrollView
          style={[styles.navigation, { width: width < 720 ? 116 : 144 }]}
          contentContainerStyle={styles.navigationContent}
        >
          <Tabs.List
            aria-label="设置页面导航"
            style={{ ...styles.list, backgroundColor: theme.background }}
          >
            {desktopPages.map((page) => (
              <Tabs.Trigger
                key={page.id}
                value={page.id}
                className={cn(
                  selectedTabId === page.id && "bg-accent text-accent-foreground",
                  selectedTabId !== page.id && "hover:bg-accent03",
                )}
                style={{
                  ...styles.navigationItem,
                  borderBottomWidth: selectedTabId === page.id ? 2 : 0,
                  borderBottomColor: theme.primary,
                }}
              >
                <Text style={{ fontSize: 13 }}>{page.title}</Text>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </ScrollView>
        <View style={styles.content}>
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
                onOpenDebugSheet={() => setIsDebugSheetOpen(true)}
                onOpenGmSheet={() => setIsGmSheetOpen(true)}
              />
              <DialogContentReady onReady={onContentReady} />
            </Suspense>
          ) : null}
        </View>
      </Tabs>
      {isDebugSheetOpen ? (
        <Suspense fallback={null}>
          <RnUiKitDebugPanel
            panelSheetProps={{ snapPoints: ["60%"] }}
            onOpenChange={setIsDebugSheetOpen}
            open={isDebugSheetOpen}
            sheetMode
          />
        </Suspense>
      ) : null}
      {isGmSheetOpen ? (
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

  if (nativeWindow) {
    return (
      <View
        style={[
          styles.nativeWindow,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        {content}
      </View>
    );
  }
  if ((useNativeWindow && !nativeWindowFailed) || nativeWindowPending) return null;

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={isOpen}
      title="设置"
      titleProps={{ style: { fontSize: 16 } }}
      trigger={trigger}
      contentProps={{
        style: {
          height: dialogHeight,
          width: dialogWidth,
          maxWidth: dialogWidth,
          maxHeight: dialogHeight,
          padding: 16,
          backgroundColor: theme.background,
        },
      }}
      content={content}
    />
  );
}

const styles = StyleSheet.create({
  nativeWindow: { flex: 1, minHeight: 0, minWidth: 0, padding: 16 },
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

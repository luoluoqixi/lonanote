import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb, os } from "@/api/common";
import { Button, NativeSheet, NativeSheetStack, Text } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_toast_layout";
import { trueSheetInnerStackScreenOptions } from "@/components/ui/sheet/native_sheet/true_sheet/stack";
import { useResolvedeColorScheme } from "@/hooks/settings";

import {
  DEBUG_NATIVE_SHEET_NAME,
  closeDebugPanel,
  closeDebugSectionSheet,
  getDebugNestedSectionSheetSnapPoints,
  getDebugPanelOpen,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
  getPresentedDebugSectionSheets,
  markDebugPanelClosed,
  openDebugSection,
  setDebugPanelOpen,
  subscribeDebugPanelState,
  subscribeDebugSectionSheetState,
  switchDebugPanelToFullPage,
  useDebugNestedSectionDetentLevel,
} from "./debug_panel_sheet_state";
import { DebugHomePage } from "./pages/debug_home_page";
import { DebugSectionPage } from "./pages/debug_section_page";
import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "./routes";

type DebugSheetParamList = { index: undefined } & Record<DebugTabKey, undefined>;

function DebugHomeRoute() {
  const navigation = useNavigation<NavigationProp<DebugSheetParamList>>();

  const handleModeChange = useCallback((mode: "fullPage" | "nativeSheet") => {
    if (mode === "fullPage") {
      switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugHomePage
      currentSheetMode="nativeSheet"
      onOpenPanel={(key) => {
        void openDebugSection(key).then((handled) => {
          if (!handled) {
            navigation.navigate(key);
          }
        });
      }}
      onSheetModeChange={handleModeChange}
    />
  );
}

function createDebugSectionRoute(key: DebugTabKey) {
  return function DebugSectionRoute() {
    return <DebugSectionPage layoutHost="nativeSheet" sectionKey={key} />;
  };
}

function DebugNativeSheetStackHost() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();
  const open = useSyncExternalStore(subscribeDebugPanelState, getDebugPanelOpen, getDebugPanelOpen);

  return (
    <NativeSheetStack
      initialRouteName="index"
      name={DEBUG_NATIVE_SHEET_NAME}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          markDebugPanelClosed();
          return;
        }

        setDebugPanelOpen(true);
      }}
      open={open}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={trueSheetInnerStackScreenOptions(
        colorScheme,
        theme.background.val,
        theme.accentColor.val,
        theme.color.val,
      )}
    >
      <NativeSheetStack.Screen
        component={DebugHomeRoute}
        name="index"
        options={{ title: "调试面板" }}
      />
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <NativeSheetStack.Screen
          key={definition.key}
          component={createDebugSectionRoute(definition.key)}
          name={definition.key}
          options={{ title: definition.label }}
        />
      ))}
    </NativeSheetStack>
  );
}

function DebugBottomSheetHost() {
  const theme = useTheme();
  const open = useSyncExternalStore(subscribeDebugPanelState, getDebugPanelOpen, getDebugPanelOpen);
  const [sectionKey, setSectionKey] = useState<DebugTabKey | null>(null);
  const sectionDefinition =
    sectionKey == null
      ? null
      : DEBUG_PANEL_ROUTE_DEFINITIONS.find((definition) => definition.key === sectionKey);
  const title = sectionDefinition?.label ?? "调试面板";

  useEffect(() => {
    if (!open) {
      setSectionKey(null);
    }
  }, [open]);

  return (
    <NativeSheet
      handle
      name={DEBUG_NATIVE_SHEET_NAME}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          setSectionKey(null);
          closeDebugPanel();
          return;
        }

        setDebugPanelOpen(true);
      }}
      open={open}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      snapPoints={[92]}
      snapPointsMode="percent"
    >
      <View style={[styles.androidSheetRoot, { backgroundColor: theme.background.val }]}>
        <View style={[styles.androidSheetHeader, { borderBottomColor: theme.borderColor.val }]}>
          <View style={styles.androidSheetHeaderAction}>
            {sectionKey != null ? (
              <Button chromeless onPress={() => setSectionKey(null)}>
                返回
              </Button>
            ) : null}
          </View>
          <Text fontSize="$5" fontWeight="600" numberOfLines={1} style={styles.androidSheetTitle}>
            {title}
          </Text>
          <View style={styles.androidSheetHeaderAction}>
            <Button chromeless onPress={() => closeDebugPanel()}>
              关闭
            </Button>
          </View>
        </View>
        <View style={styles.androidSheetContent}>
          {sectionDefinition != null && sectionKey != null ? (
            <DebugSectionPage
              contentTitle={sectionDefinition.label}
              layoutHost="default"
              sectionKey={sectionKey}
            />
          ) : (
            <DebugHomePage
              currentSheetMode="nativeSheet"
              onOpenPanel={(key) => setSectionKey(key)}
              onSheetModeChange={(mode) => {
                if (mode === "fullPage") {
                  switchDebugPanelToFullPage();
                }
              }}
            />
          )}
        </View>
      </View>
    </NativeSheet>
  );
}

function DebugSectionSheet({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = DEBUG_PANEL_ROUTE_DEFINITIONS.find(
    (routeDefinition) => routeDefinition.key === sectionKey,
  );
  const theme = useTheme();
  const presentedSheets = useSyncExternalStore(
    subscribeDebugSectionSheetState,
    getPresentedDebugSectionSheets,
    getPresentedDebugSectionSheets,
  );
  const detentLevel = useDebugNestedSectionDetentLevel();

  if (!definition) {
    return null;
  }

  const open = presentedSheets.has(sectionKey);

  return (
    <NativeSheet
      handle
      name={getDebugSectionSheetName(sectionKey)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void closeDebugSectionSheet(sectionKey);
        }
      }}
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      open={open}
      position={detentLevel}
      snapPoints={getDebugNestedSectionSheetSnapPoints()}
      snapPointsMode="percent"
    >
      <View style={{ backgroundColor: theme.background.val, flex: 1 }}>
        <DebugSectionPage
          contentTitle={definition.label}
          layoutHost={Platform.OS === "ios" ? "nativeSheet" : "default"}
          sectionKey={sectionKey}
        />
      </View>
    </NativeSheet>
  );
}

function DebugSectionSheets() {
  return (
    <>
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <DebugSectionSheet key={definition.key} sectionKey={definition.key} />
      ))}
    </>
  );
}

export function DebugNativeSheetHost() {
  if (isWeb() || isDesktop()) {
    return null;
  }

  return (
    <>
      <DebugSectionSheets />
      {os() === "ios" ? <DebugNativeSheetStackHost /> : <DebugBottomSheetHost />}
    </>
  );
}

const styles = StyleSheet.create({
  androidSheetContent: {
    flex: 1,
    minHeight: 0,
  },
  androidSheetHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  androidSheetHeaderAction: {
    alignItems: "center",
    minWidth: 64,
  },
  androidSheetRoot: {
    flex: 1,
    minHeight: 0,
  },
  androidSheetTitle: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
  },
});

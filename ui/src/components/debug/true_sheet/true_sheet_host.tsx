// True Sheet 调试宿主（简化版）：iOS+Android 合并在一个文件
import { type NavigationProp, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Dimensions, Platform, View } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb } from "@/api/common";
import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";
import { TrueSheetScrollContent } from "@/components/ui/true_sheet/scroll_content";
import {
  TrueSheetInnerStack,
  TrueSheetStackHost,
  trueSheetInnerStackScreenOptions,
} from "@/components/ui/true_sheet/stack";
import { TrueSheetToolbarHeader } from "@/components/ui/true_sheet/toolbar_header";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";
import { useResolvedeColorScheme } from "@/hooks/settings";

import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "../routes";
import { DebugHomeScreen, DebugSectionScreen } from "../screens";
import {
  DEBUG_NESTED_SECTION_SHEET_DETENTS,
  DEBUG_TRUE_SHEET_NAME,
  cleanupDebugSectionSheet,
  closeDebugPanel,
  closeDebugSectionSheet,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
  markDebugPanelClosed,
  openDebugSection,
  switchDebugPanelToFullPage,
} from "./api";

type ParamList = { index: undefined } & Record<DebugTabKey, undefined>;

function DebugOwnedScrollContent({ children }: { children: React.ReactNode }) {
  return children;
}

function createDebugTrueSheetContentWrapper(presentation: "scroll" | "static") {
  return presentation === "scroll" ? DebugOwnedScrollContent : TrueSheetScrollContent;
}

// ─── iOS ────────────────────────────────────────────

function IosHomeRoute() {
  const navigation = useNavigation<NavigationProp<ParamList>>();

  const handleModeChange = useCallback((mode: "fullPage" | "trueSheet") => {
    if (mode === "fullPage") {
      void switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugOwnedScrollContent>
      <DebugHomeScreen
        currentSheetMode="trueSheet"
        onOpenPanel={(key) => {
          void openDebugSection(key).then((handled) => {
            if (!handled) navigation.navigate(key);
          });
        }}
        onSheetModeChange={handleModeChange}
      />
    </DebugOwnedScrollContent>
  );
}

function createIosSectionRoute(key: DebugTabKey) {
  const definition = DEBUG_PANEL_ROUTE_DEFINITIONS.find((item) => item.key === key);
  const RouteContent = createDebugTrueSheetContentWrapper(definition?.presentation ?? "scroll");

  return function SectionRoute() {
    return (
      <RouteContent>
        <DebugSectionScreen layoutHost="trueSheet" sectionKey={key} />
      </RouteContent>
    );
  };
}

function IosTrueSheetHost() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  return (
    <TrueSheetStackHost
      initialRouteName="index"
      name={DEBUG_TRUE_SHEET_NAME}
      onDidDismiss={markDebugPanelClosed}
      onRequestClose={() => void closeDebugPanel()}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={trueSheetInnerStackScreenOptions(
        colorScheme,
        theme.background.val,
        theme.accentColor.val,
        theme.color.val,
      )}
    >
      <TrueSheetInnerStack.Screen
        component={IosHomeRoute}
        name="index"
        options={{ title: "调试面板" }}
      />
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((def) => (
        <TrueSheetInnerStack.Screen
          key={def.key}
          component={createIosSectionRoute(def.key)}
          name={def.key}
          options={{ title: def.label }}
        />
      ))}
    </TrueSheetStackHost>
  );
}

// ─── Android ──────────────────────────────────────

function AndroidHomeRoute({ onNavigate }: { onNavigate: (key: DebugTabKey) => void }) {
  const handleModeChange = useCallback((mode: "fullPage" | "trueSheet") => {
    if (mode === "fullPage") {
      void switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugOwnedScrollContent>
      <DebugHomeScreen
        currentSheetMode="trueSheet"
        onOpenPanel={(key) => {
          void openDebugSection(key).then((handled) => {
            if (!handled) onNavigate(key);
          });
        }}
        onSheetModeChange={handleModeChange}
      />
    </DebugOwnedScrollContent>
  );
}

function AndroidTrueSheetHost() {
  const [screen, setScreen] = useState<"home" | DebugTabKey>("home");
  const isHome = screen === "home";
  const sectionDef = isHome
    ? undefined
    : DEBUG_PANEL_ROUTE_DEFINITIONS.find((d) => d.key === screen);
  const RouteContent = isHome
    ? DebugOwnedScrollContent
    : createDebugTrueSheetContentWrapper(sectionDef?.presentation ?? "scroll");

  return (
    <TrueSheetPanel
      canGoBack={!isHome}
      chrome="toolbar"
      name={DEBUG_TRUE_SHEET_NAME}
      onBack={() => setScreen("home")}
      onDidDismiss={markDebugPanelClosed}
      onRequestClose={() => void closeDebugPanel()}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      title={isHome ? "调试面板" : (sectionDef?.label ?? "调试")}
    >
      <RouteContent>
        {isHome ? (
          <AndroidHomeRoute onNavigate={(key) => setScreen(key)} />
        ) : (
          <DebugSectionScreen layoutHost="trueSheet" sectionKey={screen} />
        )}
      </RouteContent>
    </TrueSheetPanel>
  );
}

// ─── 嵌套分区 Sheet ──────────────────────────────

function DebugSectionSheet({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = DEBUG_PANEL_ROUTE_DEFINITIONS.find((d) => d.key === sectionKey);
  if (!definition) return null;

  const screenWidth = Dimensions.get("window").width;
  const grabberHitboxWidth = screenWidth - (Platform.OS === "ios" ? 40 : 32);
  const isIos = Platform.OS === "ios";
  const RouteContent = createDebugTrueSheetContentWrapper(definition.presentation);

  return (
    <TrueSheetPanel
      chrome={isIos ? "plain" : "toolbar"}
      header={
        isIos ? (
          <View
            pointerEvents="none"
            style={{ alignItems: "center", height: 20, justifyContent: "center" }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: "rgba(128, 128, 128, 0.35)",
                borderRadius: isIos ? 2.5 : 2,
                height: isIos ? 5 : 4,
                width: isIos ? 36 : 32,
              }}
            />
          </View>
        ) : undefined
      }
      name={getDebugSectionSheetName(sectionKey)}
      onDidDismiss={() => cleanupDebugSectionSheet(sectionKey)}
      onRequestClose={() => void closeDebugSectionSheet(sectionKey)}
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      sheetProps={{
        detents: [...DEBUG_NESTED_SECTION_SHEET_DETENTS],
        ...(isIos
          ? {
              grabberOptions: {
                width: grabberHitboxWidth,
                height: 24,
                topMargin: 10,
                color: "transparent",
                adaptive: false,
              },
              headerStyle: {
                height: 44,
                left: 0,
                position: "absolute" as const,
                right: 0,
                top: 0,
                zIndex: 1,
              },
            }
          : undefined),
      }}
      title={!isIos ? definition.label : undefined}
    >
      <RouteContent>
        {isIos ? <TrueSheetToolbarHeader title={definition.label} transparent /> : null}
        <DebugSectionScreen layoutHost="trueSheet" sectionKey={sectionKey} trueSheetCompact />
      </RouteContent>
    </TrueSheetPanel>
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

// ─── 统一宿主 ──────────────────────────────────────

export function DebugTrueSheetHost() {
  if (isWeb() || isDesktop()) return null;
  return (
    <>
      <DebugSectionSheets />
      {Platform.OS === "android" ? <AndroidTrueSheetHost /> : <IosTrueSheetHost />}
    </>
  );
}

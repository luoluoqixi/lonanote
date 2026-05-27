import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  DeviceEventEmitter,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { Dialog, Tabs } from "@/components/ui";
import { WIDE_LAYOUT_MINIMUM_WIDTH } from "@/config";

import {
  DEBUG_HOME_HREF,
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  DEBUG_PANEL_TOGGLE_EVENT,
  type DebugTabKey,
  isDebugRoutePath,
} from "./debug_panel_routes";

function emitDebugPanelToggle() {
  DeviceEventEmitter.emit(DEBUG_PANEL_TOGGLE_EVENT);
}

function useDebugPanelShortcut(onToggle: () => void) {
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== "web") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F6") {
        return;
      }

      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onToggle]);
}

function useDebugPanelNativeToggle(onToggle: () => void) {
  useEffect(() => {
    if (!__DEV__ || Platform.OS === "web") {
      return;
    }

    const subscription = DeviceEventEmitter.addListener(DEBUG_PANEL_TOGGLE_EVENT, onToggle);
    return () => {
      subscription.remove();
    };
  }, [onToggle]);
}

export function DebugPanelGestureLayer({ children }: { children: React.ReactNode }) {
  const gesture = useMemo(() => {
    if (!__DEV__ || Platform.OS === "web") {
      return null;
    }

    return Gesture.Pan()
      .minPointers(3)
      .onEnd((event) => {
        "worklet";

        if (event.translationY < 72 || Math.abs(event.translationX) > 48) {
          return;
        }

        runOnJS(emitDebugPanelToggle)();
      });
  }, []);

  if (!gesture) {
    return children;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}

function DebugTabScrollPane({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.scrollPane}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        style={styles.scrollView}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function DebugTabStaticPane({ children }: { children: React.ReactNode }) {
  return <View style={styles.staticPane}>{children}</View>;
}

export function DebugPanelHost() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DebugTabKey>("workspace");
  const usesRoutePresentation = width < WIDE_LAYOUT_MINIMUM_WIDTH;

  const toggleDebugPanel = () => {
    if (usesRoutePresentation) {
      if (isDebugRoutePath(pathname)) {
        router.back();
        return;
      }

      router.push(DEBUG_HOME_HREF);
      return;
    }

    setIsOpen((current) => !current);
  };

  useDebugPanelShortcut(toggleDebugPanel);

  useDebugPanelNativeToggle(toggleDebugPanel);

  useEffect(() => {
    if (usesRoutePresentation && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, usesRoutePresentation]);

  if (!__DEV__) {
    return null;
  }

  if (usesRoutePresentation) {
    return null;
  }

  return (
    <Dialog
      width="98%"
      height="88%"
      minWidth={0}
      minHeight={0}
      onOpenChange={setIsOpen}
      open={isOpen}
      title="调试面板"
    >
      <Tabs
        aria-label="调试面板导航"
        contentProps={{ style: styles.tabContent }}
        items={DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => {
          const SectionComponent = definition.Component;

          return {
            content:
              definition.presentation === "static" ? (
                <DebugTabStaticPane>
                  <SectionComponent />
                </DebugTabStaticPane>
              ) : (
                <DebugTabScrollPane>
                  <SectionComponent />
                </DebugTabScrollPane>
              ),
            label: definition.label,
            value: definition.key,
          };
        })}
        listProps={{ style: styles.tabList }}
        onValueChange={(nextValue) => setSelectedTab(nextValue as DebugTabKey)}
        orientation="vertical"
        style={styles.tabs}
        value={selectedTab}
      />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 12,
  },
  scrollPane: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  staticPane: {
    flex: 1,
    minHeight: 0,
    overflowY: "scroll",
    paddingBottom: 12,
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  tabList: {
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 4,
    width: 140,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
});

import { type Href, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, useTheme } from "rn-ui-kit";

import { isDesktop } from "@/api/common";
import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";
import { type SettingsPageId, getSettingsPage } from "@/components/settings/settings_config";
import { TitleBar } from "@/components/window/titlebar";
import { getAppHomeTitle } from "@/config";
import { useAppBackgroundColors } from "@/hooks/settings";

const DEBUG_HREF = "/debug" as Href;

function getSettingsPageId(pathname: string): SettingsPageId {
  const pageId = pathname.split("/")[2];
  const page = getSettingsPage(pageId);
  return page?.desktopTab ? page.id : "global";
}

export function DesktopAppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const desktop = isDesktop();
  const theme = useTheme();
  const appBackgroundColors = useAppBackgroundColors();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setIsSettingsOpen(pathname.startsWith("/settings"));
  }, [pathname]);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: appBackgroundColors.screen }]}
    >
      {desktop ? <TitleBar /> : null}
      <View style={styles.content}>
        <View
          style={[
            styles.activityBar,
            {
              borderColor: theme.borderColor.val,
            },
          ]}
        >
          <ShellButton
            label="调试"
            symbol="⚒"
            onPress={() => {
              router.push(DEBUG_HREF);
            }}
          />
          <View style={styles.spacer} />
          <ShellButton
            label="设置"
            symbol="⚙"
            onPress={() => {
              setIsSettingsOpen(true);
            }}
          />
        </View>
        <View style={styles.emptyState}>
          <Text fontSize="$8" fontWeight="600" selectable>
            {getAppHomeTitle()}
          </Text>
        </View>
      </View>
      <DesktopSettingsDialog
        initialPageId={getSettingsPageId(pathname)}
        isOpen={isSettingsOpen}
        onOpenChange={(nextIsOpen) => {
          setIsSettingsOpen(nextIsOpen);

          if (!nextIsOpen && pathname.startsWith("/settings")) {
            router.replace("/");
          }
        }}
      />
    </SafeAreaView>
  );
}

type ShellButtonProps = {
  label: string;
  onPress: () => void;
  symbol: string;
};

function ShellButton({ label, onPress, symbol }: ShellButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shellButton,
        pressed ? { backgroundColor: theme.color3.val } : null,
      ]}
    >
      <Text color="$color10" fontSize="$8">
        {symbol}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activityBar: {
    borderRightWidth: 1,
    paddingVertical: 8,
    width: 48,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
  },
  shellButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 48,
  },
  spacer: {
    flex: 1,
  },
});

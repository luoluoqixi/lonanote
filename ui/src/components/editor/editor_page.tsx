import type { NativeStackHeaderBackProps } from "@react-navigation/native-stack";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ExternalLink } from "lucide-react-native";
import { VariableBlurView } from "native-ios-common";
import { type ComponentProps, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { getFileName, isIos, isIos16Plus, isIos26Plus, os } from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { EditorWebView } from "./editor_webview";

function EditorHeaderBackground() {
  if (!isIos() || isIos26Plus()) return null;

  return <VariableBlurView blurRadius={24} style={styles.headerBlur} transitionHeight={100} />;
}

function EditorBackButton({ isAndroid, onPress }: { isAndroid: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const theme = useUiTheme();

  return (
    <Button
      aria-label="返回"
      buttonSize={{ height: 40, width: 40 }}
      circular
      hitSlop={6}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      size="sm"
      style={[
        styles.headerBackButton,
        isAndroid ? styles.headerBackButtonAndroid : null,
        {
          backgroundColor: pressed ? theme.accent : theme.card,
          borderColor: pressed ? theme.primary : theme.border,
        },
      ]}
      variant="icon"
    >
      <ChevronLeft
        color={theme.primary}
        opacity={pressed ? 0.6 : 1}
        size={24}
        strokeWidth={2.5}
        style={styles.headerBackIcon}
      />
    </Button>
  );
}

export function EditorPage() {
  const router = useRouter();
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof ExternalLink>["color"];
  const isAndroid = os() === "android";
  const usesCustomBackButton = isIos16Plus() || isAndroid;
  const renderCustomBackButton = ({ canGoBack }: NativeStackHeaderBackProps) =>
    canGoBack ? <EditorBackButton isAndroid={isAndroid} onPress={() => router.back()} /> : null;
  const menuItems = useMemo<DropdownItemData[]>(
    () => [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.up.forward.app" } },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: openInOtherApp,
        value: "open-in-other-app",
      },
    ],
    [accentColor, isOpening, openInOtherApp],
  );

  if (!filePath) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackground: EditorHeaderBackground,
          headerBlurEffect: "none",
          ...(usesCustomBackButton
            ? {
                headerBackButtonDisplayMode: "minimal" as const,
                headerBackVisible: false,
                headerLeft: renderCustomBackButton,
              }
            : {}),
          headerCancelledTransitionGeometryFixEnabled: false,
          ...getMenuHeaderRightMenuProps({ menuItems, labelColor: theme.primary }),
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTransparent: true,
          title: getFileName(filePath),
        }}
      />
      <View style={styles.container}>
        <EditorWebView />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlur: {
    flex: 1,
  },
  headerBackButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    marginLeft: 6,
    transform: [{ translateY: -2 }],
  },
  headerBackButtonAndroid: {
    marginRight: 8,
  },
  headerBackIcon: {
    transform: [{ translateX: -0.5 }],
  },
});

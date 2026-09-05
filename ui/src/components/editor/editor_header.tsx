import type {
  NativeStackHeaderBackProps,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Ellipsis } from "lucide-react-native";
import { VariableBlurView } from "native-ios-common";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Dropdown,
  type DropdownItemData,
  GlassEffect,
  isLiquidGlassAvailable,
  useUiTheme,
} from "rn-ui-kit";

import { isIos, isIos16Plus, isIos26Plus, os } from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";

const HEADER_SURFACE_OPACITY = 0.8;

function withBackgroundOpacity(color: string, opacity: number): string {
  const value = color.trim();
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];

  if (hex != null) {
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character + character)
            .join("")
        : hex;
    const channels = [0, 2, 4].map((index) =>
      Number.parseInt(expanded.slice(index, index + 2), 16),
    );
    return `rgba(${channels.join(", ")}, ${opacity})`;
  }

  const rgb = value.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*[\d.]+)?\s*\)$/i,
  );
  return rgb == null ? value : `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${opacity})`;
}

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
        styles.headerSurface,
        styles.headerBackButton,
        isAndroid ? styles.headerBackButtonAndroid : null,
        {
          backgroundColor: withBackgroundOpacity(
            pressed ? theme.accent : theme.muted,
            HEADER_SURFACE_OPACITY,
          ),
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

function EditorHeaderTitle({ children }: { children: string }) {
  const theme = useUiTheme();
  const isIos15 = isIos() && !isIos16Plus();
  const usesLiquidGlass = isIos26Plus() && isLiquidGlassAvailable();
  const titleText = (
    <Text
      numberOfLines={1}
      style={[
        styles.headerTitleText,
        isIos15 ? styles.headerTitleTextIos15 : null,
        { color: theme.primary },
      ]}
    >
      {children}
    </Text>
  );

  if (usesLiquidGlass) {
    return (
      <GlassEffect glassEffectStyle="regular" style={[styles.headerSurface, styles.headerTitle]}>
        {titleText}
      </GlassEffect>
    );
  }

  return (
    <View
      style={[
        styles.headerSurface,
        styles.headerTitle,
        isIos15 ? styles.headerTitleIos15 : null,
        {
          backgroundColor: withBackgroundOpacity(theme.muted, HEADER_SURFACE_OPACITY),
        },
      ]}
    >
      {titleText}
    </View>
  );
}

function EditorMenuButton({
  isAndroid,
  menuItems,
}: {
  isAndroid: boolean;
  menuItems: DropdownItemData[];
}) {
  const theme = useUiTheme();

  return (
    <Dropdown
      items={menuItems}
      itemNativeHaptics
      nativeHaptics
      nativeTrigger
      trigger={({ open }) => (
        <Button
          aria-label="更多操作"
          buttonSize={{ height: 40, width: 40 }}
          circular
          hitSlop={6}
          size="sm"
          style={[
            styles.headerSurface,
            styles.headerMenuButton,
            isAndroid ? styles.headerMenuButtonAndroid : null,
            {
              backgroundColor: withBackgroundOpacity(
                open ? theme.accent : theme.muted,
                HEADER_SURFACE_OPACITY,
              ),
            },
          ]}
          variant="icon"
        >
          <Ellipsis color={theme.primary} opacity={open ? 0.6 : 1} size={24} strokeWidth={2.5} />
        </Button>
      )}
    />
  );
}

export function EditorHeader({
  menuItems,
  title,
}: {
  menuItems: DropdownItemData[];
  title: string;
}) {
  const router = useRouter();
  const theme = useUiTheme();
  const isAndroid = os() === "android";
  const usesCustomHeaderControls = (isIos16Plus() && !isIos26Plus()) || isAndroid;
  const usesCustomHeaderTitle = isIos() || isAndroid;
  const renderCustomBackButton = ({ canGoBack }: NativeStackHeaderBackProps) =>
    canGoBack ? <EditorBackButton isAndroid={isAndroid} onPress={() => router.back()} /> : null;
  const headerControlsOptions: NativeStackNavigationOptions = usesCustomHeaderControls
    ? {
        headerBackButtonDisplayMode: "minimal",
        headerBackVisible: false,
        headerLeft: renderCustomBackButton,
        headerRight: () => <EditorMenuButton isAndroid={isAndroid} menuItems={menuItems} />,
      }
    : getMenuHeaderRightMenuProps({ menuItems, labelColor: theme.primary });
  const headerTitleOptions: NativeStackNavigationOptions = usesCustomHeaderTitle
    ? {
        headerTitle: ({ children }) => <EditorHeaderTitle>{children}</EditorHeaderTitle>,
        ...(isAndroid ? { headerTitleAlign: "center" as const } : {}),
      }
    : {};

  return (
    <Stack.Screen
      options={{
        headerBackground: EditorHeaderBackground,
        headerBlurEffect: "none",
        headerCancelledTransitionGeometryFixEnabled: false,
        ...headerControlsOptions,
        ...headerTitleOptions,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "transparent",
        },
        headerTransparent: true,
        title,
      }}
    />
  );
}

const styles = StyleSheet.create({
  headerBlur: {
    flex: 1,
  },
  headerSurface: {
    borderCurve: "continuous",
    borderRadius: 20,
    transform: [{ translateY: -2 }],
  },
  headerBackButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  headerBackButtonAndroid: {
    marginRight: 8,
  },
  headerBackIcon: {
    transform: [{ translateX: -0.5 }],
  },
  headerMenuButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginRight: 6,
    width: 40,
  },
  headerMenuButtonAndroid: {
    marginLeft: 8,
  },
  headerTitle: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    maxWidth: "100%",
    paddingHorizontal: 16,
  },
  headerTitleIos15: {
    borderRadius: 18,
    height: 36,
    paddingHorizontal: 14,
  },
  headerTitleText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitleTextIos15: {
    fontSize: 14,
  },
});

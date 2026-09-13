import type {
  NativeStackHeaderBackProps,
  NativeStackHeaderItemMenuAction,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Ellipsis, Eye, Pencil } from "lucide-react-native";
import { VariableBlurView } from "native-ios-common";
import { useState } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  Button,
  Dropdown,
  type DropdownItemData,
  GlassEffect,
  isLiquidGlassAvailable,
  triggerNativeHaptics,
  useUiTheme,
} from "rn-ui-kit";

import { isIos, isIos16Plus, isIos26Plus, os } from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";

const HEADER_SURFACE_OPACITY = 0.8;
type HeaderSurfaceShadowLevel = false | 0 | 1 | 2 | 3;

// 0 或 false 关闭阴影；1–3 依次增强阴影。
const HEADER_SURFACE_SHADOW_LEVEL: HeaderSurfaceShadowLevel = 1;
const HEADER_SURFACE_SHADOWS = {
  1: "0 1px 3px rgba(0, 0, 0, 0.10)",
  2: "0 2px 7px rgba(0, 0, 0, 0.14)",
  3: "0 4px 12px rgba(0, 0, 0, 0.18)",
} satisfies Record<Exclude<HeaderSurfaceShadowLevel, false | 0>, ViewStyle["boxShadow"]>;

function getHeaderSurfaceShadowStyle(level: HeaderSurfaceShadowLevel): ViewStyle | undefined {
  if (!level || isIos26Plus()) return undefined;

  return { boxShadow: HEADER_SURFACE_SHADOWS[level] };
}

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
        getHeaderSurfaceShadowStyle(HEADER_SURFACE_SHADOW_LEVEL),
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
      <GlassEffect
        isInteractive
        glassEffectStyle="regular"
        style={[styles.headerSurface, styles.headerTitle]}
      >
        {titleText}
      </GlassEffect>
    );
  }

  return (
    <View
      style={[
        styles.headerSurface,
        getHeaderSurfaceShadowStyle(HEADER_SURFACE_SHADOW_LEVEL),
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
      nativeTrigger={false}
      trigger={({ open }) => (
        <Button
          aria-label="更多操作"
          buttonSize={{ height: 40, width: 40 }}
          circular
          hitSlop={6}
          size="sm"
          style={[
            styles.headerSurface,
            getHeaderSurfaceShadowStyle(HEADER_SURFACE_SHADOW_LEVEL),
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

function EditorPreviewButton({
  isAndroid,
  onPress,
  previewMode,
}: {
  isAndroid: boolean;
  onPress: () => void;
  previewMode: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const theme = useUiTheme();
  const Icon = previewMode ? Pencil : Eye;
  const label = previewMode ? "切换到编辑模式" : "切换到预览模式";

  return (
    <Button
      aria-label={label}
      buttonSize={{ height: 40, width: 40 }}
      circular
      hitSlop={6}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      size="sm"
      style={[
        styles.headerSurface,
        getHeaderSurfaceShadowStyle(HEADER_SURFACE_SHADOW_LEVEL),
        styles.headerPreviewButton,
        isAndroid ? styles.headerPreviewButtonAndroid : null,
        {
          backgroundColor: withBackgroundOpacity(
            pressed ? theme.accent : theme.muted,
            HEADER_SURFACE_OPACITY,
          ),
        },
      ]}
      variant="icon"
    >
      <Icon color={theme.primary} opacity={pressed ? 0.6 : 1} size={22} strokeWidth={2.25} />
    </Button>
  );
}

function toIosHeaderMenuItems(menuItems: DropdownItemData[]) {
  const groups: NativeStackHeaderItemMenuAction[][] = [[]];

  for (const item of menuItems) {
    if (item.separator) {
      if (groups.at(-1)?.length) groups.push([]);
      continue;
    }
    if (typeof item.label !== "string") continue;
    const onPress = item.onPress ?? item.onSelect;
    if (!onPress) continue;

    groups.at(-1)?.push({
      disabled: item.disabled,
      icon: item.iconProps?.ios
        ? { type: "sfSymbol" as const, name: item.iconProps.ios.name }
        : undefined,
      label: item.label,
      onPress,
      state: item.selected ? "on" : undefined,
      type: "action",
    });
  }

  const nonEmptyGroups = groups.filter((group) => group.length > 0);
  if (nonEmptyGroups.length <= 1) return nonEmptyGroups[0] ?? [];

  // inline UIMenu 会作为独立 section 呈现，从而保留 Dropdown 的分割线语义。
  return nonEmptyGroups.map((items) => ({
    inline: true,
    items,
    label: "",
    type: "submenu" as const,
  }));
}

export function EditorHeader({
  menuItems,
  onTogglePreviewMode,
  previewMode,
  title,
}: {
  menuItems: DropdownItemData[];
  onTogglePreviewMode: () => void;
  previewMode: boolean;
  title: string;
}) {
  const router = useRouter();
  const theme = useUiTheme();
  const isAndroid = os() === "android";
  const usesNativeHeaderRightItems = isIos() && (!isIos16Plus() || isIos26Plus());
  const usesCustomBackButton = (isIos16Plus() && !isIos26Plus()) || isAndroid;
  const usesCustomHeaderActions = (isIos() && isIos16Plus() && !isIos26Plus()) || isAndroid;
  const usesCustomHeaderTitle = isIos() || isAndroid;
  const handleTogglePreviewMode = () => {
    triggerNativeHaptics(true);
    onTogglePreviewMode();
  };
  const renderCustomBackButton = ({ canGoBack }: NativeStackHeaderBackProps) =>
    canGoBack ? <EditorBackButton isAndroid={isAndroid} onPress={() => router.back()} /> : null;
  const renderCustomHeaderActions = () => (
    <View style={styles.headerActions}>
      <EditorPreviewButton
        isAndroid={isAndroid}
        onPress={handleTogglePreviewMode}
        previewMode={previewMode}
      />
      <EditorMenuButton isAndroid={isAndroid} menuItems={menuItems} />
    </View>
  );
  const headerControlsOptions: NativeStackNavigationOptions = usesNativeHeaderRightItems
    ? {
        ...(usesCustomBackButton
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackVisible: false,
              headerLeft: renderCustomBackButton,
            }
          : {}),
        unstable_headerRightItems: (() => [
          {
            accessibilityLabel: previewMode ? "切换到编辑模式" : "切换到预览模式",
            icon: { type: "sfSymbol" as const, name: previewMode ? "pencil" : "eye" },
            label: "",
            onPress: handleTogglePreviewMode,
            // iOS 26: 保留系统玻璃背景，但不与相邻菜单合并。
            sharesBackground: isIos26Plus() ? false : undefined,
            tintColor: theme.primary,
            type: "button" as const,
          },
          {
            accessibilityLabel: "更多操作",
            icon: { type: "sfSymbol" as const, name: "ellipsis" },
            label: "",
            menu: { items: toIosHeaderMenuItems(menuItems) },
            onOpen: () => triggerNativeHaptics(true),
            sharesBackground: isIos26Plus() ? false : undefined,
            tintColor: theme.primary,
            type: "menu" as const,
          },
        ]) as unknown as NonNullable<NativeStackNavigationOptions["unstable_headerRightItems"]>,
      }
    : usesCustomHeaderActions
      ? {
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerLeft: renderCustomBackButton,
          headerRight: renderCustomHeaderActions,
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
        contentStyle: {
          backgroundColor: theme.background,
        },
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
    // 为 Dropdown 的额外 trigger 容器预留裁剪缓冲，同时保持 headerSurface 的垂直视觉对齐。
    marginVertical: 2,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  headerPreviewButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginRight: 4,
    width: 40,
  },
  headerPreviewButtonAndroid: {
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

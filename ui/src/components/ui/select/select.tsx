// Expo UI SwiftUI Picker（iOS 专用，实验性）
import {
  Button as SwiftUIButton,
  Host as SwiftUIHost,
  Picker as SwiftUIPicker,
  Text as SwiftUIText,
} from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Picker as RNPPicker } from "@react-native-picker/picker";
import {
  AdaptContext,
  AdaptPortalContents,
  useAdaptContext,
  useAdaptIsActive,
} from "@tamagui/adapt";
import { Theme, isWeb as isTamaguiWeb, useTheme, useThemeName } from "@tamagui/core";
import { Dismissable } from "@tamagui/dismissable";
import { FocusScope } from "@tamagui/focus-scope";
import { Check, ChevronDown, ChevronUp } from "@tamagui/lucide-icons-2";
import { Portal } from "@tamagui/portal";
import { RemoveScroll } from "@tamagui/remove-scroll";
import {
  ForwardSelectContext,
  SelectZIndexContext,
  useSelectContext,
  useSelectItemParentContext,
} from "@tamagui/select";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import React from "react";
import {
  Animated,
  Modal,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { FontSizeTokens, Select as TamaguiSelect, Text, YStack, getFontSize } from "tamagui";
import { LinearGradient } from "tamagui/linear-gradient";

import { isWeb, os } from "@/api/common/platform";
import { Menu } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { dismissTrueSheet, presentTrueSheet } from "@/components/ui/true_sheet";
import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";
import {
  resolveAriaLabel,
  triggerNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

import {
  type ResolvedSelectItemData,
  type ResolvedSelectItemGroupData,
  resolveSelectItemGroups,
} from "./select_grouping";
import type {
  NativePickerMode,
  SelectAdaptContentsProps,
  SelectAdaptProps,
  SelectContentProps,
  SelectFocusScopeProps,
  SelectGroupProps,
  SelectIconProps,
  SelectIndicatorProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectProps,
  SelectScrollDownButtonProps,
  SelectScrollUpButtonProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectViewportProps,
} from "./types";

const DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT = 6;
const DEFAULT_TOUCH_SHEET_ITEM_HEIGHT = 48;
const DEFAULT_TOUCH_SHEET_CHROME_HEIGHT = 88;
const DEFAULT_TOUCH_SHEET_LABEL_HEIGHT = 32;
const DEFAULT_TOUCH_SHEET_GROUP_GAP = 12;
const DEFAULT_TOUCH_ITEM_CONTENT_STYLE = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
} as const;
const DEFAULT_SELECT_ITEM_CONTENT_STYLE = {
  ...DEFAULT_TOUCH_ITEM_CONTENT_STYLE,
  paddingHorizontal: 16,
} as const;
const TOUCH_SELECT_ITEM_CONTENT_STYLE = {
  ...DEFAULT_TOUCH_ITEM_CONTENT_STYLE,
  minHeight: DEFAULT_TOUCH_SHEET_ITEM_HEIGHT,
  paddingHorizontal: 24,
} as const;
const TOUCH_SHEET_SCROLL_CONTENT_STYLE = {
  paddingBottom: 28,
  paddingHorizontal: 16,
  paddingTop: 10,
  width: "100%",
} as const;
const TOUCH_SHEET_GROUP_RADIUS = 24;
const TOUCH_SHEET_FRAME_BACKGROUND = "$backgroundPress" as const;
const TOUCH_SHEET_GROUP_BACKGROUND = "$background" as const;
const TOUCH_SHEET_SEPARATOR_COLOR = "$borderColor" as const;

/** iOS 滚轮选择器工具栏的垂直内边距（控制标题栏高度） */
const WHEEL_PICKER_TOOLBAR_VERTICAL_PADDING = 18;

const DEFAULT_ANDROID_NATIVE_PICKER_MODE: NativePickerMode = "dropdown";
const DEFAULT_IOS_NATIVE_PICKER_MODE: NativePickerMode = "dropdown";

/** 用于为每个 wheel sheet 实例生成唯一名称的计数器 */
let wheelSheetCounter = 0;

const SelectAdaptHiddenContext = React.createContext(true);

type TouchSheetConfig = {
  frameMaxHeight?: SelectProps["touchSheetMaxHeight"];
  shouldEnableScroll: boolean;
  snapPoints: [number];
  snapPointsMode: "constant" | "percent";
};

function parsePercentSnapPoint(value: SelectProps["touchSheetMaxHeight"]) {
  if (typeof value !== "string") {
    return null;
  }

  const matched = value.trim().match(/^(\d+(?:\.\d+)?)%$/);

  if (matched == null) {
    return null;
  }

  const parsedValue = Number.parseFloat(matched[1]);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.max(0, Math.min(100, parsedValue));
}

function resolveTouchSheetConfig({
  groupCount,
  groupLabelCount,
  itemCount,
  touchSheetMaxHeight,
}: {
  groupCount: number;
  groupLabelCount: number;
  itemCount: number;
  touchSheetMaxHeight: SelectProps["touchSheetMaxHeight"];
}): TouchSheetConfig {
  const totalItemCount = Math.max(itemCount, 1);
  const visibleItemCount = Math.min(totalItemCount, DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT);
  const visibleGroupGapCount = Math.max(Math.min(groupCount, visibleItemCount) - 1, 0);
  const estimatedVisibleHeight =
    visibleItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    DEFAULT_TOUCH_SHEET_CHROME_HEIGHT +
    visibleGroupGapCount * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT;
  const estimatedContentHeight =
    totalItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    DEFAULT_TOUCH_SHEET_CHROME_HEIGHT +
    Math.max(groupCount - 1, 0) * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT;

  if (typeof touchSheetMaxHeight === "number" && Number.isFinite(touchSheetMaxHeight)) {
    const snapPoint = Math.max(1, Math.round(touchSheetMaxHeight));

    return {
      shouldEnableScroll: estimatedContentHeight > snapPoint,
      snapPoints: [snapPoint],
      snapPointsMode: "constant",
    };
  }

  const percentSnapPoint = parsePercentSnapPoint(touchSheetMaxHeight);

  if (percentSnapPoint != null) {
    return {
      shouldEnableScroll: estimatedContentHeight > estimatedVisibleHeight,
      snapPoints: [percentSnapPoint],
      snapPointsMode: "percent",
    };
  }

  return {
    ...(touchSheetMaxHeight != null ? { frameMaxHeight: touchSheetMaxHeight } : null),
    shouldEnableScroll: estimatedContentHeight > estimatedVisibleHeight,
    snapPoints: [estimatedVisibleHeight],
    snapPointsMode: "constant",
  };
}

function SelectAdaptContents(props: SelectAdaptContentsProps) {
  return <TamaguiSelect.Adapt.Contents {...props} />;
}

function SelectAdaptRoot(props: SelectAdaptProps) {
  return <TamaguiSelect.Adapt {...props} />;
}

const SelectAdapt = Object.assign(SelectAdaptRoot, {
  Contents: SelectAdaptContents,
});

function SelectSheetController(props: { children: React.ReactNode }) {
  const context = useSelectContext();
  const itemParentContext = useSelectItemParentContext();
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const [isAdaptFullyHidden, setIsAdaptFullyHidden] = React.useState(!context.open);

  React.useEffect(() => {
    if (context.open) {
      setIsAdaptFullyHidden(false);
    }
  }, [context.open]);

  const handleSheetAnimationComplete = React.useCallback(({ open }: { open: boolean }) => {
    if (!open) {
      setIsAdaptFullyHidden(true);
    }
  }, []);

  return (
    <Sheet.Controller
      hidden={!isAdapted}
      onAnimationComplete={handleSheetAnimationComplete}
      onOpenChange={(nextOpen: boolean) => {
        if (isAdapted) {
          itemParentContext.setOpen(nextOpen);
        }
      }}
      open={context.open}
    >
      <SelectAdaptHiddenContext.Provider value={isAdaptFullyHidden}>
        {props.children}
      </SelectAdaptHiddenContext.Provider>
    </Sheet.Controller>
  );
}

function SelectContent(props: SelectContentProps) {
  const { children, scope, ...focusScopeProps } = props;
  const context = useSelectContext(scope);
  const itemParentContext = useSelectItemParentContext(scope);
  const zIndex = React.useContext(SelectZIndexContext);
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const isAdaptFullyHidden = React.useContext(SelectAdaptHiddenContext);

  if (itemParentContext.shouldRenderWebNative) {
    return <>{children}</>;
  }

  if (isAdapted) {
    if (!context.open && isAdaptFullyHidden) {
      return null;
    }

    return <>{children}</>;
  }

  return (
    <Portal open={context.open} stackZIndex={100_000} zIndex={zIndex}>
      <RemoveScroll enabled={context.open && !context.disablePreventBodyScroll}>
        <Dismissable
          asChild
          forceUnmount={!context.open}
          onDismiss={() => itemParentContext.setOpen(false)}
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <FocusScope
            {...focusScopeProps}
            enabled={!!context.open}
            trapped
            onMountAutoFocus={(event) => {
              event.preventDefault();
            }}
            onUnmountAutoFocus={(event) => {
              event.preventDefault();
              const trigger = context.floatingContext?.refs?.reference?.current;

              if (trigger instanceof HTMLElement) {
                trigger.focus();
              }
            }}
          >
            {isTamaguiWeb ? <div style={{ display: "contents" }}>{children}</div> : children}
          </FocusScope>
        </Dismissable>
      </RemoveScroll>
    </Portal>
  );
}

function SelectGroup(props: SelectGroupProps) {
  return <TamaguiSelect.Group {...props} />;
}

function SelectIcon(props: SelectIconProps) {
  return <TamaguiSelect.Icon {...props} />;
}

function SelectItem(props: SelectItemProps) {
  return <TamaguiSelect.Item {...props} />;
}

function SelectItemIndicator(props: SelectItemIndicatorProps) {
  return (
    <TamaguiSelect.ItemIndicator {...props}>
      {props.children ?? <Check size={16} />}
    </TamaguiSelect.ItemIndicator>
  );
}

function SelectItemText(props: SelectItemTextProps) {
  return <TamaguiSelect.ItemText {...props} />;
}

function SelectLabel(props: SelectLabelProps) {
  return <TamaguiSelect.Label {...props} />;
}

function SelectScrollDownButton(props: SelectScrollDownButtonProps) {
  return (
    <TamaguiSelect.ScrollDownButton {...props}>
      {props.children ?? <ChevronDown size={16} />}
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={["transparent", "$background"]}
        rounded="$4"
      />
    </TamaguiSelect.ScrollDownButton>
  );
}

function SelectScrollUpButton(props: SelectScrollUpButtonProps) {
  return (
    <TamaguiSelect.ScrollUpButton {...props}>
      {props.children ?? <ChevronUp size={16} />}
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={["$background", "transparent"]}
        rounded="$4"
      />
    </TamaguiSelect.ScrollUpButton>
  );
}

function SelectTrigger(props: SelectTriggerProps) {
  const { nativeHaptics, onPress, ...triggerProps } = props;
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const handlePress: NonNullable<SelectTriggerProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(resolvedNativeHaptics);
  };

  return <TamaguiSelect.Trigger {...triggerProps} onPress={handlePress} />;
}

function SelectValue(props: SelectValueProps) {
  return <TamaguiSelect.Value {...props} />;
}

function SelectViewport(props: SelectViewportProps) {
  const {
    children,
    scope,
    unstyled,
    borderColor,
    borderWidth,
    outlineWidth,
    disableScroll,
    style,
    ...viewportProps
  } = props;
  const shouldUseHeadlessWebViewport = isWeb() && unstyled == null;
  const context = useSelectContext(scope);
  const itemParentContext = useSelectItemParentContext(scope);
  const adaptContext = useAdaptContext();
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const isAdaptFullyHidden = React.useContext(SelectAdaptHiddenContext);
  const themeName = useThemeName();
  const viewportStyle = isWeb()
    ? [
        {
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          userSelect: "none",
        } as React.CSSProperties,
        style,
      ]
    : style;

  if (!isWeb() && isAdapted) {
    const contents = (
      <Theme name={themeName}>
        <ForwardSelectContext context={context} itemContext={itemParentContext}>
          <AdaptContext.Provider {...adaptContext}>{children}</AdaptContext.Provider>
        </ForwardSelectContext>
      </Theme>
    );

    if (!context.open && isAdaptFullyHidden) {
      if (context.lazyMount && context.renderValue) {
        return null;
      }

      return <YStack display="none">{contents}</YStack>;
    }

    return <AdaptPortalContents scope={context.adaptScope}>{contents}</AdaptPortalContents>;
  }

  return (
    <TamaguiSelect.Viewport
      {...viewportProps}
      background={viewportProps.background ?? "$background"}
      borderColor={borderColor ?? "$borderColor"}
      borderWidth={borderWidth ?? 1}
      disableScroll={disableScroll}
      outlineWidth={outlineWidth ?? 0}
      size={viewportProps.size ?? "$2"}
      overflowX={isWeb() ? "hidden" : undefined}
      overflowY={disableScroll ? undefined : "auto"}
      style={viewportStyle}
      unstyled={shouldUseHeadlessWebViewport ? true : unstyled}
    >
      {children}
    </TamaguiSelect.Viewport>
  );
}

function SelectIndicator(props: SelectIndicatorProps) {
  return <TamaguiSelect.Indicator {...props} />;
}

function SelectFocusScope(props: SelectFocusScopeProps) {
  return <TamaguiSelect.FocusScope {...props} />;
}

const selectAdaptWhen = isWeb() ? "md" : true;

/** Android 原生 Picker Dialog：隐藏渲染 Picker 并通过 focus() 触发系统 dialog */
function NativePickerDialog({
  visible,
  value,
  items,
  mode,
  onValueChange,
  onBlur,
}: {
  visible: boolean;
  value: string | undefined;
  items: ResolvedSelectItemData[];
  mode: "dialog" | "dropdown";
  onValueChange: (itemValue: string) => void;
  onBlur: () => void;
}) {
  const pickerRef = useRef<any>(null);
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => pickerRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const selectedBg = theme.backgroundPress?.val ?? "rgba(0,0,0,0.06)";
  const selectedColor = theme.color?.val ?? "#1A73E8";

  return (
    <View style={{ position: "absolute", opacity: 0, pointerEvents: "none", minWidth: 320 }}>
      <RNPPicker
        ref={pickerRef}
        selectedValue={value ?? ""}
        onValueChange={onValueChange}
        onBlur={onBlur}
        mode={mode}
      >
        {items.map((item) => {
          const isSelected = item.value === value;

          return (
            <RNPPicker.Item
              key={item.value}
              label={item.label}
              value={item.value}
              enabled={!(item.disabled ?? item.isDisabled)}
              style={{
                backgroundColor: isSelected ? selectedBg : "transparent",
                color: isSelected ? selectedColor : undefined,
              }}
            />
          );
        })}
      </RNPPicker>
    </View>
  );
}

/** 基于 Menu 组件的原生选择器（当前未使用，menu 模式已移除） */
function NativeMenuSelect({
  items,
  value,
  placeholder,
  disabled,
  isDisabled,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  disabled?: boolean;
  isDisabled?: boolean;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const handleSelect = useCallback(
    (itemValue: string) => {
      onValueChange?.(itemValue || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );

  return (
    <Menu
      trigger={
        <YStack
          disabled={disabled ?? isDisabled}
          background="$background"
          borderColor="$borderColor"
          borderWidth={1}
          opacity={(disabled ?? isDisabled) ? 0.5 : 1}
          style={{
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: 180,
          }}
        >
          <Text fontSize="$4" color="$color">
            {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
          </Text>
          <ChevronDown size={16} color="$color10" />
        </YStack>
      }
    >
      {items.map((item) => (
        <Menu.Item
          key={item.value}
          onSelect={() => handleSelect(item.value)}
          disabled={item.disabled ?? item.isDisabled}
        >
          <Menu.ItemTitle style={{ flex: 1 }}>{item.label}</Menu.ItemTitle>
          {item.value === value && <Check size={16} color="$color10" />}
        </Menu.Item>
      ))}
    </Menu>
  );
}

/**
 * iOS 原生 Picker：RN Modal + RNPPicker + 分离动画。
 * Modal animationType="none" 避免整体从底部滑入（遮罩不应滑动），
 * 面板用 Animated.Value 单独控制 translateY 滑入/滑出动画。
 *
 * 当前未使用（dropdown 路径已切换为 NativePickerSwiftUI）。
 * 保留此实现，后续可切换回 RNP 版本。
 */
function NativePickerIos({
  items,
  value,
  placeholder,
  disabled,
  isDisabled,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  disabled?: boolean;
  isDisabled?: boolean;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pendingValue, setPendingValue] = React.useState<string>(
    (value as string) ?? items[0]?.value ?? "",
  );
  const colorScheme = useColorScheme();
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;

  // 面板滑动动画：0 = 隐藏(屏幕底部之下)，1 = 显示
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    setOpen(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const animateOut = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  }, [slideAnim]);

  const handleOpen = useCallback(() => {
    if (disabled ?? isDisabled) return;
    triggerNativeHaptics(resolvedNativeHaptics);
    setPendingValue((value as string) ?? items[0]?.value ?? "");
    animateIn();
  }, [disabled, isDisabled, resolvedNativeHaptics, value, items, animateIn]);

  const handleDone = useCallback(() => {
    onValueChange?.(pendingValue || null);
    triggerNativeHaptics(resolvedNativeHaptics);
    animateOut();
  }, [onValueChange, resolvedNativeHaptics, pendingValue, animateOut]);

  const handleCancel = useCallback(() => {
    animateOut();
  }, [animateOut]);

  const isDark = colorScheme === "dark";

  // 用屏幕高度作为 translateY 偏移量确保面板完全在屏幕下方
  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0], // 从下方 400pt 滑入
  });

  return (
    <>
      <YStack
        disabled={disabled ?? isDisabled}
        onPress={handleOpen}
        background="$background"
        borderColor="$borderColor"
        borderWidth={1}
        opacity={(disabled ?? isDisabled) ? 0.5 : 1}
        style={{
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minWidth: 180,
        }}
      >
        <Text fontSize="$4" color="$color">
          {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
        </Text>
        <ChevronDown size={16} color="$color10" />
      </YStack>

      {open && (
        <Modal
          visible
          transparent
          animationType="none"
          supportedOrientations={["portrait", "landscape"]}
          onRequestClose={handleCancel}
        >
          {/* 遮罩层 — 直接渲染，不参与滑动动画 */}
          <Pressable
            onPress={handleCancel}
            style={{
              ...StyleSheet.absoluteFill,
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          />
          {/* 底部面板 — 独立 translateY 动画从底部滑入 */}
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: panelTranslateY }],
              backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
              paddingBottom: 34,
            }}
          >
            {/* 工具栏 — 原生 SwiftUI 按钮 */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: WHEEL_PICKER_TOOLBAR_VERTICAL_PADDING,
                borderBottomWidth: 0.5,
                borderBottomColor: isDark ? "#38383A" : "#C6C6C8",
                backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
              }}
            >
              <SwiftUIHost matchContents style={{ marginTop: 4 }}>
                <SwiftUIButton label="取消" onPress={handleCancel} />
              </SwiftUIHost>
              <SwiftUIHost matchContents style={{ marginTop: 4 }}>
                <SwiftUIButton label="完成" onPress={handleDone} />
              </SwiftUIHost>
            </View>
            <RNPPicker selectedValue={pendingValue} onValueChange={setPendingValue}>
              {items.map((item) => (
                <RNPPicker.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  enabled={!(item.disabled ?? item.isDisabled)}
                />
              ))}
            </RNPPicker>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

/** wheel + TrueSheet + 自定义 trigger */
function NativePickerWheelSheet({
  items,
  value,
  placeholder,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const [pendingValue, setPendingValue] = React.useState<string>(
    (value as string) ?? items[0]?.value ?? "",
  );
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const [sheetName] = React.useState(() => `select-wheel-${++wheelSheetCounter}`);

  const handleOpen = useCallback(() => {
    triggerNativeHaptics(resolvedNativeHaptics);
    setPendingValue((value as string) ?? items[0]?.value ?? "");
    presentTrueSheet(sheetName);
  }, [resolvedNativeHaptics, value, items, sheetName]);

  const handleDone = useCallback(() => {
    onValueChange?.(pendingValue || null);
    triggerNativeHaptics(resolvedNativeHaptics);
    dismissTrueSheet(sheetName);
  }, [onValueChange, resolvedNativeHaptics, pendingValue, sheetName]);

  const handleCancel = useCallback(() => {
    triggerNativeHaptics(resolvedNativeHaptics);
    dismissTrueSheet(sheetName);
  }, [resolvedNativeHaptics, sheetName]);

  const title = typeof placeholder === "string" ? placeholder : "选择";

  return (
    <>
      <YStack
        onPress={handleOpen}
        background="$background"
        borderColor="$borderColor"
        borderWidth={1}
        pressStyle={{
          // @ts-expect-error backgroundColor 是存在的
          backgroundColor: "$backgroundPress",
        }}
        style={{
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minWidth: 180,
        }}
      >
        <Text fontSize="$4" color="$color">
          {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
        </Text>
        <ChevronDown size={16} color="$color10" />
      </YStack>

      <TrueSheetPanel
        chrome="plain"
        grabber={false}
        name={sheetName}
        onRequestClose={handleCancel}
        sheetProps={{ detents: [0.3], dismissible: true }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text fontSize="$4" style={{ color: PlatformColor("systemBlue") }}>
              关闭
            </Text>
          </Pressable>
          <Text fontSize="$4" fontWeight="500" color="$color">
            {title}
          </Text>
          <Pressable onPress={handleDone} hitSlop={8}>
            <Text fontSize="$4" fontWeight="500" style={{ color: PlatformColor("systemBlue") }}>
              完成
            </Text>
          </Pressable>
        </View>
        <RNPPicker selectedValue={pendingValue} onValueChange={setPendingValue}>
          {items.map((item) => (
            <RNPPicker.Item
              key={item.value}
              label={item.label}
              value={item.value}
              enabled={!(item.disabled ?? item.isDisabled)}
            />
          ))}
        </RNPPicker>
      </TrueSheetPanel>
    </>
  );
}

/** wheel + TrueSheet + 原生 trigger（SwiftUI menu 按钮） */
function NativePickerWheelNativeTriggerSheet({
  items,
  value,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const [isPressed, setIsPressed] = React.useState(false);
  const [pendingValue, setPendingValue] = React.useState<string>(
    (value as string) ?? items[0]?.value ?? "",
  );
  const [sheetName] = React.useState(() => `select-wheel-${++wheelSheetCounter}`);

  const handleOpen = useCallback(() => {
    triggerNativeHaptics(resolvedNativeHaptics);
    setPendingValue((value as string) ?? items[0]?.value ?? "");
    presentTrueSheet(sheetName);
  }, [resolvedNativeHaptics, value, items, sheetName]);

  const handleDone = useCallback(() => {
    onValueChange?.(pendingValue || null);
    triggerNativeHaptics(resolvedNativeHaptics);
    dismissTrueSheet(sheetName);
  }, [onValueChange, resolvedNativeHaptics, pendingValue, sheetName]);

  const handleCancel = useCallback(() => {
    triggerNativeHaptics(resolvedNativeHaptics);
    dismissTrueSheet(sheetName);
  }, [resolvedNativeHaptics, sheetName]);

  return (
    <>
      <View>
        <View pointerEvents="none" style={{ opacity: isPressed ? 0.6 : 1 }}>
          <View style={{ minWidth: 180 }}>
            <SwiftUIHost matchContents>
              <SwiftUIPicker
                modifiers={[pickerStyle("menu")]}
                selection={(value as string) ?? items[0]?.value ?? ""}
              >
                {items.map((item) => (
                  <SwiftUIText key={item.value} modifiers={[tag(item.value)]}>
                    {item.label}
                  </SwiftUIText>
                ))}
              </SwiftUIPicker>
            </SwiftUIHost>
          </View>
        </View>
        <Pressable
          onPress={handleOpen}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <TrueSheetPanel
        chrome="plain"
        grabber={false}
        name={sheetName}
        onRequestClose={handleCancel}
        sheetProps={{ detents: [260], dismissible: true }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text fontSize="$4" style={{ color: PlatformColor("systemBlue") }}>
              关闭
            </Text>
          </Pressable>
          <Text fontSize="$4" fontWeight="500" color="$color">
            选择
          </Text>
          <Pressable onPress={handleDone} hitSlop={8}>
            <Text fontSize="$4" fontWeight="500" style={{ color: PlatformColor("systemBlue") }}>
              完成
            </Text>
          </Pressable>
        </View>
        <RNPPicker selectedValue={pendingValue} onValueChange={setPendingValue}>
          {items.map((item) => (
            <RNPPicker.Item
              key={item.value}
              label={item.label}
              value={item.value}
              enabled={!(item.disabled ?? item.isDisabled)}
            />
          ))}
        </RNPPicker>
      </TrueSheetPanel>
    </>
  );
}

/**
 * iOS SwiftUI Picker：dropdown → menu 按钮，wheel / 自定义 trigger → Modal。
 */
function NativePickerSwiftUI({
  items,
  value,
  placeholder,
  mode,
  nativeTrigger,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  mode: "dropdown" | "wheel";
  nativeTrigger?: boolean;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  // dropdown + 原生 trigger：SwiftUI Picker menu 按钮
  if (mode === "dropdown" && nativeTrigger) {
    return (
      <NativePickerMenuButton
        items={items}
        value={value}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
      />
    );
  }

  // dropdown + 自定义 trigger：Menu 组件
  if (mode === "dropdown" && !nativeTrigger) {
    return (
      <NativePickerDropdownCustom
        items={items}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
      />
    );
  }

  if (mode === "wheel" && nativeTrigger) {
    return (
      <NativePickerWheelNativeTrigger
        items={items}
        value={value}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
      />
    );
  }

  // wheel + Sheet + 原生 trigger（默认）
  if (mode === "wheel" && nativeTrigger) {
    return (
      <NativePickerWheelNativeTriggerSheet
        items={items}
        value={value}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
      />
    );
  }

  // wheel + Sheet + 自定义 trigger（默认）
  return (
    <NativePickerWheelSheet
      items={items}
      value={value}
      placeholder={placeholder}
      onValueChange={onValueChange}
      resolvedNativeHaptics={resolvedNativeHaptics}
    />
  );
}

/** dropdown + 原生 trigger：SwiftUI Picker menu 按钮 */
function NativePickerMenuButton({
  items,
  value,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const handleSelectionChange = useCallback(
    (selection: string) => {
      onValueChange?.(selection || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );

  return (
    <Pressable onPress={() => triggerNativeHaptics(resolvedNativeHaptics)}>
      <View style={{ minWidth: 180 }}>
        <SwiftUIHost matchContents>
          <SwiftUIPicker
            modifiers={[pickerStyle("menu")]}
            selection={(value as string) ?? items[0]?.value ?? ""}
            onSelectionChange={handleSelectionChange}
          >
            {items.map((item) => (
              <SwiftUIText key={item.value} modifiers={[tag(item.value)]}>
                {item.label}
              </SwiftUIText>
            ))}
          </SwiftUIPicker>
        </SwiftUIHost>
      </View>
    </Pressable>
  );
}

/** wheel + 原生 trigger：SwiftUI menu 按钮做视觉 trigger + Pressable 拦截触摸 + Modal 滚轮 */
function NativePickerWheelNativeTrigger({
  items,
  value,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const [isPressed, setIsPressed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [pendingValue, setPendingValue] = React.useState<string>(
    (value as string) ?? items[0]?.value ?? "",
  );
  const colorScheme = useColorScheme();

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    setOpen(true);
    Animated.timing(slideAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const animateOut = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setOpen(false),
    );
  }, [slideAnim]);

  const handleOpen = useCallback(() => {
    triggerNativeHaptics(resolvedNativeHaptics);
    setPendingValue((value as string) ?? items[0]?.value ?? "");
    animateIn();
  }, [resolvedNativeHaptics, value, items, animateIn]);

  const handleDone = useCallback(() => {
    onValueChange?.(pendingValue || null);
    triggerNativeHaptics(resolvedNativeHaptics);
    animateOut();
  }, [onValueChange, resolvedNativeHaptics, pendingValue, animateOut]);

  const handleCancel = useCallback(() => animateOut(), [animateOut]);

  const isDark = colorScheme === "dark";
  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <>
      {/* 原生 SwiftUI 按钮做纯视觉展示，pointerEvents="none" 禁触控，外层 View 模拟按下透明效果 */}
      <View>
        <View pointerEvents="none" style={{ opacity: isPressed ? 0.6 : 1 }}>
          <View style={{ minWidth: 180 }}>
            <SwiftUIHost matchContents>
              <SwiftUIPicker
                modifiers={[pickerStyle("menu")]}
                selection={(value as string) ?? items[0]?.value ?? ""}
              >
                {items.map((item) => (
                  <SwiftUIText key={item.value} modifiers={[tag(item.value)]}>
                    {item.label}
                  </SwiftUIText>
                ))}
              </SwiftUIPicker>
            </SwiftUIHost>
          </View>
        </View>
        {/* 透明 Pressable 覆盖在原生按钮上方拦截触摸 */}
        <Pressable
          onPress={handleOpen}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {open && (
        <Modal visible transparent animationType="none" onRequestClose={handleCancel}>
          <Pressable
            onPress={handleCancel}
            style={{ ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.3)" }}
          />
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: panelTranslateY }],
              backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
              paddingBottom: 34,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: WHEEL_PICKER_TOOLBAR_VERTICAL_PADDING,
                borderBottomWidth: 0.5,
                borderBottomColor: isDark ? "#38383A" : "#C6C6C8",
                backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
              }}
            >
              <SwiftUIHost matchContents style={{ marginTop: 16 }}>
                <SwiftUIButton label="取消" onPress={handleCancel} />
              </SwiftUIHost>
              <SwiftUIHost matchContents style={{ marginTop: 16 }}>
                <SwiftUIButton label="完成" onPress={handleDone} />
              </SwiftUIHost>
            </View>
            <RNPPicker selectedValue={pendingValue} onValueChange={setPendingValue}>
              {items.map((item) => (
                <RNPPicker.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  enabled={!(item.disabled ?? item.isDisabled)}
                />
              ))}
            </RNPPicker>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

/**
 * dropdown + 自定义 trigger：复用 Menu 组件实现。
 * Menu 的 MenuTrigger 包装自定义 YStack，点击时显示选项列表。
 */
function NativePickerDropdownCustom({
  items,
  value,
  placeholder,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const handleSelect = useCallback(
    (itemValue: string) => {
      onValueChange?.(itemValue || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );

  return (
    <Menu
      trigger={
        <YStack
          onPress={() => triggerNativeHaptics(resolvedNativeHaptics)}
          background="$background"
          borderColor="$borderColor"
          borderWidth={1}
          pressStyle={{
            // @ts-expect-error backgroundColor 是存在的
            backgroundColor: "$backgroundPress",
          }}
          style={{
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: 180,
          }}
        >
          <Text fontSize="$4" color="$color">
            {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
          </Text>
          <ChevronDown size={16} color="$color10" />
        </YStack>
      }
    >
      {items.map((item) => (
        <Menu.CheckboxItem
          key={item.value}
          checked={item.value === value}
          onSelect={() => handleSelect(item.value)}
          disabled={item.disabled ?? item.isDisabled}
        >
          <Menu.ItemTitle>{item.label}</Menu.ItemTitle>
          <Menu.ItemIndicator>
            <Check size={16} color="$color10" />
          </Menu.ItemIndicator>
        </Menu.CheckboxItem>
      ))}
    </Menu>
  );
}

const SelectRoot = forwardRef<any, SelectProps>(
  (
    {
      "aria-label": ariaLabel,
      children,
      contentProps,
      disabled,
      isDisabled,
      itemIndicatorProps,
      itemGroups,
      itemProps,
      itemTextProps,
      items,
      itemLabel,
      itemLabelProps,
      nativeHaptics,
      nativePickerMode,
      onOpenChange,
      onValueChange,
      options,
      placeholder,
      touchSheetMaxHeight,
      triggerProps,
      viewportProps,
      native,
      nativeTrigger,
      ...props
    },
    ref,
  ) => {
    void ref;

    const platform = os();
    const [nativePickerVisible, setNativePickerVisible] = React.useState(false);
    const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
    const shouldUseTouchSheetLayout = !isWeb();
    const resolvedPickerMode =
      nativePickerMode ??
      (platform === "android"
        ? DEFAULT_ANDROID_NATIVE_PICKER_MODE
        : DEFAULT_IOS_NATIVE_PICKER_MODE);
    const resolvedItemGroups = resolveSelectItemGroups({ itemGroups, items, options });
    const resolvedItems = resolvedItemGroups.flatMap((group) => group.items);
    const getGroupLabel = (group: ResolvedSelectItemGroupData, groupIndex: number) =>
      group.label ?? (groupIndex === 0 ? itemLabel : null);
    const groupLabelCount = resolvedItemGroups.filter(
      (group, groupIndex) => getGroupLabel(group, groupIndex) != null,
    ).length;
    const touchSheetConfig = resolveTouchSheetConfig({
      groupCount: resolvedItemGroups.length,
      groupLabelCount,
      itemCount: resolvedItems.length,
      touchSheetMaxHeight,
    });
    const shouldRenderNativeOptionText = isWeb() && !!native;
    const renderedItemGroups: ResolvedSelectItemGroupData[] = shouldRenderNativeOptionText
      ? [{ key: "native", items: resolvedItems }]
      : resolvedItemGroups;
    const getItemLabelByValue = (value: string | null | undefined) =>
      resolvedItems.find((item) => item.value === value)?.label ?? null;
    const selectedItem = getItemLabelByValue(props.value ?? null);
    const renderItem = (item: ResolvedSelectItemData) => (
      <SelectItem
        {...(shouldUseTouchSheetLayout
          ? {
              background: "transparent",
              borderRadius: 0,
              height: DEFAULT_TOUCH_SHEET_ITEM_HEIGHT,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }
          : null)}
        {...itemProps}
        aria-label={resolveAriaLabel(item["aria-label"] ?? itemProps?.["aria-label"], item.label)}
        disabled={item.disabled ?? item.isDisabled ?? itemProps?.disabled}
        index={item.index}
        key={item.value}
        textValue={item.label}
        value={item.value}
      >
        {shouldRenderNativeOptionText ? (
          item.label
        ) : (
          <YStack
            background={shouldUseTouchSheetLayout ? TOUCH_SHEET_GROUP_BACKGROUND : undefined}
            borderBottomColor={shouldUseTouchSheetLayout ? TOUCH_SHEET_SEPARATOR_COLOR : undefined}
            borderBottomWidth={shouldUseTouchSheetLayout && !item.isLastInGroup ? 1 : 0}
            style={
              shouldUseTouchSheetLayout
                ? TOUCH_SELECT_ITEM_CONTENT_STYLE
                : DEFAULT_SELECT_ITEM_CONTENT_STYLE
            }
          >
            {item.startContent}
            <SelectItemText
              fontSize={shouldUseTouchSheetLayout ? "$4" : undefined}
              lineHeight={shouldUseTouchSheetLayout ? 22 : undefined}
              {...itemTextProps}
            >
              {item.label}
            </SelectItemText>
            {item.description}
            {item.endContent}
            <SelectItemIndicator marginLeft="auto" {...itemIndicatorProps}>
              {itemIndicatorProps?.children ??
                (shouldUseTouchSheetLayout ? <Check size={22} /> : undefined)}
            </SelectItemIndicator>
          </YStack>
        )}
      </SelectItem>
    );
    const renderGroup = (group: ResolvedSelectItemGroupData, groupIndex: number) => {
      const label = getGroupLabel(group, groupIndex);
      const content = (
        <SelectGroup>
          {label && (
            <Select.Label
              fontWeight="700"
              style={
                shouldUseTouchSheetLayout
                  ? { paddingHorizontal: 24, paddingVertical: 10 }
                  : undefined
              }
              {...itemLabelProps}
            >
              {label}
            </Select.Label>
          )}
          {group.items.map(renderItem)}
        </SelectGroup>
      );

      if (!shouldUseTouchSheetLayout) {
        return <React.Fragment key={group.key}>{content}</React.Fragment>;
      }

      return (
        <YStack
          key={group.key}
          background={TOUCH_SHEET_GROUP_BACKGROUND}
          style={{
            borderRadius: TOUCH_SHEET_GROUP_RADIUS,
            marginBottom:
              groupIndex === resolvedItemGroups.length - 1 ? 0 : DEFAULT_TOUCH_SHEET_GROUP_GAP,
            overflow: "hidden",
            width: "100%",
          }}
        >
          {content}
        </YStack>
      );
    };

    /**
     * NativePickerDialog（隐藏渲染 + focus() 触发系统弹窗）仅在 Android 上可用。
     * wheel 为 iOS 专用模式，Android 上不走此路径。
     */
    const shouldRenderNativePicker =
      !isWeb() && !!native && resolvedPickerMode !== "wheel" && platform === "android";
    /**
     * iOS native（dropdown/dialog/wheel）→ NativePickerSwiftUI（Expo UI SwiftUI Picker）。
     * RNP 版本代码保留在 NativePickerIos 中，后续可切换。
     */
    const shouldRenderNativeIosPicker = !isWeb() && !!native && platform === "ios";

    const handleTamaguiOpenChange = (nextOpen: boolean) => {
      if (shouldRenderNativePicker && nextOpen) {
        setNativePickerVisible((prev) => {
          if (prev) {
            requestAnimationFrame(() => setNativePickerVisible(true));
            return false;
          }
          return true;
        });
        return;
      }

      onOpenChange?.(nextOpen);
      if (nextOpen) triggerNativeHaptics(resolvedNativeHaptics);
    };

    const handleTamaguiValueChange = (nextValue: string) => {
      onValueChange?.(nextValue ?? null);
      triggerNativeHaptics(resolvedNativeHaptics);
    };

    return (
      <>
        {shouldRenderNativeIosPicker ? (
          <NativePickerSwiftUI
            items={resolvedItems}
            value={props.value}
            placeholder={placeholder}
            mode={resolvedPickerMode as "dropdown" | "wheel"}
            nativeTrigger={nativeTrigger ?? false}
            onValueChange={onValueChange}
            resolvedNativeHaptics={resolvedNativeHaptics}
          />
        ) : (
          <TamaguiSelect
            disablePreventBodyScroll
            {...props}
            open={shouldRenderNativePicker ? false : undefined}
            native={native}
            onOpenChange={handleTamaguiOpenChange}
            onValueChange={handleTamaguiValueChange}
            renderValue={props.renderValue ?? ((nextValue) => getItemLabelByValue(nextValue))}
          >
            {children ??
              (resolvedItems.length === 0 ? null : (
                <>
                  <SelectTrigger
                    disabled={disabled ?? isDisabled ?? triggerProps?.disabled}
                    borderRadius="$4"
                    backgroundColor="$background"
                    iconAfter={ChevronDown}
                    {...triggerProps}
                    aria-label={resolveAriaLabel(
                      triggerProps?.["aria-label"] ?? ariaLabel,
                      selectedItem ?? placeholder,
                    )}
                    nativeHaptics={triggerProps?.nativeHaptics ?? resolvedNativeHaptics}
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>

                  <SelectSheetController>
                    <SelectAdapt when={selectAdaptWhen} platform="touch">
                      <Sheet
                        native={!!native}
                        modal
                        dismissOnSnapToBottom
                        snapPoints={touchSheetConfig.snapPoints}
                        snapPointsMode={touchSheetConfig.snapPointsMode}
                        transitionConfig={{ type: "timing", duration: 150 }}
                      >
                        <Sheet.Frame
                          {...(touchSheetConfig.frameMaxHeight != null
                            ? { maxHeight: touchSheetConfig.frameMaxHeight }
                            : null)}
                          {...(shouldUseTouchSheetLayout
                            ? {
                                backgroundColor: TOUCH_SHEET_FRAME_BACKGROUND,
                                borderTopLeftRadius: 36,
                                borderTopRightRadius: 36,
                                paddingTop: 12,
                              }
                            : null)}
                        >
                          {shouldUseTouchSheetLayout && (
                            <Sheet.Handle
                              alignSelf="center"
                              backgroundColor="$color8"
                              borderRadius={999}
                              height={5}
                              marginBottom={6}
                              opacity={0.65}
                              onPress={() => {}}
                              width={92}
                            />
                          )}
                          {shouldUseTouchSheetLayout ? (
                            touchSheetConfig.shouldEnableScroll ? (
                              <Sheet.ScrollView
                                sheetDragDisabledScrollIndicatorWidth={44}
                                showsVerticalScrollIndicator
                              >
                                <YStack
                                  background={TOUCH_SHEET_FRAME_BACKGROUND}
                                  style={TOUCH_SHEET_SCROLL_CONTENT_STYLE}
                                >
                                  <SelectAdapt.Contents />
                                </YStack>
                              </Sheet.ScrollView>
                            ) : (
                              <YStack
                                background={TOUCH_SHEET_FRAME_BACKGROUND}
                                style={TOUCH_SHEET_SCROLL_CONTENT_STYLE}
                              >
                                <SelectAdapt.Contents />
                              </YStack>
                            )
                          ) : (
                            <Sheet.ScrollView>
                              <SelectAdapt.Contents />
                            </Sheet.ScrollView>
                          )}
                        </Sheet.Frame>
                        <Sheet.Overlay
                          bg="$shadowColor"
                          transition="lazy"
                          enterStyle={{ opacity: 0 }}
                          exitStyle={{ opacity: 0 }}
                        />
                      </Sheet>
                    </SelectAdapt>

                    <SelectContent {...contentProps}>
                      {!shouldUseTouchSheetLayout && (
                        <SelectScrollUpButton
                          items="center"
                          justify="center"
                          position="relative"
                          width="100%"
                          height="$3"
                        />
                      )}
                      <SelectViewport
                        bg="$background"
                        rounded="$4"
                        borderWidth={1}
                        borderColor="$borderColor"
                        {...viewportProps}
                      >
                        {renderedItemGroups.map(renderGroup)}
                        {isWeb() && native && (
                          <YStack
                            position="absolute"
                            r={0}
                            t={16}
                            items="center"
                            justify="center"
                            width={"$4"}
                            pointerEvents="none"
                          >
                            <ChevronDown
                              size={getFontSize((props.size as FontSizeTokens) ?? "$true")}
                            />
                          </YStack>
                        )}
                      </SelectViewport>
                      {!shouldUseTouchSheetLayout && (
                        <SelectScrollDownButton
                          items="center"
                          justify="center"
                          position="relative"
                          width="100%"
                          height="$3"
                        />
                      )}
                    </SelectContent>
                  </SelectSheetController>
                </>
              ))}
          </TamaguiSelect>
        )}

        {shouldRenderNativePicker && (
          <NativePickerDialog
            visible={nativePickerVisible}
            value={(props.value as string | undefined) ?? ""}
            items={resolvedItems}
            mode={resolvedPickerMode as "dialog" | "dropdown"}
            onValueChange={(itemValue: string) => {
              onValueChange?.(itemValue || null);
              triggerNativeHaptics(resolvedNativeHaptics);
              setNativePickerVisible(false);
            }}
            onBlur={() => setNativePickerVisible(false)}
          />
        )}
      </>
    );
  },
);

SelectRoot.displayName = "Select";

export const Select = Object.assign(SelectRoot, {
  Adapt: SelectAdapt,
  Content: SelectContent,
  Group: SelectGroup,
  Icon: SelectIcon,
  Item: SelectItem,
  ItemIndicator: SelectItemIndicator,
  ItemText: SelectItemText,
  Label: SelectLabel,
  ScrollDownButton: SelectScrollDownButton,
  ScrollUpButton: SelectScrollUpButton,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Viewport: SelectViewport,
  Indicator: SelectIndicator,
  FocusScope: SelectFocusScope,
});

// 保留 NativePickerIos 的引用，避免未使用警告（dropdown 当前走 NativePickerSwiftUI）
void NativePickerIos;
// 保留 NativeMenuSelect 的引用，避免未使用警告（menu 模式已移除）
void NativeMenuSelect;

/* eslint-disable no-spaced-func */
// Select iOS 原生 Picker 组件
import { Picker as RNPPicker } from "@react-native-picker/picker";
import { useTheme } from "@tamagui/core";
import { Check, ChevronDown } from "@tamagui/lucide-icons-2";
import { useCallback } from "react";
import React from "react";
import {
  Platform,
  type PressableProps,
  type StyleProp,
  View,
  type ViewStyle,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack, getFontSize } from "tamagui";

import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { dismissTrueSheet, presentTrueSheet } from "@/components/ui/true_sheet";
import {
  TrueSheetInnerStack,
  TrueSheetStackHost,
  trueSheetInnerStackScreenOptions,
} from "@/components/ui/true_sheet/stack";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";
import type { ResolvedColorScheme } from "@/components/ui/utils/navigation/status_bar";

import type { TextProps } from "../text";
import { NativeTriggerPressable } from "./native_trigger";
import type { ResolvedSelectItemData } from "./select_grouping";
import type { SelectNativeTriggerIcon } from "./types";

/** 用于为每个 wheel sheet 实例生成唯一名称的计数器 */
let wheelSheetCounter = 0;

/** wheel sheet 默认 detent 配置（iOS 16+ 有效，iOS < 16 降级为 mediumDetent） */
const WHEEL_SHEET_DETENT_DEFAULT = 0.3;

/** wheel 模式共享的 TrueSheet 弹出层 */
function WheelTrueSheet({
  items,
  title,
  sheetName,
  pendingValue,
  setPendingValue,
  onCancel,
  onDone,
}: {
  items: ResolvedSelectItemData[];
  title: string;
  sheetName: string;
  pendingValue: string;
  setPendingValue: (v: string) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const iOSVersion = parseInt(Platform.Version as string, 10);

  /** iOS < 16 不支持自定义 fraction detent，sheet 实际为 mediumDetent（~50%），
   *  内容区域偏大，需更多顶部偏移让 Picker 垂直居中 */
  const topPadding = iOSVersion < 16 ? Math.max(insets.top, 90) : Math.max(insets.top, 28);

  return (
    <TrueSheetStackHost
      name={sheetName}
      initialRouteName="picker"
      onRequestClose={onCancel}
      sheetProps={{ detents: [WHEEL_SHEET_DETENT_DEFAULT], dismissible: true }}
      screenOptions={{
        ...trueSheetInnerStackScreenOptions(
          (colorScheme ?? "light") as ResolvedColorScheme,
          undefined,
          theme.accentColor.val,
          theme.color.val,
        ),
        title,
        headerLeft: () => <Button native onPress={onCancel} title="关闭" />,
        headerRight: () => <Button native onPress={onDone} title="完成" />,
      }}
    >
      <TrueSheetInnerStack.Screen name="picker">
        {() => (
          <View style={{ paddingTop: topPadding, flex: 1 }}>
            {/**
             * 连续点击 Wheel 10 次左右会导致闪退, 未解决的问题
             * 使用 ui/patches/@react-native-picker+picker@2.11.4.patch 修复
             * https://github.com/react-native-picker/picker/issues/519
             * https://github.com/react-native-picker/picker/issues/627
             */}
            <RNPPicker
              selectedValue={pendingValue}
              onValueChange={setPendingValue}
              style={{ flex: 1 }}
            >
              {items.map((item) => (
                <RNPPicker.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  enabled={!(item.disabled ?? item.isDisabled)}
                />
              ))}
            </RNPPicker>
          </View>
        )}
      </TrueSheetInnerStack.Screen>
    </TrueSheetStackHost>
  );
}

/** wheel + 自定义 trigger */
const NativePickerWheelSheet = React.forwardRef<
  NativePickerSwiftUIHandle,
  {
    items: ResolvedSelectItemData[];
    value: string | null | undefined;
    placeholder?: React.ReactNode;
    onValueChange?: (value: string | null) => void;
    resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  }
>(({ items, value, placeholder, onValueChange, resolvedNativeHaptics }, ref) => {
  const [pendingValue, setPendingValue] = React.useState<string>(
    (value as string) ?? items[0]?.value ?? "",
  );
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const [sheetName] = React.useState(() => `select-wheel-${++wheelSheetCounter}`);

  const openSheet = useCallback(
    (shouldTriggerHaptics: boolean) => {
      if (shouldTriggerHaptics) {
        triggerNativeHaptics(resolvedNativeHaptics);
      }

      setPendingValue((value as string) ?? items[0]?.value ?? "");
      presentTrueSheet(sheetName);
    },
    [resolvedNativeHaptics, value, items, sheetName],
  );

  React.useImperativeHandle(ref, () => ({
    open() {
      openSheet(true);
    },
  }));

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
        onPress={() => openSheet(true)}
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
        <Text fontSize={getFontSize("$4")} color="$color">
          {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
        </Text>
        <ChevronDown size={16} color="$color10" />
      </YStack>

      <WheelTrueSheet
        items={items}
        title={title}
        sheetName={sheetName}
        pendingValue={pendingValue}
        setPendingValue={setPendingValue}
        onCancel={handleCancel}
        onDone={handleDone}
      />
    </>
  );
});

/**
 * iOS/Android 共用的自绘原生 trigger。
 * 不再依赖 SwiftUI Picker 自带按钮，避免嵌套 sheet 等系统着色差异。
 */
type NativePickerSwiftUIMenuTriggerProps = {
  containerStyle?: StyleProp<ViewStyle>;
  content?: React.ReactNode;
  icon?: SelectNativeTriggerIcon;
  items: ResolvedSelectItemData[];
  labelProps?: TextProps;
  onBeforePress?: () => void;
  value: string | null | undefined;
  onPress?: PressableProps["onPress"];
};

const NativePickerSwiftUIMenuTrigger = React.forwardRef<View, NativePickerSwiftUIMenuTriggerProps>(
  (
    { containerStyle, content, icon, items, labelProps, onBeforePress, value, onPress },
    forwardedRef,
  ) => {
    const selectedValue = (value as string) ?? items[0]?.value ?? "";
    const selectedLabel = items.find((item) => item.value === selectedValue)?.label ?? "";

    return (
      <NativeTriggerPressable
        ref={forwardedRef}
        content={content}
        containerStyle={containerStyle}
        icon={icon}
        label={selectedLabel}
        labelProps={labelProps}
        onPress={(event) => {
          onBeforePress?.();
          onPress?.(event);
        }}
      />
    );
  },
);

/** wheel + 原生 trigger（SwiftUI menu 按钮） */
const NativePickerWheelNativeTriggerSheet = React.forwardRef<
  NativePickerSwiftUIHandle,
  {
    nativeTriggerContainerStyle?: StyleProp<ViewStyle>;
    nativeTriggerContent?: React.ReactNode;
    nativeTriggerIcon?: SelectNativeTriggerIcon;
    nativeTriggerLabelProps?: TextProps;
    items: ResolvedSelectItemData[];
    placeholder?: React.ReactNode;
    value: string | null | undefined;
    onValueChange?: (value: string | null) => void;
    resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  }
>(
  (
    {
      nativeTriggerContainerStyle,
      nativeTriggerContent,
      nativeTriggerIcon,
      nativeTriggerLabelProps,
      items,
      placeholder,
      value,
      onValueChange,
      resolvedNativeHaptics,
    },
    ref,
  ) => {
    const [pendingValue, setPendingValue] = React.useState<string>(
      (value as string) ?? items[0]?.value ?? "",
    );
    const [sheetName] = React.useState(() => `select-wheel-${++wheelSheetCounter}`);

    const openSheet = useCallback(
      (shouldTriggerHaptics: boolean) => {
        if (shouldTriggerHaptics) {
          triggerNativeHaptics(resolvedNativeHaptics);
        }

        setPendingValue((value as string) ?? items[0]?.value ?? "");
        presentTrueSheet(sheetName);
      },
      [resolvedNativeHaptics, value, items, sheetName],
    );

    React.useImperativeHandle(ref, () => ({
      open() {
        openSheet(true);
      },
    }));

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
        <NativePickerSwiftUIMenuTrigger
          containerStyle={nativeTriggerContainerStyle}
          content={nativeTriggerContent}
          icon={nativeTriggerIcon}
          items={items}
          labelProps={nativeTriggerLabelProps}
          value={value}
          onPress={() => openSheet(true)}
        />

        <WheelTrueSheet
          items={items}
          title={title}
          sheetName={sheetName}
          pendingValue={pendingValue}
          setPendingValue={setPendingValue}
          onCancel={handleCancel}
          onDone={handleDone}
        />
      </>
    );
  },
);

/**
 * dropdown + 自定义 trigger：复用 Menu 组件实现。
 * Menu 的 MenuTrigger 包装自定义 YStack，点击时显示选项列表。
 */
function NativePickerDropdownCustom({
  items,
  value,
  placeholder,
  onValueChange,
  onOpenChange,
  open,
  resolvedNativeHaptics,
  nativeTrigger,
  nativeTriggerContainerStyle,
  nativeTriggerContent,
  nativeTriggerIcon,
  nativeTriggerLabelProps,
  __menuRef,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  onValueChange?: (value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  nativeTrigger: boolean | undefined;
  nativeTriggerContainerStyle?: StyleProp<ViewStyle>;
  nativeTriggerContent?: React.ReactNode;
  nativeTriggerIcon?: SelectNativeTriggerIcon;
  nativeTriggerLabelProps?: TextProps;
  __menuRef?: React.MutableRefObject<{ presentMenu: () => void } | null>;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;

  const resolvedOpen = open ?? internalOpen;
  const handleSelect = useCallback(
    (itemValue: string) => {
      onValueChange?.(itemValue || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (open == null) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open],
  );

  const trigger = nativeTrigger ? (
    <NativePickerSwiftUIMenuTrigger
      containerStyle={nativeTriggerContainerStyle}
      content={nativeTriggerContent}
      icon={nativeTriggerIcon}
      items={items}
      labelProps={nativeTriggerLabelProps}
      onBeforePress={() => triggerNativeHaptics(resolvedNativeHaptics)}
      value={value}
    />
  ) : (
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
      <Text fontSize={getFontSize("$4")} color="$color">
        {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
      </Text>
      <ChevronDown size={16} color="$color10" />
    </YStack>
  );

  return (
    <Menu
      onOpenChange={handleOpenChange}
      open={resolvedOpen}
      trigger={trigger}
      triggerProps={nativeTrigger ? { asChild: true } : undefined}
      // @ts-expect-error patch
      __menuRef={__menuRef}
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

/**
 * iOS NativePicker 的 ref handle。
 * 通过 open() 方法在外部控制选项列表的打开。
 */
export type NativePickerSwiftUIHandle = {
  open: () => void;
};

/**
 * iOS NativePicker：switch 入口。
 * dropdown → NativePickerDropdownCustom（含可选的 nativeTrigger SwiftUI menu）
 * wheel + nativeTrigger → NativePickerWheelNativeTriggerSheet
 * wheel + 自定义 trigger → NativePickerWheelSheet
 */
export const NativePickerSwiftUI = React.forwardRef<
  NativePickerSwiftUIHandle,
  {
    items: ResolvedSelectItemData[];
    value: string | null | undefined;
    placeholder?: React.ReactNode;
    mode: "dropdown" | "wheel";
    nativeTrigger?: boolean;
    nativeTriggerContainerStyle?: StyleProp<ViewStyle>;
    nativeTriggerContent?: React.ReactNode;
    nativeTriggerIcon?: SelectNativeTriggerIcon;
    nativeTriggerLabelProps?: TextProps;
    onValueChange?: (value: string | null) => void;
    onOpenChange?: (open: boolean) => void;
    resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  }
>((props, ref) => {
  const menuControlRef = React.useRef<{ presentMenu: () => void } | null>(null);
  const wheelNativeRef = React.useRef<NativePickerSwiftUIHandle>(null);
  const wheelCustomRef = React.useRef<NativePickerSwiftUIHandle>(null);

  React.useImperativeHandle(ref, () => ({
    open() {
      if (props.mode === "dropdown") {
        menuControlRef.current?.presentMenu();
      } else if (props.mode === "wheel" && props.nativeTrigger) {
        wheelNativeRef.current?.open();
      } else {
        wheelCustomRef.current?.open();
      }
    },
  }));

  const {
    items,
    value,
    placeholder,
    mode,
    nativeTrigger,
    nativeTriggerContainerStyle,
    nativeTriggerContent,
    nativeTriggerIcon,
    nativeTriggerLabelProps,
    onValueChange,
    onOpenChange,
    resolvedNativeHaptics,
  } = props;

  // dropdown 组件
  if (mode === "dropdown") {
    return (
      <NativePickerDropdownCustom
        items={items}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        onOpenChange={(next) => {
          onOpenChange?.(next);
        }}
        resolvedNativeHaptics={resolvedNativeHaptics}
        nativeTrigger={nativeTrigger}
        nativeTriggerContainerStyle={nativeTriggerContainerStyle}
        nativeTriggerContent={nativeTriggerContent}
        nativeTriggerIcon={nativeTriggerIcon}
        nativeTriggerLabelProps={nativeTriggerLabelProps}
        __menuRef={menuControlRef}
      />
    );
  }

  // wheel + Sheet + 原生 trigger
  if (mode === "wheel" && nativeTrigger) {
    return (
      <NativePickerWheelNativeTriggerSheet
        ref={wheelNativeRef}
        items={items}
        nativeTriggerContainerStyle={nativeTriggerContainerStyle}
        nativeTriggerContent={nativeTriggerContent}
        nativeTriggerIcon={nativeTriggerIcon}
        nativeTriggerLabelProps={nativeTriggerLabelProps}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
      />
    );
  }

  // wheel + Sheet + 自定义 trigger
  return (
    <NativePickerWheelSheet
      ref={wheelCustomRef}
      items={items}
      value={value}
      placeholder={placeholder}
      onValueChange={onValueChange}
      resolvedNativeHaptics={resolvedNativeHaptics}
    />
  );
});

/** iOS 端永不渲染（shouldRenderNativePicker 恒为 false） */
export const NativePickerDialog: React.FC<any> = () => null;

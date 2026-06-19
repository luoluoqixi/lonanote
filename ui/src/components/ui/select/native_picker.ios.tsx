// Select iOS 原生 Picker 组件
import { Picker as RNPPicker } from "@react-native-picker/picker";
import { useTheme } from "@tamagui/core";
import { Check, ChevronDown } from "@tamagui/lucide-icons-2";
import { useCallback } from "react";
import React from "react";
import { Platform, View, useColorScheme } from "react-native";
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

import { NativeTriggerPressable } from "./native_trigger";
import type { ResolvedSelectItemData } from "./select_grouping";

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
}

/**
 * iOS/Android 共用的自绘原生 trigger。
 * 不再依赖 SwiftUI Picker 自带按钮，避免嵌套 sheet 等系统着色差异。
 */
function NativePickerSwiftUIMenuTrigger({
  items,
  value,
  onPress,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  onPress?: () => void;
}) {
  const selectedValue = (value as string) ?? items[0]?.value ?? "";
  const selectedLabel = items.find((item) => item.value === selectedValue)?.label ?? "";

  return <NativeTriggerPressable label={selectedLabel} onPress={onPress} />;
}

/** wheel + 原生 trigger（SwiftUI menu 按钮） */
function NativePickerWheelNativeTriggerSheet({
  items,
  placeholder,
  value,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  placeholder?: React.ReactNode;
  value: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
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

  const title = typeof placeholder === "string" ? placeholder : "选择";

  return (
    <>
      <NativePickerSwiftUIMenuTrigger items={items} value={value} onPress={handleOpen} />

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
  nativeTrigger,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  nativeTrigger: boolean | undefined;
}) {
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const handleSelect = useCallback(
    (itemValue: string) => {
      onValueChange?.(itemValue || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );

  const trigger = nativeTrigger ? (
    <NativePickerSwiftUIMenuTrigger
      items={items}
      value={value}
      onPress={() => triggerNativeHaptics(resolvedNativeHaptics)}
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
    <Menu trigger={trigger}>
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
 * iOS NativePicker：switch 入口。
 * dropdown → NativePickerDropdownCustom（含可选的 nativeTrigger SwiftUI menu）
 * wheel + nativeTrigger → NativePickerWheelNativeTriggerSheet
 * wheel + 自定义 trigger → NativePickerWheelSheet
 */
export function NativePickerSwiftUI({
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
  // dropdown 组件
  if (mode === "dropdown") {
    return (
      <NativePickerDropdownCustom
        items={items}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        resolvedNativeHaptics={resolvedNativeHaptics}
        nativeTrigger={nativeTrigger}
      />
    );
  }

  // wheel + Sheet + 原生 trigger
  if (mode === "wheel" && nativeTrigger) {
    return (
      <NativePickerWheelNativeTriggerSheet
        items={items}
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
      items={items}
      value={value}
      placeholder={placeholder}
      onValueChange={onValueChange}
      resolvedNativeHaptics={resolvedNativeHaptics}
    />
  );
}

/** iOS 端永不渲染（shouldRenderNativePicker 恒为 false） */
export const NativePickerDialog: React.FC<any> = () => null;

// Select iOS 原生 Picker 组件
// @expo/ui/swift-ui 仅在此文件导入，iOS bundle 才包含

import {
  Host as SwiftUIHost,
  Picker as SwiftUIPicker,
  Text as SwiftUIText,
} from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Picker as RNPPicker } from "@react-native-picker/picker";
import { useTheme } from "@tamagui/core";
import { Check, ChevronDown } from "@tamagui/lucide-icons-2";
import { useCallback } from "react";
import React from "react";
import { Pressable, Button as RNButton, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack, getFontSize } from "tamagui";

import { Menu } from "@/components/ui/menu";
import { dismissTrueSheet, presentTrueSheet } from "@/components/ui/true_sheet";
import {
  TrueSheetInnerStack,
  TrueSheetStackHost,
  trueSheetInnerStackScreenOptions,
} from "@/components/ui/true_sheet/stack";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";
import type { ResolvedColorScheme } from "@/components/ui/utils/navigation/status_bar";

import type { ResolvedSelectItemData } from "./select_grouping";

/** 用于为每个 wheel sheet 实例生成唯一名称的计数器 */
let wheelSheetCounter = 0;

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

  return (
    <TrueSheetStackHost
      name={sheetName}
      initialRouteName="picker"
      onRequestClose={onCancel}
      sheetProps={{ detents: [0.35], dismissible: true }}
      screenOptions={{
        ...trueSheetInnerStackScreenOptions(
          (colorScheme ?? "light") as ResolvedColorScheme,
          theme.background.val,
          theme.color.val,
        ),
        title,
        headerLeft: () => <RNButton title="关闭" onPress={onCancel} />,
        headerRight: () => <RNButton title="完成" onPress={onDone} />,
      }}
    >
      <TrueSheetInnerStack.Screen name="picker">
        {() => (
          <View style={{ paddingTop: insets.top, flex: 1 }}>
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
 * SwiftUI Picker menu trigger。
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
  const [isPressed, setIsPressed] = React.useState(false);
  const selectedValue = (value as string) ?? items[0]?.value ?? "";

  return (
    <View>
      <View pointerEvents="none" style={{ opacity: isPressed ? 0.6 : 1 }}>
        <View style={{ minWidth: 180, minHeight: 44, justifyContent: "center" }}>
          <SwiftUIHost>
            <SwiftUIPicker modifiers={[pickerStyle("menu")]} selection={selectedValue}>
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
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
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

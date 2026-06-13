// Select Android 原生 Picker 组件

import { Picker as RNPPicker } from "@react-native-picker/picker";
import { useTheme } from "@tamagui/core";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";

import type { ResolvedSelectItemData } from "./select_grouping";

/** Android 原生 Picker Dialog：隐藏渲染 Picker 并通过 focus() 触发系统 dialog */
export function NativePickerDialog({
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

/** Android 端永不渲染（shouldRenderNativeIosPicker 恒为 false） */
export const NativePickerSwiftUI: React.FC<any> = () => null;

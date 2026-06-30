/* eslint-disable no-spaced-func */
// Select Android 原生 Picker 组件
import { Picker as RNPPicker } from "@react-native-picker/picker";
import { useTheme } from "@tamagui/core";
import React, { useEffect, useImperativeHandle, useRef } from "react";
import { type LayoutChangeEvent, type StyleProp, View, type ViewStyle } from "react-native";

import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { TextProps } from "../text";
import { NativeTriggerPressable } from "./native_trigger";
import type { ResolvedSelectItemData } from "./select_grouping";
import type { SelectNativeDropdownAlign, SelectNativeTriggerIcon } from "./types";

const DEFAULT_ANDROID_DROPDOWN_MIN_WIDTH = 320;

/** Android 原生 Picker Dialog：隐藏渲染 Picker 并通过 focus() 触发系统 dialog */
export function NativePickerDialog({
  anchorAlign,
  anchorWidth,
  anchorEdgeOffset = 0,
  anchorStrategy = "native-offset",
  visible,
  value,
  items,
  mode,
  onValueChange,
  onBlur,
}: {
  anchorAlign?: SelectNativeDropdownAlign;
  anchorWidth?: number;
  anchorEdgeOffset?: number;
  anchorStrategy?: "layout" | "native-offset";
  visible: boolean;
  value: string | undefined;
  items: ResolvedSelectItemData[];
  mode: "dialog" | "dropdown";
  onValueChange: (itemValue: string) => void;
  onBlur: () => void;
}) {
  const pickerRef = useRef<any>(null);
  const theme = useTheme();
  const [anchorContainerWidth, setAnchorContainerWidth] = React.useState(0);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => pickerRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const selectedBg = theme.backgroundPress?.val ?? "rgba(0,0,0,0.06)";
  const selectedColor = theme.color?.val ?? "#1A73E8";
  const resolvedAnchorWidth = anchorWidth ?? DEFAULT_ANDROID_DROPDOWN_MIN_WIDTH;
  const resolvedContainerWidth = anchorContainerWidth || resolvedAnchorWidth;
  const shouldUseNativeOffset = anchorStrategy === "native-offset";
  const dropdownHorizontalOffset = shouldUseNativeOffset
    ? anchorAlign === "center"
      ? (resolvedContainerWidth - resolvedAnchorWidth) / 2 + anchorEdgeOffset
      : anchorAlign === "end"
        ? resolvedContainerWidth - resolvedAnchorWidth - anchorEdgeOffset
        : anchorEdgeOffset
    : 0;
  const anchorStyle = shouldUseNativeOffset
    ? { left: 0, width: resolvedAnchorWidth }
    : anchorAlign === "center"
      ? {
          left: (resolvedContainerWidth - resolvedAnchorWidth) / 2 + anchorEdgeOffset,
          width: resolvedAnchorWidth,
        }
      : anchorAlign === "end"
        ? { right: anchorEdgeOffset, width: resolvedAnchorWidth }
        : { left: anchorEdgeOffset, width: resolvedAnchorWidth };
  const handleAnchorContainerLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setAnchorContainerWidth((prevWidth) =>
      Math.abs(prevWidth - nextWidth) < 0.5 ? prevWidth : nextWidth,
    );
  }, []);

  return (
    <View style={styles.dialogContainer} onLayout={handleAnchorContainerLayout}>
      <View style={[styles.dialogAnchor, anchorStyle]}>
        <RNPPicker
          ref={pickerRef}
          dropdownHorizontalOffset={dropdownHorizontalOffset}
          dropdownWidth={resolvedAnchorWidth}
          style={[styles.dialogPicker, { width: resolvedAnchorWidth }]}
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
    </View>
  );
}

export type NativePickerSwiftUIHandle = {
  open: () => void;
};

export const NativePickerSwiftUI = React.forwardRef<
  NativePickerSwiftUIHandle,
  {
    items: ResolvedSelectItemData[];
    value: string | null | undefined;
    placeholder?: React.ReactNode;
    mode: "dropdown" | "wheel" | "dialog";
    nativeDropdownAlign?: SelectNativeDropdownAlign;
    nativeDropdownAnchorWidth?: number;
    nativeDropdownEdgeOffset?: number;
    nativeTrigger?: boolean;
    nativeTriggerContainerStyle?: StyleProp<ViewStyle>;
    nativeTriggerContent?: React.ReactNode;
    nativeTriggerIcon?: SelectNativeTriggerIcon;
    nativeTriggerLabelProps?: TextProps;
    onValueChange?: (value: string | null) => void;
    resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
  }
>((props, ref) => {
  const {
    items,
    value,
    mode,
    nativeDropdownAlign,
    nativeDropdownAnchorWidth,
    nativeDropdownEdgeOffset,
    nativeTriggerContainerStyle,
    nativeTriggerContent,
    nativeTriggerIcon,
    nativeTriggerLabelProps,
    onValueChange,
    resolvedNativeHaptics,
  } = props;
  const [openSignal, setOpenSignal] = React.useState(0);

  useImperativeHandle(ref, () => ({
    open() {
      setOpenSignal((c) => c + 1);
    },
  }));

  const [visible, setVisible] = React.useState(false);
  const selectedLabel =
    items.find((item) => item.value === ((value as string) ?? items[0]?.value ?? ""))?.label ?? "";
  const openPicker = React.useCallback(
    (shouldTriggerHaptics: boolean) => {
      if (shouldTriggerHaptics) {
        triggerNativeHaptics(resolvedNativeHaptics);
      }

      setVisible((prev) => {
        if (prev) {
          requestAnimationFrame(() => setVisible(true));
          return false;
        }

        return true;
      });
    },
    [resolvedNativeHaptics],
  );

  useEffect(() => {
    if (openSignal == null || openSignal <= 0) {
      return;
    }

    openPicker(false);
  }, [openPicker, openSignal]);

  return (
    <View style={styles.triggerAnchor}>
      <NativeTriggerPressable
        content={nativeTriggerContent}
        containerStyle={nativeTriggerContainerStyle}
        icon={nativeTriggerIcon}
        label={selectedLabel}
        labelProps={nativeTriggerLabelProps}
        onPress={() => {
          openPicker(true);
        }}
      />
      <NativePickerDialog
        anchorAlign={nativeDropdownAlign}
        anchorWidth={nativeDropdownAnchorWidth}
        anchorEdgeOffset={nativeDropdownEdgeOffset}
        anchorStrategy="layout"
        visible={visible}
        value={(value as string | undefined) ?? ""}
        items={items}
        mode={mode === "wheel" ? "dialog" : mode}
        onValueChange={(itemValue: string) => {
          onValueChange?.(itemValue || null);
          triggerNativeHaptics(resolvedNativeHaptics);
          setVisible(false);
        }}
        onBlur={() => setVisible(false)}
      />
    </View>
  );
});

const styles = {
  dialogContainer: {
    left: 0,
    opacity: 0,
    pointerEvents: "none" as const,
    position: "absolute" as const,
    right: 0,
    top: 0,
  },
  dialogAnchor: {
    position: "absolute" as const,
    top: 0,
  },
  dialogPicker: {
    minWidth: DEFAULT_ANDROID_DROPDOWN_MIN_WIDTH,
  },
  triggerAnchor: {
    position: "relative" as const,
  },
};

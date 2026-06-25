import { ChevronDown, ChevronUp, ChevronsUpDown } from "@tamagui/lucide-icons-2";
import React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { Text, getFontSize } from "tamagui";

import type { TextProps } from "../text";
import type { SelectNativeTriggerIcon } from "./types";

type TriggerIconColor = React.ComponentProps<typeof ChevronDown>["color"];

function renderTriggerLabel(label: React.ReactNode, labelProps?: TextProps) {
  const resolvedOpacity = typeof labelProps?.opacity === "number" ? labelProps.opacity : 0.58;

  if (typeof label === "string" || typeof label === "number") {
    return (
      <Text color="$color" fontSize={getFontSize("$4")} opacity={resolvedOpacity} {...labelProps}>
        {label}
      </Text>
    );
  }

  return label;
}

function renderTriggerIcon(icon: SelectNativeTriggerIcon, color: TriggerIconColor) {
  if (icon === "none") {
    return null;
  }

  if (icon === "chevrons-up-down") {
    return <ChevronsUpDown color={color} size={14} />;
  }

  return (
    <View style={styles.chevronColumn}>
      <ChevronUp color={color} size={10} />
      <ChevronDown color={color} size={10} />
    </View>
  );
}

export function NativeTriggerFace({
  content,
  containerStyle,
  icon = "stacked",
  labelProps,
  label,
  opacity = 1,
}: {
  content?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  icon?: SelectNativeTriggerIcon;
  labelProps?: TextProps;
  label: React.ReactNode;
  opacity?: number;
}) {
  if (content != null) {
    return (
      <View pointerEvents="none" style={[styles.customContent, { opacity }]}>
        {content}
      </View>
    );
  }

  const iconColor: TriggerIconColor =
    typeof labelProps?.color === "string" ? (labelProps.color as TriggerIconColor) : "$color";
  const iconOpacity = typeof labelProps?.opacity === "number" ? labelProps.opacity : 0.58;

  return (
    <View pointerEvents="none" style={{ opacity }}>
      <View style={[styles.defaultTrigger, containerStyle]}>
        {renderTriggerLabel(label, labelProps)}
        <View style={{ opacity: iconOpacity }}>{renderTriggerIcon(icon, iconColor)}</View>
      </View>
    </View>
  );
}

export const NativeTriggerPressable = React.forwardRef<
  View,
  {
    content?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
    icon?: SelectNativeTriggerIcon;
    labelProps?: TextProps;
    label: React.ReactNode;
    onPress?: PressableProps["onPress"];
  } & Omit<ViewProps, "children" | "onPress">
>(
  (
    { content, containerStyle, icon = "stacked", labelProps, label, onPress, ...viewProps },
    forwardedRef,
  ) => {
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <View
        ref={forwardedRef}
        style={content != null ? styles.customTrigger : undefined}
        {...viewProps}
      >
        <NativeTriggerFace
          content={content}
          containerStyle={containerStyle}
          icon={icon}
          label={label}
          labelProps={labelProps}
          opacity={isPressed ? 0.6 : 1}
        />
        <Pressable
          onPress={onPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  chevronColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  customContent: {
    alignSelf: "stretch",
    width: "100%",
  },
  customTrigger: {
    alignSelf: "stretch",
    width: "100%",
  },
  defaultTrigger: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 180,
  },
});

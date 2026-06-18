import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons-2";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, getFontSize } from "tamagui";

function renderTriggerLabel(label: React.ReactNode) {
  if (typeof label === "string" || typeof label === "number") {
    return (
      <Text color="$color10" fontSize={getFontSize("$4")}>
        {label}
      </Text>
    );
  }

  return label;
}

export function NativeTriggerFace({
  label,
  opacity = 1,
}: {
  label: React.ReactNode;
  opacity?: number;
}) {
  return (
    <View pointerEvents="none" style={{ opacity }}>
      <View style={styles.container}>
        <View style={styles.row}>
          {renderTriggerLabel(label)}
          <View style={styles.chevronColumn}>
            <ChevronUp color="$color10" size={10} />
            <ChevronDown color="$color10" size={10} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function NativeTriggerPressable({
  label,
  onPress,
}: {
  label: React.ReactNode;
  onPress?: () => void;
}) {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <View>
      <NativeTriggerFace label={label} opacity={isPressed ? 0.6 : 1} />
      <Pressable
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chevronColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 180,
  },
  row: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
  },
});

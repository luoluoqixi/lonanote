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
  content,
  label,
  opacity = 1,
}: {
  content?: React.ReactNode;
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
  content,
  label,
  onPress,
}: {
  content?: React.ReactNode;
  label: React.ReactNode;
  onPress?: () => void;
}) {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <View style={content != null ? styles.customTrigger : undefined}>
      <NativeTriggerFace content={content} label={label} opacity={isPressed ? 0.6 : 1} />
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
  customContent: {
    alignSelf: "stretch",
    width: "100%",
  },
  customTrigger: {
    alignSelf: "stretch",
    width: "100%",
  },
  row: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
  },
});

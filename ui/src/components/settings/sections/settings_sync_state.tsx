import { StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";

type SettingsStatusBadgeProps = {
  children: string;
  tone: "error" | "loading";
};

function SettingsStatusBadge({ children, tone }: SettingsStatusBadgeProps) {
  return (
    <View style={[styles.badge, tone === "error" ? styles.badgeError : styles.badgeNeutral]}>
      <Text color={tone === "error" ? "$red10" : "$color10"} fontSize="$2" fontWeight="600">
        {children}
      </Text>
    </View>
  );
}

type SettingsSyncStateProps = {
  error: string | null;
  isLoading: boolean;
};

export function SettingsSyncState({ error, isLoading }: SettingsSyncStateProps) {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <View style={styles.syncState}>
      {isLoading ? <SettingsStatusBadge tone="loading">正在同步设置</SettingsStatusBadge> : null}
      {error ? <SettingsStatusBadge tone="error">{error}</SettingsStatusBadge> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeError: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  badgeNeutral: {
    backgroundColor: "rgba(128, 128, 128, 0.08)",
    borderColor: "rgba(128, 128, 128, 0.24)",
  },
  syncState: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
});

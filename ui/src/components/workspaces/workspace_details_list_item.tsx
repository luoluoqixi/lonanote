import { StyleSheet, View } from "react-native";
import { NativeListCustomItem, NativeListItem, Text } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { useLayoutMode } from "@/hooks/layout";
import { useToast } from "@/hooks/ui";

type WorkspaceDetailsListItemProps = {
  copyId: string;
  title: string;
  value: string;
  valueFontSize?: number;
  copyLabel?: string;
  tooltip?: boolean;
};

export function WorkspaceDetailsListItem({
  copyId,
  title,
  value,
  valueFontSize,
  copyLabel = "复制",
  tooltip = false,
}: WorkspaceDetailsListItemProps) {
  const { toast } = useToast();
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";

  const contextMenuProps = {
    native: desktop ? false : undefined,
    contentSize: desktop ? ("sm" as const) : undefined,
    items: [
      {
        label: copyLabel,
        onSelect: () => {
          void clipboard
            .writeText(value)
            .then(() => {
              toast.success("已复制");
            })
            .catch((error) => {
              console.error("[workspace-details] copy value failed", error);
              toast.error("复制失败");
            });
        },
        value: `copy-${copyId}`,
      },
    ],
  };

  if (desktop) {
    return (
      <NativeListCustomItem contextMenuProps={contextMenuProps} paddingVertical={10}>
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <View style={styles.value}>
            <FilePathTooltip path={tooltip ? value : null}>
              <View role="presentation" style={styles.valueContent}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-muted-foreground"
                  style={styles.valueText}
                >
                  {value}
                </Text>
              </View>
            </FilePathTooltip>
          </View>
        </View>
      </NativeListCustomItem>
    );
  }
  return (
    <NativeListItem
      contextMenuProps={contextMenuProps}
      title={title}
      value={value}
      valueFontSize={valueFontSize}
    />
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 16 },
  title: { fontSize: 13, flexShrink: 0, width: "30%" },
  value: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  valueContent: { width: "100%", minWidth: 0 },
  valueText: { width: "100%", minWidth: 0, fontSize: 13, textAlign: "right" },
});

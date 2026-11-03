import { StyleSheet, View } from "react-native";
import { NativeListItem, Text } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system";
import { useLayoutMode } from "@/hooks/layout";
import { useToast } from "@/hooks/ui";

type WorkspaceDetailsListItemProps = {
  copyId: string;
  title: string;
  value: string;
  valueFontSize?: number;
  copyLabel?: string;
};

export function WorkspaceDetailsListItem({
  copyId,
  title,
  value,
  valueFontSize,
  copyLabel = "复制",
}: WorkspaceDetailsListItemProps) {
  const { toast } = useToast();
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";

  return (
    <NativeListItem
      contextMenuProps={{
        native: desktop ? false : undefined,
        contentSize: desktop ? "sm" : undefined,
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
      }}
      title={title}
      value={desktop ? undefined : value}
      trailing={
        desktop ? (
          <View style={styles.value}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-muted-foreground"
              style={{ fontSize: valueFontSize ?? 15, textAlign: "right" }}
            >
              {value}
            </Text>
          </View>
        ) : undefined
      }
      valueFontSize={valueFontSize}
    />
  );
}

const styles = StyleSheet.create({
  value: {
    maxWidth: "65%",
    minWidth: 0,
    flexShrink: 1,
  },
});

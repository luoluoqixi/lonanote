import { NativeListItem } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system";
import { useToast } from "@/hooks/ui";

type WorkspaceDetailsListItemProps = {
  copyId: string;
  title: string;
  value: string;
  valueFontSize?: number;
};

export function WorkspaceDetailsListItem({
  copyId,
  title,
  value,
  valueFontSize,
}: WorkspaceDetailsListItemProps) {
  const { toast } = useToast();

  return (
    <NativeListItem
      contextMenuProps={{
        items: [
          {
            label: "复制",
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
      value={value}
      valueFontSize={valueFontSize}
    />
  );
}

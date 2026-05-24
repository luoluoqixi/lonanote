import type { ComponentProps, ReactNode } from "react";
import type { ToggleGroup as TamaguiToggleGroup } from "tamagui";

export interface ToggleGroupItemData {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

type ToggleGroupRootProps = ComponentProps<typeof TamaguiToggleGroup>;

export type ToggleGroupProps = ToggleGroupRootProps & {
  children?: ReactNode;
  itemProps?: Omit<ToggleGroupItemProps, "value">;
  items?: ToggleGroupItemData[];
};
export type ToggleGroupItemProps = ComponentProps<typeof TamaguiToggleGroup.Item>;

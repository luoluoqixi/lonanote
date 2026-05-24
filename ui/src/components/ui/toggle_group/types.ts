import type { ComponentProps, ReactNode } from "react";
import type { ToggleGroup as TamaguiToggleGroup } from "tamagui";

export interface ToggleGroupItemData {
  "aria-label"?: string;
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

type ToggleGroupRootProps = Omit<ComponentProps<typeof TamaguiToggleGroup>, "children" | "items">;

export type ToggleGroupProps = ToggleGroupRootProps & {
  children?: ReactNode;
  itemProps?: Omit<ToggleGroupItemProps, "value">;
  items?: ToggleGroupItemData[];
};
export type ToggleGroupItemProps = ComponentProps<typeof TamaguiToggleGroup.Item>;

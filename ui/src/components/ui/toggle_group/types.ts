import type { ComponentProps, ReactNode } from "react";
import type { ToggleGroup as TamaguiToggleGroup } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface ToggleGroupItemData {
  "aria-label"?: string;
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

type ToggleGroupBaseProps = Omit<
  ComponentProps<typeof TamaguiToggleGroup>,
  "children" | "items" | "type" | "value" | "defaultValue" | "onValueChange" | "disableDeactivation"
>;

export type ToggleGroupSingleProps = ToggleGroupBaseProps & {
  children?: ReactNode;
  defaultValue?: string;
  disableDeactivation?: boolean;
  itemProps?: Omit<ToggleGroupItemProps, "value">;
  items?: ToggleGroupItemData[];
  nativeHaptics?: NativeHapticsSetting;
  onValueChange?(value: string): void;
  type?: "single";
  value?: string;
};

export type ToggleGroupMultipleProps = ToggleGroupBaseProps & {
  children?: ReactNode;
  defaultValue?: string[];
  disableDeactivation?: never;
  itemProps?: Omit<ToggleGroupItemProps, "value">;
  items?: ToggleGroupItemData[];
  nativeHaptics?: NativeHapticsSetting;
  onValueChange?(value: string[]): void;
  type: "multiple";
  value?: string[];
};

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;
export type ToggleGroupItemProps = ComponentProps<typeof TamaguiToggleGroup.Item>;

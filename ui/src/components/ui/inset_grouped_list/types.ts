import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { SelectProps } from "../select";
import type { SwitchProps } from "../switch";
import type { NativeHapticsSetting } from "../utils";

export type InsetGroupedListItemBaseProps = {
  chevron?: boolean;
  disabled?: boolean;
  key?: string;
  leading?: ReactNode;
  nativeHaptics?: NativeHapticsSetting;
  onPress?: () => void;
  subtitle?: ReactNode;
  title?: ReactNode;
  trailing?: ReactNode;
  value?: ReactNode;
};

export type InsetGroupedListActionItemProps = InsetGroupedListItemBaseProps;

export type InsetGroupedListNavigationItemProps = InsetGroupedListItemBaseProps;

export type InsetGroupedListSwitchItemProps = InsetGroupedListItemBaseProps & {
  switchProps: Omit<SwitchProps, "label" | "native">;
};

export type InsetGroupedListSelectItemProps = InsetGroupedListItemBaseProps & {
  selectProps: Omit<SelectProps, "native" | "nativeTrigger">;
};

export type InsetGroupedListItemProps = InsetGroupedListItemBaseProps & {
  children?: ReactNode;
};

export type InsetGroupedListCustomItemData = {
  children?: ReactNode;
  disabled?: boolean;
  key?: string;
  nativeHaptics?: NativeHapticsSetting;
  onPress?: () => void;
  render?: () => ReactNode;
};

export type InsetGroupedListItemData =
  | ({ kind: "action" } & InsetGroupedListActionItemProps)
  | ({ kind: "navigation" } & InsetGroupedListNavigationItemProps)
  | ({ kind: "switch" } & InsetGroupedListSwitchItemProps)
  | ({ kind: "select" } & InsetGroupedListSelectItemProps)
  | ({ kind: "custom" } & InsetGroupedListCustomItemData);

export type InsetGroupedListSectionData = {
  footer?: ReactNode;
  items: InsetGroupedListItemData[];
  key?: string;
  title?: ReactNode;
};

export type InsetGroupedListSectionProps = {
  children?: ReactNode;
  footer?: ReactNode;
  items?: InsetGroupedListItemData[];
  title?: ReactNode;
};

export type InsetGroupedListProps = {
  children?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  sectionGap?: number;
  sections?: InsetGroupedListSectionData[];
};

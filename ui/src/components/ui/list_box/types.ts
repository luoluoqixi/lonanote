import type {
  ListBoxItemIndicatorProps as WebListBoxItemIndicatorProps,
  ListBoxItemProps as WebListBoxItemProps,
  ListBoxProps as WebListBoxRootProps,
  ListBoxSectionProps as WebListBoxSectionProps,
} from "@heroui/react";
import type { ListGroupRootProps as NativeListGroupRootProps } from "heroui-native";
import type { ReactNode } from "react";

type ListBoxPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface ListBoxItemData {
  className?: string;
  description?: ReactNode;
  endContent?: ReactNode;
  key: string;
  label: ReactNode;
  startContent?: ReactNode;
  textValue?: string;
  variant?: "danger";
}

export interface ListBoxSectionData {
  accessibilityLabel?: string;
  className?: string;
  headerClassName?: string;
  items: ListBoxItemData[];
  key: string;
  title?: ReactNode;
}

export interface ListBoxProps extends ListBoxPlatformProps<
  WebListBoxRootProps<any>,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  accessibilityLabel?: string;
  className?: string;
  descriptionClassName?: string;
  itemClassName?: string;
  itemContentClassName?: string;
  itemTextContainerClassName?: string;
  items?: ListBoxItemData[];
  labelClassName?: string;
  sectionClassName?: string;
  sectionHeaderClassName?: string;
  sections?: ListBoxSectionData[];
}

export interface ListBoxItemProps extends ListBoxPlatformProps<
  WebListBoxItemProps,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  className?: string;
  textValue?: string;
}

export interface ListBoxItemIndicatorProps extends ListBoxPlatformProps<
  WebListBoxItemIndicatorProps,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  className?: string;
}

export interface ListBoxSectionProps extends ListBoxPlatformProps<
  WebListBoxSectionProps,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  className?: string;
}

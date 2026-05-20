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

export interface ListBoxProps extends ListBoxPlatformProps<
  WebListBoxRootProps<any>,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  className?: string;
}

export interface ListBoxItemProps extends ListBoxPlatformProps<
  WebListBoxItemProps,
  NativeListGroupRootProps
> {
  children?: ReactNode;
  className?: string;
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

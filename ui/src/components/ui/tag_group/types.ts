import type {
  TagGroupListProps as WebTagGroupListProps,
  TagGroupProps as WebTagGroupProps,
} from "@heroui/react";
import type {
  TagGroupListProps as NativeTagGroupListProps,
  TagGroupProps as NativeTagGroupProps,
  TagGroupSize,
  TagGroupVariant,
} from "heroui-native";
import type { ReactNode } from "react";

type TagGroupPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface TagGroupProps extends TagGroupPlatformProps<
  WebTagGroupProps,
  NativeTagGroupProps
> {
  children?: ReactNode;
  className?: string;
  size?: TagGroupSize;
  variant?: TagGroupVariant;
}

export interface TagGroupListProps extends TagGroupPlatformProps<
  WebTagGroupListProps<any>,
  NativeTagGroupListProps
> {
  children?: ReactNode;
  className?: string;
}
